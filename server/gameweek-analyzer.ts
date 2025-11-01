import OpenAI from "openai";
import { storage } from "./storage";
import { fplApi } from "./fpl-api";
import { leagueAnalysis } from "./league-analysis";
import { competitorPredictor } from "./competitor-predictor";
import { leagueProjection } from "./league-projection";
import { aiLearningFeedback } from "./ai-learning-feedback";
import { snapshotContext, type SnapshotContext } from "./snapshot-context";
import { snapshotValidator } from "./snapshot-validator";
import { decisionLogger } from "./decision-logger";
import { AIPredictionService } from "./ai-predictions";
import type {
  FPLPlayer,
  FPLFixture,
  FPLTeam,
  GameweekPlan,
  UserTeam,
  FPLManager,
  ChipUsed,
  UserSettings,
  AutomationSettings,
} from "@shared/schema";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const aiPredictionService = new AIPredictionService();

function calculateSuspensionRisk(yellowCards: number, currentGameweek: number): {
  risk: 'critical' | 'high' | 'moderate' | 'low';
  description: string;
  yellowsToSuspension: number;
} {
  // Premier League suspension thresholds:
  // - 5 yellows (before GW19): 1-match ban
  // - 10 yellows (before GW32): 2-match ban  
  // - 15 yellows (any time): 3-match ban
  //
  // CRITICAL FIX: Check ALL thresholds in priority order (highest to lowest)
  // regardless of current gameweek to handle all edge cases correctly
  
  // Priority 1-3: 15-yellow threshold (always active, final threshold)
  if (yellowCards >= 15) {
    // Use >= for final threshold to handle 16+ yellows gracefully
    return {
      risk: 'critical',
      description: 'At 15-yellow threshold',
      yellowsToSuspension: 0
    };
  }
  
  if (yellowCards === 14) {
    return {
      risk: 'critical',
      description: 'Next yellow = 3-match ban',
      yellowsToSuspension: 1
    };
  }
  
  if (yellowCards === 13) {
    return {
      risk: 'high',
      description: '2 yellows from 3-match ban',
      yellowsToSuspension: 2
    };
  }
  
  // Priority 4-6: 10-yellow threshold (active until GW32)
  if (currentGameweek <= 32) {
    // Use === for intermediate thresholds to allow progression to next threshold
    if (yellowCards === 10) {
      return {
        risk: 'critical',
        description: 'At 10-yellow threshold',
        yellowsToSuspension: 0
      };
    }
    
    if (yellowCards === 9) {
      return {
        risk: 'critical',
        description: 'Next yellow = 2-match ban',
        yellowsToSuspension: 1
      };
    }
    
    if (yellowCards === 8) {
      return {
        risk: 'high',
        description: '2 yellows from 2-match ban',
        yellowsToSuspension: 2
      };
    }
  }
  
  // Priority 7-9: 5-yellow threshold (active until GW19)
  if (currentGameweek <= 19) {
    // Use === for intermediate thresholds to allow progression to next threshold
    if (yellowCards === 5) {
      return {
        risk: 'critical',
        description: 'At 5-yellow threshold',
        yellowsToSuspension: 0
      };
    }
    
    if (yellowCards === 4) {
      return {
        risk: 'critical',
        description: 'Next yellow = 1-match ban',
        yellowsToSuspension: 1
      };
    }
    
    if (yellowCards === 3) {
      return {
        risk: 'high',
        description: '2 yellows from 1-match ban',
        yellowsToSuspension: 2
      };
    }
  }
  
  // Priority 10-12: Moderate risk - tracking towards future thresholds
  // Player has passed previous threshold and is accumulating towards next
  
  if (yellowCards >= 11) {
    // Between 10-yellow and 15-yellow thresholds
    const yellowsTo15 = 15 - yellowCards;
    return {
      risk: 'moderate',
      description: `${yellowsTo15} yellows from 3-match ban`,
      yellowsToSuspension: yellowsTo15
    };
  }
  
  if (yellowCards >= 6 && currentGameweek <= 32) {
    // Between 5-yellow and 10-yellow thresholds
    const yellowsTo10 = 10 - yellowCards;
    return {
      risk: 'moderate',
      description: `${yellowsTo10} yellows from 2-match ban`,
      yellowsToSuspension: yellowsTo10
    };
  }
  
  if (yellowCards >= 2 && currentGameweek <= 19) {
    // Approaching 5-yellow threshold
    const yellowsTo5 = 5 - yellowCards;
    return {
      risk: 'moderate',
      description: `${yellowsTo5} yellows from 1-match ban`,
      yellowsToSuspension: yellowsTo5
    };
  }
  
  // Priority 13: Default - low risk (0-1 yellows)
  return {
    risk: 'low',
    description: 'Low suspension risk',
    yellowsToSuspension: 0
  };
}

interface SquadValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface AIGameweekResponse {
  transfers: Array<{
    player_out_id: number;
    player_in_id: number;
    expected_points_gain: number;
    expected_points_gain_timeframe: string; // e.g., "6 gameweeks"
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
    cost_impact: number;
    substitution_details?: {
      benched_player_id: number;
      benched_player_name: string;
      benched_player_position: string;
      benched_player_predicted_points: number;
      incoming_player_name: string;
      incoming_player_position: string;
      incoming_player_predicted_points: number;
      bench_reason: string;
    };
  }>;
  captain_id: number;
  vice_captain_id: number;
  chip_to_play: string | null;
  formation: string;
  predicted_points: number;
  confidence: number;
  strategic_insights: string[];
  reasoning: string;
  previous_plan_reviewed: boolean;
  recommendations_changed: boolean;
  change_reasoning: string;
}

export class GameweekAnalyzerService {
  async analyzeGameweek(userId: number, gameweek: number, targetPlayerId?: number): Promise<GameweekPlan> {
    try {
      console.log(`[GameweekAnalyzer] Starting analysis for user ${userId}, gameweek ${gameweek}${targetPlayerId ? `, target player: ${targetPlayerId}` : ''}`);

      // 1. Collect all input data
      const inputData = await this.collectInputData(userId, gameweek);

      // 1.5. Fetch previous plan for continuity awareness
      let previousPlan = null;
      try {
        previousPlan = await storage.getGameweekPlan(userId, gameweek);
        if (previousPlan) {
          console.log(`[GameweekAnalyzer] Found previous plan for GW${gameweek}, created at ${previousPlan.createdAt}`);
        } else {
          console.log(`[GameweekAnalyzer] No previous plan found for GW${gameweek}`);
        }
      } catch (error) {
        console.log(`[GameweekAnalyzer] Could not fetch previous plan:`, error instanceof Error ? error.message : 'Unknown error');
      }

      // 2-5. Generate AI recommendations with retry logic (max 3 attempts)
      const maxAttempts = 3;
      let aiResponse: AIGameweekResponse | null = null;
      let validation: SquadValidation | null = null;
      let chipValidation: SquadValidation | null = null;
      let transferCost = 0;
      let allValidationErrors: string[] = [];

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`[GameweekAnalyzer] Attempt ${attempt}/${maxAttempts} to generate valid plan`);

        try {
          // 2. Generate AI recommendations
          aiResponse = await this.generateAIRecommendations(userId, inputData, gameweek, targetPlayerId, previousPlan);

          // 3. Validate FPL rules
          validation = await this.validateFPLRules(
            inputData.currentTeam,
            aiResponse.transfers,
            inputData.allPlayers,
            inputData.budget,
            inputData.freeTransfers
          );

          // 4. Calculate transfer costs
          transferCost = this.calculateTransferCost(
            aiResponse.transfers.length,
            inputData.freeTransfers,
            inputData.maxTransferHit
          );

          // 5. Validate chip usage
          chipValidation = await this.validateChipUsage(
            userId,
            aiResponse.chip_to_play as 'wildcard' | 'freehit' | 'benchboost' | 'triplecaptain' | null,
            inputData.chipsUsed
          );

          // Check if validation passed
          const allErrors = [...validation.errors, ...chipValidation.errors];
          if (validation.isValid && chipValidation.isValid) {
            console.log(`[GameweekAnalyzer] Validation passed on attempt ${attempt}`);
            break; // Success! Exit retry loop
          } else {
            // Validation failed
            allValidationErrors = allErrors;
            console.error(`[GameweekAnalyzer] Validation failed on attempt ${attempt}:`, allErrors);
            
            if (attempt === maxAttempts) {
              // This was the last attempt - throw error
              throw new Error(
                `Failed to generate valid gameweek plan after ${maxAttempts} attempts. Validation errors: ${allErrors.join('; ')}`
              );
            } else {
              // Retry with the same inputs
              console.log(`[GameweekAnalyzer] Retrying...`);
            }
          }
        } catch (error) {
          // If this is a validation error on the last attempt, re-throw it
          if (attempt === maxAttempts || (error instanceof Error && error.message.includes('Failed to generate valid gameweek plan'))) {
            throw error;
          }
          // Otherwise log and retry
          console.error(`[GameweekAnalyzer] Error on attempt ${attempt}:`, error);
          if (attempt === maxAttempts) {
            throw error;
          }
        }
      }

      // If we got here without a valid response, something went wrong
      if (!aiResponse || !validation || !chipValidation) {
        throw new Error('Failed to generate gameweek plan - internal error');
      }

      // At this point, validation has passed
      // 6. Prepare strategic insights with validation results (only warnings, no errors)
      const strategicInsights = [
        ...aiResponse.strategic_insights,
        ...validation.warnings,
        ...chipValidation.warnings,
      ];

      if (transferCost > 0) {
        strategicInsights.push(`This plan will cost ${transferCost} points in transfer hits`);
      }

      // 6.5. Capture original team snapshot for "what-if" analysis
      let originalTeamSnapshot = undefined;
      if (inputData.userSettings?.manager_id) {
        try {
          console.log(`[GameweekAnalyzer] Capturing original team snapshot for manager ${inputData.userSettings.manager_id}, GW ${gameweek}`);
          const currentPicks = await fplApi.getManagerPicks(inputData.userSettings.manager_id, gameweek);
          
          // Find captain and vice captain
          const captainPick = currentPicks.picks.find(p => p.is_captain);
          const viceCaptainPick = currentPicks.picks.find(p => p.is_vice_captain);
          
          originalTeamSnapshot = {
            captain_id: captainPick?.element || 0,
            vice_captain_id: viceCaptainPick?.element || 0,
            players: currentPicks.picks.map(pick => ({
              player_id: pick.element,
              position: pick.position,
              is_captain: pick.is_captain,
              is_vice_captain: pick.is_vice_captain,
              multiplier: pick.multiplier,
            })),
          };
          
          console.log(`[GameweekAnalyzer] Original team snapshot captured: ${originalTeamSnapshot.players.length} players`);
        } catch (error) {
          console.error(`[GameweekAnalyzer] Failed to capture original team snapshot:`, error instanceof Error ? error.message : 'Unknown error');
          // Don't fail the entire plan creation - just log the error and continue without snapshot
        }
      } else {
        console.log(`[GameweekAnalyzer] No manager_id set, skipping original team snapshot capture`);
      }

      // 6.6. Validate snapshot consistency before persistence
      console.log(`[GameweekAnalyzer] Validating snapshot consistency...`);
      const snapshotValidation = snapshotValidator.validateGameweekPlan(
        inputData.context.snapshotId,
        {
          transfers: aiResponse.transfers?.map(t => ({ snapshotId: inputData.context.snapshotId })),
          predictions: undefined, // Predictions validated separately
          captainRecommendation: aiResponse.captain_id ? { snapshotId: inputData.context.snapshotId } : undefined,
          chipStrategy: aiResponse.chip_to_play ? { snapshotId: inputData.context.snapshotId } : undefined,
        }
      );

      if (!snapshotValidation.valid) {
        console.error('[GameweekAnalyzer] Snapshot validation failed:', snapshotValidation.errors);
        throw new Error('Snapshot validation failed: ' + snapshotValidation.errors.join(', '));
      }
      console.log(`[GameweekAnalyzer] Snapshot validation passed for ${inputData.context.snapshotId}`);

      // 6.7. SERVER-SIDE CONTINUITY VALIDATION
      // Override AI's recommendations_changed flag by actually comparing recommendations
      let actualRecommendationsChanged = aiResponse.recommendations_changed;
      let actualChangeReasoning = aiResponse.change_reasoning;

      if (previousPlan) {
        console.log(`[GameweekAnalyzer] 🔍 Validating continuity by comparing actual recommendations...`);
        
        // Compare transfers
        const prevTransfers = previousPlan.transfers?.map((t: any) => 
          `${t.player_out_id}-${t.player_in_id}`
        ).sort().join(',') || '';
        const currTransfers = aiResponse.transfers.map(t => 
          `${t.player_out_id}-${t.player_in_id}`
        ).sort().join(',');
        const transfersChanged = prevTransfers !== currTransfers;
        
        // Compare captain
        const captainChanged = previousPlan.captainId !== aiResponse.captain_id;
        
        // Compare vice captain  
        const viceCaptainChanged = previousPlan.viceCaptainId !== aiResponse.vice_captain_id;
        
        // Compare formation
        const formationChanged = previousPlan.formation !== aiResponse.formation;
        
        // Compare chip
        const chipChanged = previousPlan.chipToPlay !== aiResponse.chip_to_play;
        
        // Determine if ANY recommendation changed
        if (transfersChanged || captainChanged || viceCaptainChanged || formationChanged || chipChanged) {
          console.log(`[GameweekAnalyzer] ⚠️  CONTINUITY OVERRIDE: AI said recommendations_changed=${aiResponse.recommendations_changed}, but actual comparison shows changes:`);
          console.log(`  - Transfers changed: ${transfersChanged} (prev: ${prevTransfers.substring(0, 50)}..., curr: ${currTransfers.substring(0, 50)}...)`);
          console.log(`  - Captain changed: ${captainChanged} (${previousPlan.captainId} → ${aiResponse.captain_id})`);
          console.log(`  - Vice captain changed: ${viceCaptainChanged} (${previousPlan.viceCaptainId} → ${aiResponse.vice_captain_id})`);
          console.log(`  - Formation changed: ${formationChanged} (${previousPlan.formation} → ${aiResponse.formation})`);
          console.log(`  - Chip changed: ${chipChanged} (${previousPlan.chipToPlay} → ${aiResponse.chip_to_play})`);
          
          actualRecommendationsChanged = true;
          actualChangeReasoning = `Recommendations updated based on latest analysis. Changes: ${
            [
              transfersChanged ? 'different transfers' : null,
              captainChanged ? 'captain changed' : null,
              viceCaptainChanged ? 'vice captain changed' : null,
              formationChanged ? 'formation adjusted' : null,
              chipChanged ? 'chip strategy changed' : null,
            ].filter(Boolean).join(', ')
          }.`;
        } else {
          console.log(`[GameweekAnalyzer] ✅ Continuity confirmed: Recommendations genuinely unchanged`);
        }
      } else {
        console.log(`[GameweekAnalyzer] No previous plan - this is the first plan for GW${gameweek}`);
        // If there's no previous plan, it can't be "unchanged"
        if (!actualRecommendationsChanged) {
          actualRecommendationsChanged = true;
          actualChangeReasoning = `Initial plan for GW${gameweek} created.`;
        }
      }

      // 7. Save to database
      const plan = await storage.saveGameweekPlan({
        userId,
        gameweek,
        transfers: aiResponse.transfers,
        captainId: aiResponse.captain_id,
        viceCaptainId: aiResponse.vice_captain_id,
        chipToPlay: aiResponse.chip_to_play as 'wildcard' | 'freehit' | 'benchboost' | 'triplecaptain' | null,
        formation: aiResponse.formation,
        predictedPoints: aiResponse.predicted_points - transferCost,
        confidence: aiResponse.confidence,
        aiReasoning: JSON.stringify({
          reasoning: aiResponse.reasoning,
          insights: strategicInsights,
          validation: {
            isValid: validation.isValid && chipValidation.isValid,
            errors: [...validation.errors, ...chipValidation.errors],
            warnings: [...validation.warnings, ...chipValidation.warnings],
          },
          transferCost,
          snapshotId: inputData.context.snapshotId,
        }),
        status: 'pending',
        originalTeamSnapshot,
        recommendationsChanged: actualRecommendationsChanged,
        changeReasoning: actualChangeReasoning,
        snapshotId: inputData.context.snapshotId,
        snapshotGameweek: inputData.context.gameweek,
        snapshotTimestamp: new Date(inputData.context.timestamp),
        snapshotEnriched: inputData.context.enriched,
      });

      // Validate that the saved plan has the correct snapshot_id
      if (plan.snapshotId !== inputData.context.snapshotId) {
        throw new Error(`Snapshot ID mismatch: plan has ${plan.snapshotId}, expected ${inputData.context.snapshotId}`);
      }

      // Calculate player IDs in the current plan (after transfers)
      const transferredOutIds = new Set(aiResponse.transfers.map(t => t.player_out_id));
      const transferredInIds = new Set(aiResponse.transfers.map(t => t.player_in_id));
      
      const currentPlayerIds = new Set([
        ...inputData.currentTeam.players
          .filter(p => p.player_id && !transferredOutIds.has(p.player_id))
          .map(p => p.player_id!),
        ...Array.from(transferredInIds)
      ]);

      console.log(`[GameweekAnalyzer] Current plan has ${currentPlayerIds.size} players (${inputData.currentTeam.players.length} original - ${transferredOutIds.size} out + ${transferredInIds.size} in)`);

      // 6.7. CRITICAL FIX: Generate predictions for ALL current squad players (existing + transferred-in)
      // This ensures every player has a predicted_points value for accurate lineup generation and substitution attribution
      console.log(`\n[GameweekAnalyzer] 🔮 Generating predictions for ALL ${currentPlayerIds.size} current squad players...`);
      
      const existingSquadPlayerIds = inputData.currentTeam.players
        .filter(p => p.player_id && !transferredOutIds.has(p.player_id))
        .map(p => p.player_id!);
      
      console.log(`[GameweekAnalyzer] Breaking down: ${existingSquadPlayerIds.length} existing players + ${transferredInIds.size} transferred-in = ${currentPlayerIds.size} total`);
      
      // Fetch existing predictions once before the loop (performance optimization)
      const existingPredictionsBeforeGeneration = await storage.getPredictionsByGameweek(userId, gameweek);
      const existingPredictionsSet = new Set(
        existingPredictionsBeforeGeneration
          .filter(p => p.snapshotId === inputData.context.snapshotId)
          .map(p => p.playerId)
      );
      
      // Generate predictions for ALL current players (both existing squad and transferred-in)
      let predictionsGenerated = 0;
      let predictionsSkipped = 0;
      
      for (const playerId of Array.from(currentPlayerIds)) {
        // Check if prediction already exists for this player + gameweek + snapshot
        if (existingPredictionsSet.has(playerId)) {
          console.log(`  ⏭️  Player ${playerId} already has prediction for this snapshot - skipping`);
          predictionsSkipped++;
          continue;
        }
        
        // Find player data
        const player = inputData.context.snapshot.data.players.find((p: FPLPlayer) => p.id === playerId);
        if (!player) {
          console.warn(`  ⚠️  Player ${playerId} not found in snapshot - skipping`);
          continue;
        }
        
        // Get upcoming fixtures for this player
        const upcomingFixtures = inputData.upcomingFixtures
          .filter((f: FPLFixture) => 
            !f.finished && 
            f.event && 
            f.event >= gameweek && 
            (f.team_h === player.team || f.team_a === player.team)
          )
          .slice(0, 3);
        
        try {
          console.log(`  🎯 Generating prediction for ${player.web_name} (ID: ${playerId})...`);
          
          // Generate prediction using AI service
          await aiPredictionService.predictPlayerPoints({
            player,
            upcomingFixtures,
            userId,
            gameweek,
            snapshotId: inputData.context.snapshotId,
          });
          
          predictionsGenerated++;
          console.log(`  ✅ Prediction generated for ${player.web_name}`);
        } catch (error) {
          console.error(`  ❌ Failed to generate prediction for ${player.web_name} (ID: ${playerId}):`, error instanceof Error ? error.message : 'Unknown error');
          // Continue with other players even if one fails
        }
      }
      
      console.log(`\n[GameweekAnalyzer] 📊 Prediction generation complete: ${predictionsGenerated} generated, ${predictionsSkipped} skipped (already existed), ${currentPlayerIds.size - predictionsGenerated - predictionsSkipped} failed`);

      // Fetch all predictions for this gameweek (includes both new and historical predictions)
      const savedPredictions = await storage.getPredictionsByGameweek(userId, gameweek);

      // Filter to only predictions for players in the CURRENT plan (post-transfer team)
      // This ensures we only validate predictions created in THIS run, ignoring stale predictions from previous runs
      const relevantPredictions = savedPredictions.filter(p => currentPlayerIds.has(p.playerId));

      console.log(`[GameweekAnalyzer] Snapshot validation: checking ${relevantPredictions.length} predictions for current team players (ignoring ${savedPredictions.length - relevantPredictions.length} stale predictions from previous runs)`);

      // Validate only relevant predictions have matching snapshot_id
      const mismatchedPredictions = relevantPredictions.filter(
        p => p.snapshotId && p.snapshotId !== inputData.context.snapshotId
      );

      if (mismatchedPredictions.length > 0) {
        console.error('[GameweekAnalyzer] Snapshot mismatch in predictions:', {
          expected: inputData.context.snapshotId,
          found: mismatchedPredictions.map(p => ({ playerId: p.playerId, snapshotId: p.snapshotId }))
        });
        throw new Error(`Snapshot validation failed: ${mismatchedPredictions.length} predictions have mismatched snapshot_id`);
      }

      console.log(`[GameweekAnalyzer] ✓ All ${relevantPredictions.length} predictions for current team players match snapshot ${inputData.context.snapshotId.substring(0, 8)}...`);

      // CRITICAL FIX: Generate predictions for transferred-in players
      // These players don't have predictions yet, so we need to estimate their points
      // to ensure they're properly considered for the starting XI
      const predictionsMap = new Map(relevantPredictions.map(p => [p.playerId, p.predictedPoints]));
      
      console.log(`[GameweekAnalyzer] Initial predictionsMap has ${predictionsMap.size} players before adding transferred-in estimates`);
      
      for (const transfer of aiResponse.transfers) {
        const playerInName = inputData.context.snapshot.data.players.find((p: FPLPlayer) => p.id === transfer.player_in_id)?.web_name || `Player ${transfer.player_in_id}`;
        const playerOutName = inputData.context.snapshot.data.players.find((p: FPLPlayer) => p.id === transfer.player_out_id)?.web_name || `Player ${transfer.player_out_id}`;
        
        if (!predictionsMap.has(transfer.player_in_id)) {
          // Find the player being transferred out to use as baseline
          const playerOutPrediction = predictionsMap.get(transfer.player_out_id) || 2;
          
          // Estimate new player's points as: old player's points + expected gain
          const estimatedPoints = Math.max(0, Math.round(playerOutPrediction + transfer.expected_points_gain));
          
          console.log(`[GameweekAnalyzer] ✅ Adding estimate for transferred-in player ${playerInName} (ID: ${transfer.player_in_id}): ${estimatedPoints} pts (baseline from ${playerOutName}: ${playerOutPrediction}, gain: ${transfer.expected_points_gain})`);
          
          predictionsMap.set(transfer.player_in_id, estimatedPoints);
        } else {
          const existingPrediction = predictionsMap.get(transfer.player_in_id);
          console.log(`[GameweekAnalyzer] ⚠️ Transferred-in player ${playerInName} (ID: ${transfer.player_in_id}) already has prediction: ${existingPrediction} pts - NOT adding estimate`);
        }
      }
      
      console.log(`[GameweekAnalyzer] 📊 Final predictionsMap contents before enhancement loop (${predictionsMap.size} players):`);
      const predictionsArray = Array.from(predictionsMap.entries()).map(([playerId, pts]) => {
        const player = inputData.context.snapshot.data.players.find((p: FPLPlayer) => p.id === playerId);
        return { playerId, name: player?.web_name || 'Unknown', predictedPoints: pts };
      }).sort((a, b) => b.predictedPoints - a.predictedPoints);
      console.log(predictionsArray.slice(0, 15).map(p => `  ${p.name}: ${p.predictedPoints} pts`).join('\n'));

      // 8. Generate starting XI lineup - first generate current lineup (before transfers) to compare
      console.log(`[GameweekAnalyzer] Generating current lineup (before transfers) for comparison...`);
      const currentLineup = await this.generateLineup(
        inputData.currentTeam,
        [], // No transfers - current lineup
        aiResponse.formation,
        aiResponse.captain_id,
        aiResponse.vice_captain_id,
        inputData.context.snapshot.data.players,
        Array.from(predictionsMap.entries()).map(([playerId, predictedPoints]) => ({ playerId, predictedPoints }))
      );
      
      console.log(`[GameweekAnalyzer] Generating starting XI lineup with ${predictionsMap.size} player predictions...`);
      const lineup = await this.generateLineup(
        inputData.currentTeam,
        aiResponse.transfers,
        aiResponse.formation,
        aiResponse.captain_id,
        aiResponse.vice_captain_id,
        inputData.context.snapshot.data.players,
        Array.from(predictionsMap.entries()).map(([playerId, predictedPoints]) => ({ playerId, predictedPoints }))
      );

      // 8.5. Enhance transfer reasoning with lineup substitution details
      if (aiResponse.transfers.length > 0) {
        console.log(`\n[GameweekAnalyzer] 🔄 Analyzing lineup changes for ${aiResponse.transfers.length} transfers...`);
        
        // Create a map of player positions in the current lineup (before transfers)
        const currentLineupMap = new Map(currentLineup.map(p => [p.player_id, p.position]));
        
        console.log(`[GameweekAnalyzer] Current lineup (before ANY transfers):`);
        const currentStartingXI = currentLineup.filter(p => p.position <= 11);
        const currentBench = currentLineup.filter(p => p.position > 11);
        console.log(`  Starting XI (${currentStartingXI.length}): ${currentStartingXI.map(p => {
          const player = inputData.context.snapshot.data.players.find((pl: FPLPlayer) => pl.id === p.player_id);
          const prediction = predictionsMap.get(p.player_id) || 0;
          return `${player?.web_name}(${prediction}pts)`;
        }).join(', ')}`);
        console.log(`  Bench (${currentBench.length}): ${currentBench.map(p => {
          const player = inputData.context.snapshot.data.players.find((pl: FPLPlayer) => pl.id === p.player_id);
          const prediction = predictionsMap.get(p.player_id) || 0;
          return `${player?.web_name}(${prediction}pts)`;
        }).join(', ')}`);
        
        // Analyze each transfer individually by comparing:
        // - Current lineup (before ANY transfers)
        // - Lineup after applying ONLY this single transfer
        for (const transfer of aiResponse.transfers) {
          const playerInName = inputData.context.snapshot.data.players.find((p: FPLPlayer) => p.id === transfer.player_in_id)?.web_name || `Player ${transfer.player_in_id}`;
          const playerOutName = inputData.context.snapshot.data.players.find((p: FPLPlayer) => p.id === transfer.player_out_id)?.web_name || `Player ${transfer.player_out_id}`;
          
          console.log(`\n[GameweekAnalyzer] 🔍 Analyzing transfer: ${playerOutName} (ID: ${transfer.player_out_id}) → ${playerInName} (ID: ${transfer.player_in_id})`);
          
          // Verify predictions for both players
          const playerOutPrediction = predictionsMap.get(transfer.player_out_id);
          const playerInPrediction = predictionsMap.get(transfer.player_in_id);
          console.log(`  ${playerOutName} prediction: ${playerOutPrediction !== undefined ? playerOutPrediction + ' pts' : 'MISSING ⚠️'}`);
          console.log(`  ${playerInName} prediction: ${playerInPrediction !== undefined ? playerInPrediction + ' pts' : 'MISSING ⚠️'}`);
          
          if (playerInPrediction === undefined) {
            console.error(`  ❌ ERROR: Missing prediction for transferred-in player ${playerInName}! This will cause lineup generation to fail.`);
          }
          
          // Generate lineup with ONLY this transfer applied
          const predictionsForLineup = Array.from(predictionsMap.entries()).map(([playerId, predictedPoints]) => ({ playerId, predictedPoints }));
          console.log(`  Generating lineup with ${predictionsForLineup.length} predictions (including ${playerInName})...`);
          
          const lineupWithThisTransfer = await this.generateLineup(
            inputData.currentTeam,
            [transfer], // Only this transfer
            aiResponse.formation,
            aiResponse.captain_id,
            aiResponse.vice_captain_id,
            inputData.context.snapshot.data.players,
            predictionsForLineup
          );
          
          console.log(`  New lineup (with ${playerOutName} → ${playerInName}):`);
          const newStartingXI = lineupWithThisTransfer.filter(p => p.position <= 11);
          const newBench = lineupWithThisTransfer.filter(p => p.position > 11);
          console.log(`    Starting XI (${newStartingXI.length}): ${newStartingXI.map(p => {
            const player = inputData.context.snapshot.data.players.find((pl: FPLPlayer) => pl.id === p.player_id);
            const prediction = predictionsMap.get(p.player_id) || 0;
            return `${player?.web_name}(${prediction}pts)`;
          }).join(', ')}`);
          console.log(`    Bench (${newBench.length}): ${newBench.map(p => {
            const player = inputData.context.snapshot.data.players.find((pl: FPLPlayer) => pl.id === p.player_id);
            const prediction = predictionsMap.get(p.player_id) || 0;
            return `${player?.web_name}(${prediction}pts)`;
          }).join(', ')}`);
          
          const lineupWithThisTransferMap = new Map(lineupWithThisTransfer.map(p => [p.player_id, p.position]));
          
          const playerOutPosition = currentLineupMap.get(transfer.player_out_id);
          const playerInPosition = lineupWithThisTransferMap.get(transfer.player_in_id);
          
          console.log(`  Position check: ${playerOutName} was at position ${playerOutPosition || 'NOT FOUND'}, ${playerInName} now at position ${playerInPosition || 'NOT FOUND'}`);
          
          // Check if this transfer involves a bench player being transferred out
          // and the new player getting into the starting XI
          const playerOutWasBench = !playerOutPosition || playerOutPosition > 11;
          const playerInIsStarting = playerInPosition && playerInPosition <= 11;
          
          console.log(`  Transfer scenario: ${playerOutName} was ${playerOutWasBench ? 'on BENCH' : 'STARTING'}, ${playerInName} is ${playerInIsStarting ? 'STARTING' : 'on BENCH'}`);
          
          if (playerOutWasBench && playerInIsStarting) {
            console.log(`  ✅ Bench → Starting transfer detected! Looking for benched player...`);
            
            // FIX: Use ACTUAL FPL positions, not AI-optimized lineup
            // The currentLineup is AI-optimized and may have moved bench players to starting XI
            // We need to use the actual FPL team positions to detect real lineup changes
            const actualCurrentStartingXI = inputData.currentTeam.players
              .filter(p => p.position <= 11 && p.player_id)
              .map(p => p.player_id!);
            const newStartingXI = lineupWithThisTransfer.filter(p => p.position <= 11).map(p => p.player_id);
            
            console.log(`  ACTUAL current starting XI (${actualCurrentStartingXI.length} players): ${actualCurrentStartingXI.map(id => {
              const player = inputData.context.snapshot.data.players.find((p: FPLPlayer) => p.id === id);
              return player?.web_name || id;
            }).join(', ')}`);
            console.log(`  New starting XI (${newStartingXI.length} players): ${newStartingXI.map(id => {
              const player = inputData.context.snapshot.data.players.find((p: FPLPlayer) => p.id === id);
              return player?.web_name || id;
            }).join(', ')}`);
            
            // Find player who was in ACTUAL starting XI but is now benched (excluding the player being transferred out)
            const benchedPlayerId = actualCurrentStartingXI.find(playerId => 
              !newStartingXI.includes(playerId) && playerId !== transfer.player_out_id
            );
            
            if (benchedPlayerId) {
              const benchedPlayerName = inputData.context.snapshot.data.players.find((p: FPLPlayer) => p.id === benchedPlayerId)?.web_name || `Player ${benchedPlayerId}`;
              console.log(`  🎯 Found benched player: ${benchedPlayerName} (ID: ${benchedPlayerId})`);
            } else {
              console.log(`  ✅ NO benched player found - no starter is displaced by this transfer.`);
              console.log(`  This is correct when transferring out a bench player and the new player fills their spot.`);
              console.log(`  Diagnosis: ACTUAL current starting XI = ${actualCurrentStartingXI.length}, New starting XI = ${newStartingXI.length}`);
              const playersOnlyInCurrent = actualCurrentStartingXI.filter(id => !newStartingXI.includes(id) && id !== transfer.player_out_id);
              const playersOnlyInNew = newStartingXI.filter(id => !actualCurrentStartingXI.includes(id));
              console.log(`  Players only in current XI (excluding ${playerOutName}): ${playersOnlyInCurrent.map(id => inputData.context.snapshot.data.players.find((p: FPLPlayer) => p.id === id)?.web_name || id).join(', ') || 'NONE'}`);
              console.log(`  Players only in new XI: ${playersOnlyInNew.map(id => inputData.context.snapshot.data.players.find((p: FPLPlayer) => p.id === id)?.web_name || id).join(', ') || 'NONE'}`);
            }
            
            if (benchedPlayerId) {
              const benchedPlayer = inputData.context.snapshot.data.players.find((p: FPLPlayer) => p.id === benchedPlayerId);
              const transferredInPlayer = inputData.context.snapshot.data.players.find((p: FPLPlayer) => p.id === transfer.player_in_id);
              
              if (benchedPlayer && transferredInPlayer) {
                // Get predicted points for comparison
                const benchedPrediction = predictionsMap.get(benchedPlayerId) || 0;
                const transferredInPrediction = predictionsMap.get(transfer.player_in_id) || 0;
                
                // Build reasoning for why the benched player was chosen
                const reasons: string[] = [];
                
                // Compare predicted points
                if (transferredInPrediction > benchedPrediction) {
                  const diff = (transferredInPrediction - benchedPrediction).toFixed(1);
                  reasons.push(`${transferredInPlayer.web_name} has higher predicted points (${transferredInPrediction.toFixed(1)} vs ${benchedPrediction.toFixed(1)}, +${diff})`);
                } else if (benchedPrediction > 0) {
                  reasons.push(`lower predicted points (${benchedPrediction.toFixed(1)})`);
                }
                
                // Compare form
                const benchedForm = parseFloat(benchedPlayer.form || '0');
                const transferredInForm = parseFloat(transferredInPlayer.form || '0');
                if (benchedForm < transferredInForm && benchedForm < 4.0) {
                  reasons.push(`poor form (${benchedForm.toFixed(1)})`);
                } else if (transferredInForm > benchedForm) {
                  reasons.push(`better form for ${transferredInPlayer.web_name} (${transferredInForm.toFixed(1)} vs ${benchedForm.toFixed(1)})`);
                }
                
                // Check if player is flagged (injured/doubtful)
                if (benchedPlayer.chance_of_playing_next_round !== null && benchedPlayer.chance_of_playing_next_round < 100) {
                  reasons.push(`injury doubt (${benchedPlayer.chance_of_playing_next_round}% chance of playing)`);
                }
                
                // Compare fixture difficulty (get from snapshot data)
                const benchedTeam = inputData.context.snapshot.data.teams.find((t: FPLTeam) => t.id === benchedPlayer.team);
                const transferredInTeam = inputData.context.snapshot.data.teams.find((t: FPLTeam) => t.id === transferredInPlayer.team);
                
                if (benchedTeam && transferredInTeam) {
                  // Get next fixture for each team
                  const nextFixtures = inputData.context.snapshot.data.fixtures.filter((f: FPLFixture) => 
                    f.event === gameweek && !f.finished
                  );
                  
                  const benchedFixture = nextFixtures.find((f: FPLFixture) => 
                    f.team_h === benchedTeam.id || f.team_a === benchedTeam.id
                  );
                  const transferredInFixture = nextFixtures.find((f: FPLFixture) => 
                    f.team_h === transferredInTeam.id || f.team_a === transferredInTeam.id
                  );
                  
                  if (benchedFixture && transferredInFixture) {
                    const benchedDifficulty = benchedFixture.team_h === benchedTeam.id 
                      ? benchedFixture.team_h_difficulty 
                      : benchedFixture.team_a_difficulty;
                    const transferredInDifficulty = transferredInFixture.team_h === transferredInTeam.id 
                      ? transferredInFixture.team_h_difficulty 
                      : transferredInFixture.team_a_difficulty;
                    
                    if (benchedDifficulty > transferredInDifficulty && benchedDifficulty >= 4) {
                      const difficultyNames = ['', 'very easy', 'easy', 'moderate', 'tough', 'very tough'];
                      reasons.push(`tough fixture (${difficultyNames[benchedDifficulty]} vs ${difficultyNames[transferredInDifficulty]} for ${transferredInPlayer.web_name})`);
                    }
                  }
                }
                
                // Get position name for the benched player
                const positionNames = ['', 'GK', 'DEF', 'MID', 'FWD'];
                const benchedPlayerPosition = positionNames[benchedPlayer.element_type] || 'Unknown';
                const transferredInPlayerPosition = positionNames[transferredInPlayer.element_type] || 'Unknown';
                
                // Build the bench reason message
                const benchReason = reasons.length > 0 
                  ? reasons.join(', ')
                  : 'Tactical decision based on predicted points';
                
                // Store substitution details in the transfer object
                transfer.substitution_details = {
                  benched_player_id: benchedPlayerId,
                  benched_player_name: benchedPlayer.web_name,
                  benched_player_position: benchedPlayerPosition,
                  benched_player_predicted_points: benchedPrediction,
                  incoming_player_name: transferredInPlayer.web_name,
                  incoming_player_position: transferredInPlayerPosition,
                  incoming_player_predicted_points: transferredInPrediction,
                  bench_reason: benchReason,
                };
                
                console.log(`  ✅ Substitution details stored: ${benchedPlayer.web_name} (${benchedPlayerPosition}, ${benchedPrediction}pts) will be benched for ${transferredInPlayer.web_name} (${transferredInPlayerPosition}, ${transferredInPrediction}pts)`);
                console.log(`[GameweekAnalyzer] Transfer ${transfer.player_out_id} → ${transfer.player_in_id}: ${benchedPlayer.web_name} will be benched for ${transferredInPlayer.web_name} (reasons: ${reasons.join('; ') || 'none specified'})`);
              }
            }
          } else {
            console.log(`  ⏭️  Skipping enhancement: Transfer doesn't bring player from bench to starting XI`);
          }
        }
        
        // BUG FIX: Save enhanced transfers to database (Bug 1)
        await storage.updateGameweekPlanTransfers(plan.id, aiResponse.transfers);
        console.log(`[GameweekAnalyzer] Enhanced transfer reasoning saved to database for plan ${plan.id}`);
      }

      // Update the plan with the lineup
      await storage.updateGameweekPlanLineup(plan.id, lineup);
      plan.lineup = lineup as any; // Update local object

      console.log(`[GameweekAnalyzer] Analysis complete, plan ID: ${plan.id}`);

      // Log the decision to audit trail
      await decisionLogger.logGameweekPlan(
        userId,
        plan.id,
        inputData.context,
        inputData,
        aiResponse,
        aiResponse.confidence,
        undefined // uncertaintyReasons not currently in AI response
      );

      return plan;
    } catch (error) {
      console.error('[GameweekAnalyzer] Error analyzing gameweek:', error);
      throw new Error(`Failed to analyze gameweek: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async collectInputData(userId: number, gameweek: number) {
    console.log(`[GameweekAnalyzer] Collecting input data...`);

    // Use unified snapshot context for consistent data across all AI operations
    const context = await snapshotContext.getContext(gameweek, true);
    
    console.log(`[GameweekAnalyzer] Using snapshot ${context.snapshotId} from ${new Date(context.timestamp).toISOString()} (age: ${Math.round((Date.now() - context.timestamp) / 1000)}s)`);

    const [
      userSettings,
      automationSettings,
      currentTeam,
      managerData,
      chipsUsed,
      transferHistory,
    ] = await Promise.all([
      storage.getUserSettings(userId),
      storage.getAutomationSettings(userId),
      this.getCurrentTeam(userId, gameweek),
      this.getManagerData(userId),
      storage.getChipsUsed(userId),
      storage.getTransfersByUser(userId),
    ]);

    // Extract data from snapshot context
    const allPlayers = context.snapshot.data.players;
    const teams = context.snapshot.data.teams;
    const fixtures = context.snapshot.data.fixtures;
    const gameweeks = context.snapshot.data.gameweeks;

    // Filter fixtures for next 4-6 gameweeks
    const upcomingFixtures = fixtures.filter(
      (f: FPLFixture) => f.event && f.event >= gameweek && f.event <= gameweek + 5
    );

    // Calculate free transfers available
    const freeTransfers = this.calculateFreeTransfers(transferHistory, gameweek, currentTeam);

    // Calculate budget
    const budget = this.calculateBudget(currentTeam, allPlayers);

    // Fetch additional competitive intelligence data
    let setPieceTakers = null;
    let dreamTeam = null;
    let leagueInsights = null;
    let leagueProjectionData = null;

    try {
      [setPieceTakers, dreamTeam] = await Promise.all([
        fplApi.getSetPieceTakers().catch(() => null),
        fplApi.getDreamTeam(gameweek - 1).catch(() => null),
      ]);

      if (userSettings?.manager_id && userSettings?.primary_league_id) {
        leagueInsights = await leagueAnalysis.analyzeLeague(
          userSettings.primary_league_id,
          userId,
          userSettings.manager_id,
          gameweek,
          allPlayers
        ).catch((err) => {
          console.log('[GameweekAnalyzer] League analysis unavailable:', err.message);
          return null;
        });

        try {
          const standings = await fplApi.getLeagueStandings(userSettings.primary_league_id);
          const entries = standings.standings?.results || [];
          
          if (entries.length > 0) {
            const topEntries = entries.slice(0, 10);
            const userEntry = entries.find((e: any) => e.entry === userSettings.manager_id);
            
            let competitorIds = topEntries.map((e: any) => e.entry);
            if (userEntry && !competitorIds.includes(userSettings.manager_id)) {
              competitorIds.push(userSettings.manager_id);
            }

            const predictions = await competitorPredictor.predictCompetitorPoints(
              userSettings.primary_league_id,
              competitorIds,
              gameweek,
              allPlayers,
              upcomingFixtures,
              teams,
              gameweeks
            );

            leagueProjectionData = leagueProjection.calculateProjection(
              entries,
              predictions,
              userSettings.manager_id
            );
          }
        } catch (err) {
          console.log('[GameweekAnalyzer] League projection unavailable:', err instanceof Error ? err.message : 'Unknown error');
        }
      }
    } catch (error) {
      console.log('[GameweekAnalyzer] Error fetching additional data:', error);
    }

    return {
      userSettings: userSettings || { risk_tolerance: 'balanced' as const, manager_id: null, auto_captain: false },
      automationSettings,
      currentTeam,
      managerData,
      allPlayers,
      teams,
      upcomingFixtures,
      chipsUsed,
      freeTransfers,
      budget,
      maxTransferHit: automationSettings?.maxTransferHit || 8,
      setPieceTakers,
      dreamTeam,
      leagueInsights,
      leagueProjectionData,
      context, // Include full snapshot context for validation and metadata
    };
  }

  private async getCurrentTeam(userId: number, gameweek: number): Promise<UserTeam> {
    // Try to get team from database first
    let team = await storage.getTeam(userId, gameweek);

    if (!team) {
      // If not in DB, try previous gameweek
      team = await storage.getTeam(userId, gameweek - 1);
    }

    if (!team) {
      // If still not found, fetch from FPL API using manager ID
      const userSettings = await storage.getUserSettings(userId);
      if (userSettings?.manager_id) {
        const picks = await fplApi.getManagerPicks(userSettings.manager_id, gameweek);
        const players = picks.picks.map((p, idx) => ({
          player_id: p.element,
          position: p.position,
          is_captain: p.is_captain,
          is_vice_captain: p.is_vice_captain,
        }));

        // Save to DB for future use
        team = await storage.saveTeam({
          userId,
          gameweek,
          players,
          formation: '4-4-2', // Default, will be determined by AI
          teamValue: picks.entry_history.value,
          bank: picks.entry_history.bank,
          transfersMade: picks.entry_history.event_transfers,
          lastDeadlineBank: picks.entry_history.bank,
        });
      } else {
        throw new Error('No team found and no manager ID set to fetch from FPL API');
      }
    }

    return team;
  }

  private async getManagerData(userId: number): Promise<FPLManager | null> {
    const userSettings = await storage.getUserSettings(userId);
    if (userSettings?.manager_id) {
      return await fplApi.getManagerDetails(userSettings.manager_id);
    }
    return null;
  }

  private calculateFreeTransfers(transferHistory: any[], gameweek: number, currentTeam: UserTeam): number {
    // Check if any transfers were made in previous gameweek
    const previousGWTransfers = transferHistory.filter(t => t.gameweek === gameweek - 1);
    
    if (previousGWTransfers.length === 0 && currentTeam.transfersMade === 0) {
      // No transfers last week, so we have 2 free transfers (rolling)
      return 2;
    }
    
    // Default is 1 free transfer per gameweek
    return 1;
  }

  private calculateBudget(currentTeam: UserTeam, allPlayers: FPLPlayer[]): number {
    const teamValue = currentTeam.teamValue || 1000; // in tenths
    const bank = currentTeam.bank || 0; // in tenths
    
    // Get current players' selling prices (purchase price or current price - whichever is lower)
    let totalCurrentValue = 0;
    for (const pick of currentTeam.players) {
      if (pick.player_id) {
        const player = allPlayers.find(p => p.id === pick.player_id);
        if (player) {
          // Selling price is current price (we don't have purchase price, so use current as approximation)
          totalCurrentValue += player.now_cost;
        }
      }
    }

    // Budget = bank + current squad value in tenths, convert to decimal
    return (bank + totalCurrentValue) / 10;
  }

  private async generateAIRecommendations(userId: number, inputData: any, gameweek: number, targetPlayerId?: number, previousPlan?: GameweekPlan | null): Promise<AIGameweekResponse> {
    const { currentTeam, allPlayers, teams, upcomingFixtures, userSettings, chipsUsed, freeTransfers, budget, setPieceTakers, dreamTeam, leagueInsights, leagueProjectionData } = inputData;
    
    // Get target player details if specified
    let targetPlayerInfo = '';
    if (targetPlayerId) {
      const targetPlayer = allPlayers.find((p: FPLPlayer) => p.id === targetPlayerId);
      if (targetPlayer) {
        const team = teams.find((t: FPLTeam) => t.id === targetPlayer.team);
        targetPlayerInfo = `\n\n🎯 SPECIAL REQUEST: GET ${targetPlayer.web_name.toUpperCase()} INTO THE TEAM
Target Player: ID:${targetPlayer.id} ${targetPlayer.web_name} (${team?.short_name})
Position: ${targetPlayer.element_type === 1 ? 'GK' : targetPlayer.element_type === 2 ? 'DEF' : targetPlayer.element_type === 3 ? 'MID' : 'FWD'}
Price: £${(targetPlayer.now_cost / 10).toFixed(1)}m
Form: ${targetPlayer.form} | PPG: ${targetPlayer.points_per_game} | Total: ${targetPlayer.total_points}pts

**YOUR PRIMARY OBJECTIVE**: Create the MOST EFFICIENT multi-transfer plan to bring ${targetPlayer.web_name} into the squad.
- Show EXACTLY which players to transfer out (with their selling prices)
- Calculate PRECISELY how much budget is available after each transfer
- Prioritize the CHEAPEST downgrade options to free up funds
- MINIMIZE point hits - aim for 1-2 transfers if possible
- Provide a CLEAR STEP-BY-STEP transfer sequence
- Show the TOTAL cost in points hits
- Explain WHY this is the most efficient path to get ${targetPlayer.web_name}\n`;
      }
    }

    // Build previous plan context for continuity awareness
    let previousPlanContext = '';
    if (previousPlan) {
      console.log(`[GameweekAnalyzer] Building previous plan context for continuity awareness`);
      
      const prevCaptain = allPlayers.find((p: FPLPlayer) => p.id === previousPlan.captainId);
      const prevViceCaptain = allPlayers.find((p: FPLPlayer) => p.id === previousPlan.viceCaptainId);
      
      let prevTransfersText = 'None (keep current squad)';
      if (previousPlan.transfers && Array.isArray(previousPlan.transfers) && previousPlan.transfers.length > 0) {
        prevTransfersText = previousPlan.transfers.map((t: any) => {
          const pOut = allPlayers.find((p: FPLPlayer) => p.id === t.player_out_id);
          const pIn = allPlayers.find((p: FPLPlayer) => p.id === t.player_in_id);
          return `  - OUT: ${pOut?.web_name || 'Unknown'} (ID:${t.player_out_id}) → IN: ${pIn?.web_name || 'Unknown'} (ID:${t.player_in_id}) [${t.priority} priority, +${t.expected_points_gain} pts]`;
        }).join('\n');
      }
      
      previousPlanContext = `\n\n═══════════════════════════════════════════════════════════════════════
🔄 CONTINUITY AWARENESS - PREVIOUS PLAN REVIEW 🔄
═══════════════════════════════════════════════════════════════════════

**CRITICAL INSTRUCTION**: You previously generated a plan for this gameweek. Your new recommendations should maintain CONTINUITY unless there's a SIGNIFICANT change in the data.

**PREVIOUS PLAN DETAILS** (GW${previousPlan.gameweek}):
Formation: ${previousPlan.formation}
Captain: ${prevCaptain?.web_name || 'Unknown'} (ID:${previousPlan.captainId})
Vice Captain: ${prevViceCaptain?.web_name || 'Unknown'} (ID:${previousPlan.viceCaptainId})
Chip: ${previousPlan.chipToPlay || 'None'}
Predicted Points: ${previousPlan.predictedPoints}
Confidence: ${previousPlan.confidence}%

Transfers Recommended:
${prevTransfersText}

**CONTINUITY RULES** - READ CAREFULLY:
1. ✅ MAINTAIN PREVIOUS RECOMMENDATIONS if data hasn't changed significantly
   - Minor stat fluctuations (±0.1 form, ±0.05 xG) are NOT significant
   - Small price changes (±0.1m) are NOT significant
   - Normal ownership fluctuations (±2%) are NOT significant

⚠️ **CRITICAL EXCEPTION - CAPTAIN SELECTION**:
   - Captain choice must ALWAYS be re-evaluated using the expected points framework (see "DATA-DRIVEN CAPTAIN SELECTION STRATEGY" section)
   - You MUST explicitly calculate expected points for top 3-5 captain candidates each time
   - Previous captain choice can be maintained ONLY if your analysis confirms it's still the highest expected points
   - Show your calculation in reasoning: "Haaland: 15 pts expected vs Salah: 12 pts vs Semenyo: 9 pts → Captain Haaland"
   - DO NOT simply maintain previous captain due to continuity without recalculating

2. 🚨 ONLY CHANGE recommendations if there's a SIGNIFICANT data change:
   - **Injury News**: Player status changed to 'injured' or 'doubtful' with <50% chance of playing
   - **Suspensions**: Player received red card or accumulated yellow cards leading to ban
   - **Major Form Shifts**: Player's form changed by ≥1.0 points (e.g., 4.5 → 5.5 or 6.0 → 5.0)
   - **Fixture Changes**: Match postponed, rescheduled, or difficulty changed significantly
   - **Team News**: Manager confirmed player is starting/benched, role changed (e.g., striker moved to wing)
   - **Price Trends**: Player's price about to drop/rise affecting your budget significantly (±0.2m+)
   - **League Strategy**: League leaders' ownership patterns changed dramatically (20%+ shift)

3. 📝 EXPLICITLY STATE IN YOUR RESPONSE:
   - Set "previous_plan_reviewed": true
   - Set "recommendations_changed": true ONLY if you're making different recommendations
   - In "change_reasoning", provide SPECIFIC DATA that changed (with before/after values)
   
   Examples of GOOD change reasoning:
   ❌ BAD: "Form has changed slightly" 
   ✅ GOOD: "Salah's status changed from 'available' to 'doubtful' with only 25% chance of playing this week due to hamstring injury reported on October 21st"
   
   ❌ BAD: "Better options available"
   ✅ GOOD: "Haaland has returned from injury and played 90 minutes in last match scoring twice. His status changed from 'injured' to 'available' and his form jumped from 0.0 to 8.5 in one gameweek"
   
   ❌ BAD: "Stats updated"
   ✅ GOOD: "Palmer's fixture difficulty for next 3 gameweeks dropped from average 4.2 to 2.1 due to opponent injuries. Chelsea now face Bournemouth (2), Luton (1), and Sheffield United (2)"

4. 🎯 DEFAULT BEHAVIOR: If in doubt, MAINTAIN CONTINUITY
   - The previous plan was carefully analyzed with the same data
   - Changing recommendations frequently creates instability
   - Users expect consistency unless something truly changed
   - If you can't identify a SPECIFIC, SIGNIFICANT change → keep previous recommendations

**YOUR TASK**: Analyze the current data and determine if any SIGNIFICANT changes warrant different recommendations.
If no significant changes occurred → Recommend THE SAME transfers, captain, and chip as before.
If significant changes occurred → Explain EXACTLY what changed (with specific before/after data) in "change_reasoning".

═══════════════════════════════════════════════════════════════════════\n`;
    } else {
      console.log(`[GameweekAnalyzer] No previous plan exists - this is the first plan for GW${gameweek}`);
      previousPlanContext = `\n\n**NOTE**: This is your FIRST plan for GW${gameweek}. No previous recommendations exist to maintain continuity with.\n`;
    }

    // Get current squad details WITH PLAYER IDS
    const squadDetails = currentTeam.players
      .map((pick: any) => {
        const player = allPlayers.find((p: FPLPlayer) => p.id === pick.player_id);
        const team = teams.find((t: FPLTeam) => t.id === player?.team);
        
        if (!player) return null;

        const playerFixtures = upcomingFixtures
          .filter((f: FPLFixture) => f.team_h === player.team || f.team_a === player.team)
          .slice(0, 6)
          .map((f: FPLFixture) => {
            const isHome = f.team_h === player.team;
            const opponent = teams.find((t: FPLTeam) => t.id === (isHome ? f.team_a : f.team_h));
            const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
            return `GW${f.event}: ${isHome ? 'H' : 'A'} vs ${opponent?.short_name} (Diff: ${difficulty})`;
          });

        const suspensionRisk = calculateSuspensionRisk(player.yellow_cards, gameweek);
        
        return {
          id: player.id,
          name: player.web_name,
          team: team?.short_name || 'Unknown',
          position: player.element_type === 1 ? 'GK' : player.element_type === 2 ? 'DEF' : player.element_type === 3 ? 'MID' : 'FWD',
          price: player.now_cost / 10,
          form: parseFloat(player.form),
          ppg: parseFloat(player.points_per_game),
          total_points: player.total_points,
          selected_by: player.selected_by_percent,
          status: player.status,
          chance_of_playing: player.chance_of_playing_this_round,
          news: player.news || 'None',
          xG: parseFloat(player.expected_goals || '0'),
          xA: parseFloat(player.expected_assists || '0'),
          ict: parseFloat(player.ict_index || '0'),
          yellow_cards: player.yellow_cards,
          red_cards: player.red_cards,
          suspension_risk: suspensionRisk.description,
          influence: parseFloat(player.influence || '0'),
          creativity: parseFloat(player.creativity || '0'),
          threat: parseFloat(player.threat || '0'),
          fixtures: playerFixtures.join(', ') || 'No upcoming fixtures',
        };
      })
      .filter(Boolean);

    // Build top players list by position for AI to choose from (top 100 by total points)
    const topPlayersByPosition = {
      GK: allPlayers.filter((p: FPLPlayer) => p.element_type === 1).sort((a: FPLPlayer, b: FPLPlayer) => b.total_points - a.total_points).slice(0, 20),
      DEF: allPlayers.filter((p: FPLPlayer) => p.element_type === 2).sort((a: FPLPlayer, b: FPLPlayer) => b.total_points - a.total_points).slice(0, 30),
      MID: allPlayers.filter((p: FPLPlayer) => p.element_type === 3).sort((a: FPLPlayer, b: FPLPlayer) => b.total_points - a.total_points).slice(0, 30),
      FWD: allPlayers.filter((p: FPLPlayer) => p.element_type === 4).sort((a: FPLPlayer, b: FPLPlayer) => b.total_points - a.total_points).slice(0, 20),
    };

    const topPlayersInfo = Object.entries(topPlayersByPosition).map(([position, players]) => {
      const playerList = players.map((p: FPLPlayer) => {
        const team = teams.find((t: FPLTeam) => t.id === p.team);
        const suspensionRisk = calculateSuspensionRisk(p.yellow_cards, gameweek);
        const riskWarning = suspensionRisk.risk === 'critical' || suspensionRisk.risk === 'high' 
          ? ` ⚠️${suspensionRisk.description}` 
          : p.yellow_cards >= 2 ? ` [${p.yellow_cards}YC]` : '';
        return `ID:${p.id} ${p.web_name} (${team?.short_name}) £${(p.now_cost / 10).toFixed(1)}m PPG:${p.points_per_game} Form:${p.form}${riskWarning}`;
      }).join('\n');
      return `${position}:\n${playerList}`;
    }).join('\n\n');
    
    console.log(`[GameweekAnalyzer] Generated top players list: ${topPlayersInfo.length} characters`);
    console.log(`[GameweekAnalyzer] Sample - First 500 chars:`, topPlayersInfo.substring(0, 500));

    // Get available chips
    const availableChips = ['wildcard', 'freehit', 'benchboost', 'triplecaptain'].filter(
      chip => !chipsUsed.some((c: ChipUsed) => c.chipType === chip)
    );

    // Build set piece takers info
    let setPieceInfo = '';
    if (setPieceTakers) {
      setPieceInfo = '\n\nSET PIECE TAKERS (Penalties, Corners, Free Kicks):\n';
      for (const team of Object.keys(setPieceTakers)) {
        const data = setPieceTakers[team];
        if (data.penalties || data.corners || data.free_kicks) {
          setPieceInfo += `${team}: `;
          const details = [];
          if (data.penalties) details.push(`Pens: ${data.penalties.join(', ')}`);
          if (data.corners) details.push(`Corners: ${data.corners.join(', ')}`);
          if (data.free_kicks) details.push(`FKs: ${data.free_kicks.join(', ')}`);
          setPieceInfo += details.join(' | ') + '\n';
        }
      }
    }

    // Build dream team info
    let dreamTeamInfo = '';
    if (dreamTeam?.team) {
      dreamTeamInfo = `\n\nLAST GAMEWEEK DREAM TEAM (Top Performers):\n`;
      dreamTeamInfo += dreamTeam.team.map((p: any) => {
        const player = allPlayers.find((pl: FPLPlayer) => pl.id === p.element);
        return `${player?.web_name || 'Unknown'} (${p.points} pts)`;
      }).join(', ');
    }

    // Build league insights info
    let leagueInfo = '';
    if (leagueInsights) {
      leagueInfo = `\n\n=== LEAGUE COMPETITIVE ANALYSIS ===
Your League Position: ${leagueInsights.userRank}
Gap to 1st Place: ${leagueInsights.gapToFirst} points
Average League Score: ${leagueInsights.averageLeaguePoints} pts

TOP MANAGERS' COMMON PICKS (Essential Assets):
${leagueInsights.commonPicks.map((p: any) => `- ${p.playerName}: Owned by ${p.count}/${leagueInsights.leadersAnalysis.length} top managers (${Math.round((p.count / leagueInsights.leadersAnalysis.length) * 100)}%)`).join('\n')}

DIFFERENTIAL OPPORTUNITIES (Low ownership among leaders):
${leagueInsights.differentials.map((d: any) => `- ${d.playerName}: ${d.reason}`).join('\n')}

STRATEGIC LEAGUE INSIGHTS:
${leagueInsights.strategicInsights.map((insight: string) => `- ${insight}`).join('\n')}
`;
    }

    // Build league projection info
    let projectionInfo = '';
    if (leagueProjectionData?.userStanding) {
      const user = leagueProjectionData.userStanding;
      projectionInfo = `\n\n=== PROJECTED LEAGUE STANDINGS (After GW${gameweek}) ===
YOUR PROJECTED POSITION: ${user.currentRank} → ${user.projectedRank} ${user.rankChange > 0 ? `(UP ${user.rankChange})` : user.rankChange < 0 ? `(DOWN ${Math.abs(user.rankChange)})` : '(NO CHANGE)'}
Your Predicted GW Points: ${user.predictedGWPoints} pts
Your Projected Total: ${user.projectedPoints} pts
Gap to 1st Place: ${user.gapToFirst} pts

TOP COMPETITORS' PREDICTED POINTS:
${leagueProjectionData.standings.slice(0, 5).map((s: any) => `- ${s.teamName} (${s.managerName}): ${s.predictedGWPoints} pts predicted → ${s.projectedRank}${s.projectedRank === 1 ? ' 🏆' : ''}`).join('\n')}

WIN STRATEGY RECOMMENDATIONS:
${leagueProjectionData.winStrategy?.map((strategy: string) => `- ${strategy}`).join('\n') || 'N/A'}

KEY INSIGHTS:
${leagueProjectionData.insights?.map((insight: string) => `- ${insight}`).join('\n') || 'N/A'}
`;
    }

    // Create comprehensive prompt with VERBOSE reasoning requirements
    const prompt = `You are an expert Fantasy Premier League strategist with access to comprehensive data. Analyze the team and provide EXTREMELY DETAILED, DATA-DRIVEN recommendations with VERBOSE reasoning.

CURRENT GAMEWEEK: ${gameweek}

CURRENT SQUAD (15 players WITH THEIR IDS):
${squadDetails.map((p: any, i: number) => `ID:${p.id} ${p.name} (${p.position}) - ${p.team}
   Price: £${p.price}m | Form: ${p.form.toFixed(1)} | PPG: ${p.ppg}
   Total Points: ${p.total_points} | Selected: ${p.selected_by}%
   Status: ${p.status}${p.chance_of_playing !== null ? ` (${p.chance_of_playing}% chance)` : ''}
   News: ${p.news}
   xG: ${p.xG.toFixed(2)} | xA: ${p.xA.toFixed(2)} | ICT: ${p.ict.toFixed(1)}
   Fixtures: ${p.fixtures}
`).join('\n')}

TOP AVAILABLE PLAYERS BY POSITION (with PLAYER IDS you MUST use):
${topPlayersInfo}

BUDGET & TRANSFERS:
- Bank Balance: £${(inputData.currentTeam.bank / 10).toFixed(1)}m (CASH AVAILABLE NOW)
- Free Transfers: ${freeTransfers}
- Team Value: £${(inputData.currentTeam.teamValue / 10).toFixed(1)}m (total squad value)
${targetPlayerInfo}
${previousPlanContext}

═══════════════════════════════════════════════════════════════════════
🚨🚨🚨 CRITICAL - THESE ARE HARD CONSTRAINTS THAT MUST BE FOLLOWED 🚨🚨🚨
═══════════════════════════════════════════════════════════════════════

⛔ YOUR RESPONSE WILL BE REJECTED IF YOU VIOLATE ANY OF THESE RULES ⛔

1. ✅ SQUAD COMPOSITION (EXACT NUMBERS REQUIRED):
   - Must have EXACTLY 15 players total
   - Must have EXACTLY 2 Goalkeepers (GK)
   - Must have EXACTLY 5 Defenders (DEF)
   - Must have EXACTLY 5 Midfielders (MID)
   - Must have EXACTLY 3 Forwards (FWD)
   
2. 🔴 MAXIMUM 3 PLAYERS FROM SAME TEAM 🔴
   ⚠️ THIS IS THE MOST COMMONLY VIOLATED RULE - DOUBLE CHECK YOUR SQUAD ⚠️
   - After ALL transfers are complete, NO TEAM can have more than 3 players
   - Count players by team AFTER applying all your recommended transfers
   - If you recommend multiple transfers, verify the FINAL squad composition
   
3. 💰 BUDGET CONSTRAINTS ARE HARD LIMITS 💰
   - For a SINGLE transfer: Available budget = Bank + selling price of OUT player
   - For MULTI-TRANSFER plans: Available budget = Bank + sum of ALL OUT players' selling prices
   - Example: Bank £0.5m + sell Player A £6.0m + sell Player B £8.0m = £14.5m total available
   - You CANNOT exceed the available budget under any circumstances
   - If a transfer plan doesn't fit the budget, you MUST find cheaper alternatives
   
4. 📊 TRANSFER HIT LIMITS:
   - Each transfer beyond free transfers costs -4 points
   - Maximum transfer hit allowed: ${inputData.maxTransferHit} points
   - Point hits ARE strategic investments if long-term ROI justifies it
   - Calculate: (Expected points gain over next 6 GWs) - (Point hit cost) = Net benefit
   
═══════════════════════════════════════════════════════════════════════
⚠️ VALIDATION WILL FAIL IF ANY OF THESE RULES ARE BROKEN ⚠️
═══════════════════════════════════════════════════════════════════════

AVAILABLE CHIPS:
${availableChips.length > 0 ? availableChips.join(', ') : 'None available (all used)'}

CHIP DESCRIPTIONS:
- Wildcard: Unlimited free transfers for this gameweek only (best for major team overhaul)
- Free Hit: Make unlimited transfers for one gameweek, team reverts next week (best for blank/double gameweeks)
- Bench Boost: Points from bench players count this gameweek (best when bench has good fixtures)
- Triple Captain: Captain points count 3x instead of 2x (best for premium captains with great fixtures)

USER RISK TOLERANCE: ${userSettings.risk_tolerance}
- Conservative: Prioritize safe picks, take hits ONLY when long-term ROI is clear (e.g., premium player with 6 green fixtures)
- Balanced: Mix of safe and differential picks, take hits when expected return exceeds cost over 3-4 gameweeks
- Aggressive: Consider differentials, accept larger hits for high upside plays (e.g., premium captains with double gameweeks)

**STRATEGIC PLANNING MINDSET**:
- THINK LONG-TERM: Don't just optimize for this gameweek - consider fixture runs for the next 6+ gameweeks
- CALCULATE ROI ON HITS: A -8 point hit NOW is worth it if the new player(s) will gain 15+ points over the next 4-6 gameweeks
- PREMIUM PLAYERS: Players like Haaland, Salah, Son often justify multi-transfer plans due to their consistent high returns
- FIXTURE SWINGS: Identify teams with favorable fixture runs (GW${gameweek} to GW${gameweek + 6}) and prioritize their assets
- TEAM STRUCTURE: Sometimes restructuring the squad (e.g., downgrading bench to upgrade starters) creates long-term value

FIXTURE DIFFICULTY (1=easiest, 5=hardest):
${teams.map((t: FPLTeam) => {
  const teamFixtures = upcomingFixtures
    .filter((f: FPLFixture) => f.team_h === t.id || f.team_a === t.id)
    .slice(0, 6)
    .map((f: FPLFixture) => {
      const isHome = f.team_h === t.id;
      const opponent = teams.find((team: FPLTeam) => team.id === (isHome ? f.team_a : f.team_h));
      const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
      return `GW${f.event}:${difficulty}`;
    });
  return `${t.short_name}: ${teamFixtures.join(', ')}`;
}).join('\n')}
${setPieceInfo}
${dreamTeamInfo}
${leagueInfo}
${projectionInfo}

=== CRITICAL: PURE NATURAL LANGUAGE REASONING ===

Write ALL reasoning in PURE NATURAL LANGUAGE - like you're explaining to a friend. NO parentheses, NO abbreviations, NO technical formatting. Just clear, conversational sentences with data woven naturally into the narrative.

For EACH TRANSFER, write a natural paragraph like:
"I recommend transferring out [Player Name] who costs 6.5 million because he has only averaged 2.1 points per game which is well below the squad average of 3.5. His upcoming fixtures are difficult with matches against Tottenham and Manchester City where the average difficulty rating is 4.5 out of 5. His price is also falling by 0.1 million. Instead, bring in [Player Name] who costs 7.0 million. With your current bank of 0.5 million plus selling [Out Player] for 6.5 million, you will have exactly 7.0 million available which covers the cost. He is in excellent form with 8.2 points in recent matches, his next six fixtures are favorable with an average difficulty of just 2.1, he takes penalties for his team, and 65 percent of league leaders already own him."

**CRITICAL FOR TRANSFERS**: You MUST explicitly calculate and state BOTH the budget AND the 6-gameweek points gain in EVERY transfer reasoning:

**BUDGET CALCULATION (REQUIRED):**
- State OUT player's selling price
- State current bank balance  
- Calculate available funds (bank + selling price)
- State IN player's cost
- Confirm the transfer is affordable OR if recommending expensive players like Haaland, provide a MULTI-STEP plan showing which 2-3 additional players need downgrading

**6-GAMEWEEK POINTS CALCULATION (REQUIRED):**
- State the NEW player's expected points per gameweek AND total over 6 gameweeks
- State the OLD player's expected points per gameweek AND total over 6 gameweeks
- Calculate the difference: "New player will score approximately X points per gameweek over the next 6 gameweeks totalling Y points. Old player would score approximately A points per gameweek totalling B points. This gives a gain of C points over 6 gameweeks."
- This calculation MUST appear in the reasoning text
- The expected_points_gain field MUST match this 6-gameweek calculation
- ALWAYS set expected_points_gain_timeframe to "6 gameweeks"

For CAPTAIN CHOICE, write naturally:
"Captain [Player Name] this week. He is playing at home against Bournemouth who have conceded an average of 2.3 goals per game recently. His expected goals rate over the last five matches is 0.8 per game and he has scored in four out of his last five appearances. Importantly, 80 percent of league leaders are also captaining him. Last season against Bournemouth he scored 12 points."

For CHIP STRATEGY, write conversationally:
"I recommend saving your Wildcard until gameweeks 12 through 14 because that is when several top teams have favorable fixture runs and player prices typically stabilize. You should use your Bench Boost during the double gameweek when your bench players have two matches each. For example, if your bench includes players from teams with doubles against weaker opponents."

For STRATEGIC INSIGHTS, you MUST include:
1. **Multi-Gameweek ROI Analysis**: Identify if any premium players (Haaland, Salah, etc.) justify point hits based on their fixture run for the next 6 gameweeks
   - Example: "Haaland has 6 green fixtures (avg difficulty 2.0) over the next 6 gameweeks and averages 9.5 points per game. Taking a -8 hit to bring him in will likely return 57 points over 6 games, making the hit worth 49 net points."
2. **League Competitive Analysis**: What leaders are doing differently - especially their premium player ownership
3. **Fixture Swings**: Identify teams transitioning from hard to easy fixtures (or vice versa) in the next 4-6 gameweeks
4. **Differential Opportunities**: Low-owned players with excellent upcoming fixtures
5. **Squad Structure Improvements**: Opportunities to downgrade bench fodder to upgrade key starters (long-term value plays)

**CRITICAL: PROACTIVE PREMIUM PLAYER ANALYSIS**:
Before finalizing your recommendations, YOU MUST explicitly analyze whether premium players (£12m+) should be brought in:
- Check if Haaland, Salah, Son, Palmer, or other premium assets have excellent fixture runs (next 6 gameweeks avg difficulty < 2.5)
- Calculate if their expected points over 6 gameweeks justify a -4 or -8 point hit
- Consider if league leaders own them (you need coverage to avoid falling behind)
- If a premium player makes mathematical sense, RECOMMEND THE MULTI-TRANSFER PLAN even if it requires hits
- Show the full calculation: "Player X will score ~15pts/gw over 6 GWs = 90pts total. Current player scores ~6pts/gw = 36pts. Gain: 54pts. Cost: -8 hit. Net benefit: +46pts over 6 gameweeks."

**DO NOT** be conservative just to avoid point hits - if the math shows clear long-term benefit, RECOMMEND IT.

**CRITICAL: DIFFERENTIAL STRATEGY - YOU MUST ACT ON THESE**:
When differential opportunities are identified in the league analysis, you MUST incorporate them into your actual transfer recommendations based on league position:

🎯 **IF GAP TO 1ST PLACE > 50 POINTS**: Be AGGRESSIVE with differentials
   - Prioritize 2-3 differential picks in your transfers (low ownership among leaders but high form/fixtures)
   - Template picks alone won't close the gap - you NEED differentials to gain ground
   - Accept calculated risks on high-upside players that leaders don't own
   - Example: "You are 75 points behind first place. Bringing in the differential Isak who is owned by zero of the top five managers but has excellent fixtures will help you gain ground. If he outscores their template pick by even 3 points per week you will close the gap."

⚖️ **IF GAP TO 1ST PLACE 20-50 POINTS**: BALANCED approach
   - Keep 1-2 essential template picks that leaders own (to avoid falling further behind)
   - Add 1-2 differential picks to gain ground without excessive risk
   - Focus differentials on players with strong underlying stats (high xG, xA, ICT)
   - Example: "You need both coverage with Salah who 4 out of 5 leaders own and a differential edge with Bowen who none of them own but has the best fixtures in his price range."

🛡️ **IF GAP TO 1ST PLACE < 20 POINTS**: Be CONSERVATIVE but not rigid
   - Prioritize template picks that leaders own (maintain coverage)
   - Only take differential risks if they have exceptional fixtures AND strong form
   - Avoid high-risk punts - consistency beats variance when you're close to top
   - Example: "You are only 8 points behind first place. Focus on matching the template with Haaland and Palmer who all leaders own. Save differential moves for when the gap grows."

**IMPORTANT**: If differential opportunities exist in the league analysis data, you MUST either:
1. Include at least one differential in your transfer recommendations with clear justification, OR
2. Explicitly explain in your reasoning why you chose template picks over available differentials

DO NOT just mention differentials in strategic insights - ACT ON THEM by recommending specific differential transfers based on the league position strategy above.

**CRITICAL: DATA-DRIVEN CAPTAIN SELECTION STRATEGY**:
Captaincy is the SINGLE BIGGEST points swing in any gameweek (2x multiplier). Your captain choice must MAXIMIZE EXPECTED POINTS while considering league position.

🎯 **CAPTAIN SELECTION FRAMEWORK - USE ALL AVAILABLE DATA**:

**STEP 1: Identify Best Captain Candidates (Based on Stats ONLY)**
   - Analyze xG, form, fixtures, minutes, home/away, opponent defense for ALL premium options
   - Calculate expected points for top 3-5 candidates
   - Ignore ownership and league leaders at this stage - focus purely on data

**STEP 2: Evaluate League Context (If Gap > 100 Points)**
   - Check who leaders are captaining (from league projection data)
   - If your #1 choice (from Step 1) is DIFFERENT from leaders → PERFECT, captain them
   - If your #1 choice is SAME as leaders → Compare with your #2 and #3 choices:
     * If #2 has similar expected points (within 2-3 pts) → Choose #2 as differential
     * If #2 is significantly worse (4+ pts less) → STILL choose #1 even though leaders have him
   
**STEP 3: Make Final Decision**
   - ✅ ALWAYS prioritize higher expected points
   - ⚠️ ONLY choose differential if expected points are competitive (within 2-3 pts of best option)
   - ❌ NEVER sacrifice 4+ expected points just to be different

**MATHEMATICAL EXAMPLES**:
📊 Scenario A (Gap: 120 pts behind):
   - Haaland (leaders' captain): 12 pts expected, xG 1.8, home vs relegation team (difficulty 2)
   - Salah (differential): 11 pts expected, xG 1.5, home vs mid-table (difficulty 3)
   - **VERDICT**: Captain Salah. Similar expected points (1 pt difference), but differential opportunity to close gap
   
📊 Scenario B (Gap: 120 pts behind):
   - Haaland (leaders' captain): 15 pts expected, xG 2.4, home vs relegation team (difficulty 2), on penalties
   - Semenyo (differential): 9 pts expected, xG 0.8, away vs City (difficulty 5)
   - **VERDICT**: Captain Haaland. Despite being template, he's 6 pts better than next option. Sacrificing 6 expected points to be different would WORSEN your position
   
📊 Scenario C (Gap: 120 pts behind):
   - Palmer (leaders' captain): 12 pts expected
   - Salah (differential, you own): 13 pts expected
   - **VERDICT**: Captain Salah. Higher expected points AND differential = perfect choice

**KEY PRINCIPLE**: When far behind, PREFER differentials when stats are comparable. But NEVER choose differential if it means sacrificing significant expected points.

📈 **IF GAP TO 1ST PLACE 50-100 POINTS**: 
   - Same data-driven approach, but can tolerate slightly smaller differential advantage (within 3-4 pts of best)

✅ **IF GAP TO 1ST PLACE < 50 POINTS**: 
   - Choose highest expected points candidate regardless of ownership
   - Safe to match leaders' captain if he's genuinely the best option

**CAPTAIN SELECTION REASONING EXAMPLES**:
❌ BAD: "Captain Semenyo as differential because we're 120 pts behind leaders who captain Haaland"
✅ GOOD: "Captain Haaland. While 80% of leaders captain him (gap: 120 pts), his expected points (15) are significantly higher than alternatives: Salah (11), Palmer (10), Semenyo (8). At home vs Bournemouth with 2.4 xG and on penalties, he offers the highest ceiling. Choosing a weaker differential would reduce our expected points and worsen our position."

✅ ALSO GOOD: "Captain Salah over Haaland. Leaders' consensus is Haaland (expected: 12 pts), but Salah has higher expected points (13) with Liverpool at home vs Wolves. This gives us both the best statistical choice AND a differential opportunity (gap: 120 pts). If Salah outscores Haaland by even 2 points, we gain 4 points through captaincy alone."

**YOU MUST ALWAYS**: Explicitly compare expected points for top captain candidates in your reasoning, showing your calculation process.

DO NOT just mention differentials in strategic insights - ACT ON THEM by recommending specific differential transfers based on the league position strategy above.

**═══════════════════════════════════════════════════════════════════════**
**🚨 CRITICAL: PLAYER AVAILABILITY RULES - HIGHEST PRIORITY 🚨**
**═══════════════════════════════════════════════════════════════════════**

**THESE RULES OVERRIDE ALL OTHER CONSIDERATIONS - CHECK AVAILABILITY FIRST!**

1. **NEVER transfer IN players with status='i' (injured), 'u' (unavailable), or 's' (suspended)**
2. **NEVER transfer IN players with chance_of_playing=0% or null with injury news**
3. **NEVER captain players with status='i', 'u', 's' or chance_of_playing=0%**
4. **NEVER captain players with chance_of_playing <25%** - they likely won't play
5. **ALWAYS transfer OUT injured/suspended players in your current squad** (unless they're back next GW)
6. **Player status codes:**
   - 'a' = available (OK to use)
   - 'd' = doubtful (risky, discount expected points heavily)
   - 'i' = injured (DO NOT USE)
   - 'u' = unavailable (DO NOT USE)
   - 's' = suspended (DO NOT USE)

7. **Expected points for unavailable players MUST be 0** - if status='i'/'u'/'s' or chance_of_playing=0%, they score ZERO points

**AVAILABILITY MUST BE CHECKED BEFORE:**
- Transfer recommendations (don't bring in injured players)
- Captain selection (don't captain injured players)
- Predicted points calculations (injured = 0 pts)
- Team composition (replace injured starters)

**IF IN DOUBT**: Check player status and chance_of_playing FIRST, before analyzing form/fixtures/xG.

**═══════════════════════════════════════════════════════════════════════**
**⚠️ DISCIPLINARY RISK MANAGEMENT - SUSPENSION RULES ⚠️**
**═══════════════════════════════════════════════════════════════════════**

**PREMIER LEAGUE SUSPENSION RULES (2024-25):**

**YELLOW CARD ACCUMULATION BANS:**
1. **5 yellow cards by GW19** = 1-match ban (threshold expires after GW19)
2. **10 yellow cards by GW32** = 2-match ban (threshold expires after GW32)
3. **15 yellow cards total** = 3-match ban (applies all season)
4. Yellow cards ACCUMULATE all season, only thresholds expire
5. Bans are automatic and apply to all domestic competitions

**RED CARD SUSPENSION RULES:**
1. **Two yellows in same game** → Sent off with red card = 1-match ban (automatic, cannot appeal)
   - The two yellows still count towards 5/10/15 accumulation thresholds
   - Example: Player on 3 yellows gets 2 more yellows in one game → 1-match ban PLUS now at 5 yellows total

2. **Straight red card ban lengths** (vary by offense severity):
   - **Professional foul (DOGSO - Denying Obvious Goal-Scoring Opportunity)**: 1-match ban
   - **Dissent**: 2-match ban
   - **Violent conduct / Serious foul play**: 3-match ban (minimum)
   - **Spitting at opponent**: 6-match ban (minimum)
   - **Multiple reds in season**: Additional game added per subsequent red (2nd red = base + 1 extra match)

3. **DATA LIMITATION - IMPORTANT**: The FPL API only provides total 'red_cards' count, NOT the type of red or ban length
   - You CANNOT determine from the data whether a red was from 2 yellows or straight red
   - You CANNOT calculate exact ban length from API data alone
   - ALWAYS check the 'news' field for details about recent red cards and current ban status
   - If 'status=s' (suspended), the player is CURRENTLY serving a ban

**YOUR DISCIPLINARY RISK ANALYSIS:**
Each player includes:
- yellow_cards: Total yellow cards this season
- red_cards: Total red cards this season (cannot distinguish type from data alone)
- suspension_risk: Yellow card threshold description (e.g., "Next yellow = 1-match ban")
- news: Player news often mentions recent red cards, ban length, and return date
- status: 's' means currently suspended, 'a' means available
- influence, creativity, threat: Playing style metrics

**YELLOW CARD RISK RULES:**
1. **CRITICAL RISK (1 yellow from ban)**: AVOID transferring in, AVOID captaining, STRONGLY CONSIDER transferring out
   - These players will miss a match if they receive one yellow card
   - Expected points for next 6 GWs MUST factor in likely suspension
   - Example: "Palmer has 4 yellows (critical risk: next yellow = 1-match ban). Reduce his 6-GW expected points by approximately 1 gameweek's worth (e.g., if 7 pts/game, reduce total by 7 pts)"

2. **HIGH RISK (2 yellows from ban)**: Consider carefully, factor risk into expected points
   - Discount 6-GW expected points by 20-30% for suspension probability
   - Example: "Salah has 3 yellows (2 from ban). Expected 48 pts over 6 GWs, but adjust to ~40 pts accounting for suspension risk"

3. **MODERATE RISK (3+ yellows from ban)**: Monitor but can still recommend
   - Mention in reasoning if recommending transfer or captain
   - Example: "Haaland has 2 yellows (3 from ban) - manageable risk given his output"

4. **Calculate adjusted expected points:**
   - Critical risk (1 from ban): Reduce by 1 full gameweek's expected points
   - High risk (2 from ban): Reduce total by 20-30%
   - Moderate risk (3 from ban): Reduce total by 5-10%

**RED CARD TEMPERAMENT RISK:**
- **Players with red_cards > 0**: Flag temperament concerns and increased disciplinary risk
- **Players with red_cards >= 2**: SERIOUS temperament issues - significantly increase expected yellow card probability
- Example: "Avoid Bruno Fernandes despite fixtures. He has 2 red cards this season showing poor discipline. His temperament issues increase both yellow card risk (currently 3 yellows) and future red card risk"
- **Special consideration for 2-yellow reds**: If a player's red came from 2 yellows in one game, they likely play on the edge and carry higher yellow card risk
- ALWAYS check 'news' field to understand context of recent red cards

**DISCIPLINARY REASONING EXAMPLES:**
❌ BAD: "Transfer in Palmer (excellent form)"
✅ GOOD: "Avoid Palmer despite excellent form (7.5 PPG). He has 4 yellow cards and is one booking away from a 1-match ban. Over the next 6 gameweeks, his expected 45 points must be reduced to approximately 38 points accounting for likely suspension. Better alternatives exist with similar output and lower risk."

❌ BAD: "Captain Salah (best expected points)"
✅ GOOD: "Captain Haaland over Salah. While Salah has slightly better fixtures (expected 14 pts vs Haaland's 13), Salah carries 3 yellow cards and is 2 bookings from a 1-match ban which increases suspension risk. Haaland has only 1 yellow card and presents lower disciplinary risk for the same expected output."

**YOU MUST:** Factor disciplinary risk into ALL transfer recommendations and captain selections by adjusting expected points calculations.

**═══════════════════════════════════════════════════════════════════════**

YOUR TASK:
Provide a strategic gameweek plan in this EXACT JSON format with VERBOSE, DATA-DRIVEN reasoning:

{
  "transfers": [
    {
      "player_out_id": <NUMERIC ID>,
      "player_in_id": <NUMERIC ID>,
      "expected_points_gain": <number>,
      "expected_points_gain_timeframe": "6 gameweeks",
      "reasoning": "<VERBOSE explanation with specific stats, fixtures, ownership, prices, AND THE FULL CALCULATION showing new player's expected points over 6 GWs minus old player's expected points over 6 GWs. IMPORTANT: Focus ONLY on comparing the player being transferred OUT vs the player being transferred IN (their points, form, fixtures, etc). DO NOT mention which starting XI player will be benched or lineup changes - this is handled automatically by the system and will be appended to your reasoning.>",
      "priority": "high|medium|low",
      "cost_impact": <number>
    }
  ],
  "captain_id": <NUMERIC ID from squad>,
  "vice_captain_id": <NUMERIC ID from squad>,
  "chip_to_play": <"wildcard"|"freehit"|"benchboost"|"triplecaptain"|null>,
  "formation": "<e.g., 3-4-3, 4-4-2>",
  "predicted_points": <number - this is the GROSS expected points for your starting XI BEFORE transfer penalties. Do NOT deduct transfer costs here - the system will calculate the net points automatically>,
  "confidence": <0-100>,
  "strategic_insights": [
    "<DETAILED insight with data - e.g., 'Top 3 managers all own Haaland (£14.0m, Form 9.5, 3 green fixtures) - essential coverage'>",
    "<DETAILED insight with data - e.g., 'Differential pick: Isak (owned by 0/5 leaders, Form 7.2, vs SHU/BUR/LUT avg diff 1.8)'>",
    "<DETAILED insight with data - e.g., 'GW15-18 fixture swing: Sell Arsenal assets (4 red fixtures), buy Liverpool (4 green fixtures)'>"
  ],
  "reasoning": "<OVERALL STRATEGY with specific data, league context, fixture analysis, and risk assessment. 
  
  🚨 CRITICAL INSTRUCTION FOR PREDICTED POINTS IN REASONING 🚨
  When stating predicted points in your reasoning text, you MUST calculate and state the NET points after deducting transfer penalties.
  
  **TRANSFER PENALTY CALCULATION:**
  - You have ${freeTransfers} free transfer${freeTransfers !== 1 ? 's' : ''}
  - Each additional transfer beyond free transfers costs -4 points
  - Formula: Transfer penalty = max(0, (number of transfers - free transfers) × 4)
  - **IMPORTANT**: If you're using Wildcard or Free Hit chip, ALL transfers are free (transfer penalty = 0)
  
  **Example calculations:**
  - 1 transfer with 1 free transfer = 0 penalty
  - 2 transfers with 1 free transfer = (2-1) × 4 = -4 points
  - 3 transfers with 1 free transfer = (3-1) × 4 = -8 points
  
  ✅ CORRECT EXAMPLES (assuming starting XI scores 66 points):
  - 0 transfers: 'This plan will deliver 66 points this gameweek'
  - 1 transfer (with 1 free): 'This plan will deliver 66 points this gameweek'
  - 2 transfers (with 1 free): 'This plan will deliver 62 points this gameweek (66 points from the starting XI minus the 4-point transfer penalty)'
  - 3 transfers (with 1 free): 'This plan will deliver 58 points this gameweek (66 points from the starting XI minus the 8-point transfer penalty)'
  
  ❌ WRONG EXAMPLES:
  - DO NOT say '66 points' when you're recommending 2 transfers with 1 free transfer (should be 62 points)
  - DO NOT forget to deduct the transfer penalty from your stated points
  - DO NOT say 'before penalties' or 'after penalties' - just state the FINAL NET points
  
  The key rule: Always calculate the NET points (gross points - transfer penalty) and state that FINAL number in your reasoning.>",
  "previous_plan_reviewed": <true|false - true if a previous plan existed, false if this is first plan>,
  "recommendations_changed": <true|false - true ONLY if your recommendations differ from previous plan>,
  "change_reasoning": "<REQUIRED if recommendations_changed=true: SPECIFIC data that changed with before/after values. Examples: 'Salah injured (75% chance → 25% chance)' or 'Haaland returned from injury (unavailable → available, form 0.0 → 8.5)'. If recommendations_changed=false, write 'No significant data changes - maintaining previous recommendations for consistency'>"
}

CRITICAL REQUIREMENTS:
- **PLAYER IDS**: You MUST use the ACTUAL PLAYER IDs from the "CURRENT SQUAD" and "TOP AVAILABLE PLAYERS BY POSITION" lists above
  - For player_out_id: Use the ID from your CURRENT SQUAD list (e.g., if removing "ID:469 Leno", use player_out_id: 469)
  - For player_in_id: Use the ID from the TOP AVAILABLE PLAYERS list (e.g., if bringing in "ID:220 Raya", use player_in_id: 220)
  - For captain_id/vice_captain_id: Use IDs from your CURRENT SQUAD ONLY
  - **NEVER MAKE UP OR INVENT PLAYER IDs** - always use the exact IDs provided in the lists above
- In ALL "reasoning" and "strategic_insights" text fields: ALWAYS use PLAYER NAMES, NEVER use IDs or numbers to refer to players
- ALL reasoning text must be PURE NATURAL LANGUAGE - no parentheses, no abbreviations, no technical formatting
- Write reasoning like you're talking to a friend - clear conversational sentences with data woven naturally
- Include league competitive insights in strategic thinking
- Reference set piece takers when relevant by using their names
- Consider dream team performers as form indicators
- Every recommendation must include specific stats and numbers but written naturally into sentences`;

    // Fetch AI learning context to learn from past mistakes
    let learningPrompt = '';
    try {
      console.log(`[GameweekAnalyzer] Fetching AI learning context for user ${userId}...`);
      const learningContext = await aiLearningFeedback.generateLearningContext(userId, allPlayers);
      console.log(`[GameweekAnalyzer] Learning context fetched: ${learningContext.totalGameweeksAnalyzed} gameweeks analyzed`);
      
      if (learningContext.keyLessons.length > 0) {
        console.log(`[GameweekAnalyzer] Key lessons to apply:`, learningContext.keyLessons);
      }
      
      if (learningContext.recentMistakes.length > 0) {
        console.log(`[GameweekAnalyzer] Recent mistakes to avoid:`, learningContext.recentMistakes.map(m => `GW${m.gameweek}: ${m.mistake}`));
      }
      
      learningPrompt = aiLearningFeedback.formatForPrompt(learningContext);
      console.log(`[GameweekAnalyzer] Learning prompt generated successfully`);
    } catch (error) {
      console.error(`[GameweekAnalyzer] Failed to fetch learning context:`, error instanceof Error ? error.message : 'Unknown error');
      console.log(`[GameweekAnalyzer] Continuing with plan generation without learning context`);
      // Don't throw - continue with empty learning prompt
    }

    // Append learning context to the main prompt
    const finalPromptWithLearning = prompt + learningPrompt;

    // Bounded retry logic for token limit handling
    const maxRetries = 1;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // On retry, add conciseness instruction to prompt
        const finalPrompt = attempt > 0 
          ? `${finalPromptWithLearning}\n\nIMPORTANT: Previous response exceeded token limit. Please be more concise while maintaining all required fields and key insights. Limit strategic_insights to 2-3 items and keep reasoning focused.`
          : finalPromptWithLearning;
        
        console.log(`[GameweekAnalyzer] Calling OpenAI API (attempt ${attempt + 1}/${maxRetries + 1})`);
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: finalPrompt }],
          response_format: { type: "json_object" },
          max_completion_tokens: 16384,
          temperature: 0, // Deterministic predictions for consistency
          seed: 42, // Perfect reproducibility for same inputs
        });

        const finishReason = response.choices[0].finish_reason;
        console.log('[GameweekAnalyzer] OpenAI response received. Finish reason:', finishReason);
        
        // Handle token limit exceeded case - retry if possible
        if (finishReason === 'length') {
          if (attempt < maxRetries) {
            console.warn('[GameweekAnalyzer] Response truncated - retrying with conciseness instruction');
            continue; // Retry
          } else {
            console.error('[GameweekAnalyzer] Response truncated even after retry');
            throw new Error('AI response too long even with conciseness instruction. Please try again or contact support if this persists.');
          }
        }
        
        const messageContent = response.choices[0].message.content;
        if (!messageContent) {
          console.error('[GameweekAnalyzer] Empty AI response content');
          throw new Error('AI returned empty response. Please try again.');
        }

        console.log('[GameweekAnalyzer] Parsing AI response...');
        let result;
        try {
          result = JSON.parse(messageContent);
        } catch (parseError) {
          console.error('[GameweekAnalyzer] Failed to parse AI response as JSON:', parseError);
          console.error('[GameweekAnalyzer] Response content preview:', messageContent.substring(0, 500));
          throw new Error('AI returned invalid response format. Please try again.');
        }
        console.log('[GameweekAnalyzer] AI response parsed successfully');
        
        // Validate required fields
        if (!result.captain_id || !result.vice_captain_id) {
          console.error('[GameweekAnalyzer] Missing required fields in AI response:', Object.keys(result));
          throw new Error('AI response incomplete - missing captain selections. Please try again.');
        }
        
        // Ensure transfers is an array (can be empty)
        if (!Array.isArray(result.transfers)) {
          console.log('[GameweekAnalyzer] No transfers in response, initializing empty array');
          result.transfers = [];
        }
        
        // CRITICAL: Validate and correct player IDs
        // The AI sometimes invents fake IDs, so we need to verify them against actual players
        console.log('[GameweekAnalyzer] Validating player IDs in transfers...');
        for (const transfer of result.transfers) {
          let fixed = false;
          
          // Check if player_out_id exists in current squad
          const outPlayerExists = currentTeam.players.some((p: any) => p.player_id === transfer.player_out_id);
          if (!outPlayerExists) {
            console.warn(`[GameweekAnalyzer] Invalid player_out_id: ${transfer.player_out_id} - attempting to fix from reasoning`);
            // Extract player name from reasoning (it should mention the player being sold)
            const reasoning = transfer.reasoning || '';
            // Try to find squad player mentioned in reasoning
            for (const pick of currentTeam.players) {
              const player = allPlayers.find((p: FPLPlayer) => p.id === pick.player_id);
              if (player && reasoning.includes(player.web_name)) {
                transfer.player_out_id = player.id;
                console.log(`[GameweekAnalyzer] Fixed player_out_id to ${player.id} (${player.web_name})`);
                fixed = true;
                break;
              }
            }
          }
          
          // Check if player_in_id exists in all players
          const inPlayerExists = allPlayers.some((p: FPLPlayer) => p.id === transfer.player_in_id);
          if (!inPlayerExists) {
            console.warn(`[GameweekAnalyzer] Invalid player_in_id: ${transfer.player_in_id} - attempting to fix from reasoning`);
            // Extract player name from reasoning
            const reasoning = transfer.reasoning || '';
            // Try to find player by searching reasoning for player names
            for (const player of allPlayers) {
              if (reasoning.includes(player.web_name) && !currentTeam.players.some((p: any) => p.player_id === player.id)) {
                transfer.player_in_id = player.id;
                console.log(`[GameweekAnalyzer] Fixed player_in_id to ${player.id} (${player.web_name})`);
                fixed = true;
                break;
              }
            }
          }
          
          if (!fixed && (!outPlayerExists || !inPlayerExists)) {
            console.error(`[GameweekAnalyzer] Could not fix invalid player IDs for transfer:`, transfer);
          }
          
          // Validate expected_points_gain_timeframe field exists
          if (!transfer.expected_points_gain_timeframe) {
            console.warn(`[GameweekAnalyzer] Missing expected_points_gain_timeframe for transfer, defaulting to "6 gameweeks"`);
            transfer.expected_points_gain_timeframe = "6 gameweeks";
          }
        }

        return result as AIGameweekResponse;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Don't retry for non-token-limit errors
        if (!(error instanceof Error && error.message.includes('too long'))) {
          break;
        }
      }
    }
    
    // If we get here, all retries failed
    console.error('[GameweekAnalyzer] AI API error after retries:', lastError);
    throw new Error(`AI analysis failed: ${lastError?.message || 'Unknown error'}`);
  }

  private async generateLineup(
    currentTeam: UserTeam,
    transfers: Array<{player_out_id: number; player_in_id: number}>,
    formation: string,
    captainId: number,
    viceCaptainId: number,
    allPlayers: FPLPlayer[],
    predictions: Array<{playerId: number; predictedPoints: number}>
  ): Promise<Array<{
    player_id: number;
    position: number;
    is_captain: boolean;
    is_vice_captain: boolean;
    multiplier: number;
  }>> {
    // Apply transfers to get final squad
    const transferredOutIds = new Set(transfers.map(t => t.player_out_id));
    const transferredInIds = transfers.map(t => t.player_in_id);
    
    const finalSquad = currentTeam.players
      .filter(p => p.player_id && !transferredOutIds.has(p.player_id))
      .map(p => p.player_id!);
    
    finalSquad.push(...transferredInIds);
    
    // Parse formation (e.g., "3-4-3" -> [3, 4, 3])
    const formationParts = formation.split('-').map(Number);
    const [defenders, midfielders, forwards] = formationParts;
    
    // Group players by position type
    const playersByPosition: {[key: number]: Array<{id: number; predictedPoints: number}>} = {
      1: [], // GK
      2: [], // DEF
      3: [], // MID
      4: [], // FWD
    };
    
    for (const playerId of finalSquad) {
      const player = allPlayers.find(p => p.id === playerId);
      if (!player) continue;
      
      const prediction = predictions.find(p => p.playerId === playerId);
      const predictedPoints = prediction?.predictedPoints || 0;
      
      playersByPosition[player.element_type].push({
        id: playerId,
        predictedPoints,
      });
    }
    
    // Sort each position by predicted points (highest first)
    for (const posType in playersByPosition) {
      playersByPosition[posType].sort((a, b) => b.predictedPoints - a.predictedPoints);
    }
    
    // Select starting XI based on formation
    const lineup: Array<{
      player_id: number;
      position: number;
      is_captain: boolean;
      is_vice_captain: boolean;
      multiplier: number;
    }> = [];
    
    let position = 1;
    
    // Always 1 goalkeeper
    if (playersByPosition[1].length > 0) {
      lineup.push({
        player_id: playersByPosition[1][0].id,
        position: position++,
        is_captain: playersByPosition[1][0].id === captainId,
        is_vice_captain: playersByPosition[1][0].id === viceCaptainId,
        multiplier: playersByPosition[1][0].id === captainId ? 2 : 1,
      });
    }
    
    // Add defenders
    for (let i = 0; i < defenders && i < playersByPosition[2].length; i++) {
      lineup.push({
        player_id: playersByPosition[2][i].id,
        position: position++,
        is_captain: playersByPosition[2][i].id === captainId,
        is_vice_captain: playersByPosition[2][i].id === viceCaptainId,
        multiplier: playersByPosition[2][i].id === captainId ? 2 : 1,
      });
    }
    
    // Add midfielders
    for (let i = 0; i < midfielders && i < playersByPosition[3].length; i++) {
      lineup.push({
        player_id: playersByPosition[3][i].id,
        position: position++,
        is_captain: playersByPosition[3][i].id === captainId,
        is_vice_captain: playersByPosition[3][i].id === viceCaptainId,
        multiplier: playersByPosition[3][i].id === captainId ? 2 : 1,
      });
    }
    
    // Add forwards
    for (let i = 0; i < forwards && i < playersByPosition[4].length; i++) {
      lineup.push({
        player_id: playersByPosition[4][i].id,
        position: position++,
        is_captain: playersByPosition[4][i].id === captainId,
        is_vice_captain: playersByPosition[4][i].id === viceCaptainId,
        multiplier: playersByPosition[4][i].id === captainId ? 2 : 1,
      });
    }
    
    console.log(`[GameweekAnalyzer] Generated starting XI with ${lineup.length} players in ${formation} formation`);
    
    return lineup;
  }

  private async validateFPLRules(
    currentTeam: UserTeam,
    transfers: AIGameweekResponse['transfers'],
    allPlayers: FPLPlayer[],
    budget: number,
    freeTransfers: number
  ): Promise<SquadValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Simulate transfers on current team
    const updatedSquad = [...currentTeam.players];
    let remainingBudget = budget;

    for (const transfer of transfers) {
      // Validate player_out exists in squad
      const playerOutIndex = updatedSquad.findIndex(p => p.player_id === transfer.player_out_id);
      if (playerOutIndex === -1) {
        errors.push(`Player ${transfer.player_out_id} not found in current squad`);
        continue;
      }

      // Validate player_in exists in FPL
      const playerIn = allPlayers.find(p => p.id === transfer.player_in_id);
      if (!playerIn) {
        errors.push(`Player ${transfer.player_in_id} does not exist in FPL database`);
        continue;
      }

      const playerOut = allPlayers.find(p => p.id === transfer.player_out_id);
      if (playerOut) {
        // Calculate budget impact
        const sellPrice = playerOut.now_cost / 10; // Simplified: use current price
        const buyPrice = playerIn.now_cost / 10;
        remainingBudget += sellPrice - buyPrice;

        // Update squad
        updatedSquad[playerOutIndex] = {
          ...updatedSquad[playerOutIndex],
          player_id: playerIn.id,
        };
      }
    }

    // Validate budget
    if (remainingBudget < 0) {
      errors.push(`Budget exceeded by £${Math.abs(remainingBudget).toFixed(1)}m`);
    }

    // Validate squad composition
    const positionCounts: { [key: number]: number } = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const teamCounts: { [key: number]: number } = {};
    
    console.log('[Validation] Squad after transfers:');
    for (const pick of updatedSquad) {
      if (pick.player_id) {
        const player = allPlayers.find(p => p.id === pick.player_id);
        if (player) {
          const posNames = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' };
          console.log(`  - ${player.web_name} (${posNames[player.element_type as keyof typeof posNames]})`);
          positionCounts[player.element_type] = (positionCounts[player.element_type] || 0) + 1;
          teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
        } else {
          console.warn(`  - Player ID ${pick.player_id} not found in allPlayers!`);
        }
      }
    }
    console.log('[Validation] Position counts:', positionCounts);

    // Check position limits: 2 GK, 5 DEF, 5 MID, 3 FWD
    if (positionCounts[1] !== 2) {
      errors.push(`Must have exactly 2 goalkeepers (currently ${positionCounts[1]})`);
    }
    if (positionCounts[2] !== 5) {
      errors.push(`Must have exactly 5 defenders (currently ${positionCounts[2]})`);
    }
    if (positionCounts[3] !== 5) {
      errors.push(`Must have exactly 5 midfielders (currently ${positionCounts[3]})`);
    }
    if (positionCounts[4] !== 3) {
      errors.push(`Must have exactly 3 forwards (currently ${positionCounts[4]})`);
    }

    // Check max 3 from same team
    for (const [teamId, count] of Object.entries(teamCounts)) {
      if (count > 3) {
        errors.push(`Maximum 3 players from same team (Team ${teamId} has ${count})`);
      }
    }

    // Warnings
    if (transfers.length > freeTransfers) {
      const hits = (transfers.length - freeTransfers) * 4;
      warnings.push(`${transfers.length - freeTransfers} extra transfers will cost ${hits} points`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private calculateTransferCost(transferCount: number, freeTransfers: number, maxHit: number): number {
    if (transferCount <= freeTransfers) {
      return 0;
    }

    const extraTransfers = transferCount - freeTransfers;
    const cost = extraTransfers * 4;

    if (cost > maxHit) {
      throw new Error(`Transfer cost (${cost} points) exceeds maximum allowed hit (${maxHit} points)`);
    }

    return cost;
  }

  private async validateChipUsage(
    userId: number,
    chipToPlay: 'wildcard' | 'freehit' | 'benchboost' | 'triplecaptain' | null,
    chipsUsed: ChipUsed[]
  ): Promise<SquadValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (chipToPlay) {
      // Check if chip has already been used
      const alreadyUsed = chipsUsed.some(c => c.chipType === chipToPlay);
      
      if (alreadyUsed) {
        errors.push(`${chipToPlay} chip has already been used this season`);
      } else {
        warnings.push(`Planning to use ${chipToPlay} chip this gameweek`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export const gameweekAnalyzer = new GameweekAnalyzerService();
