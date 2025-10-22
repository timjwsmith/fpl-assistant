import OpenAI from "openai";
import { storage } from "./storage";
import { fplApi } from "./fpl-api";
import { leagueAnalysis } from "./league-analysis";
import { competitorPredictor } from "./competitor-predictor";
import { leagueProjection } from "./league-projection";
import { aiLearningFeedback } from "./ai-learning-feedback";
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
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
    cost_impact: number;
  }>;
  captain_id: number;
  vice_captain_id: number;
  chip_to_play: string | null;
  formation: string;
  predicted_points: number;
  confidence: number;
  strategic_insights: string[];
  reasoning: string;
}

export class GameweekAnalyzerService {
  async analyzeGameweek(userId: number, gameweek: number, targetPlayerId?: number): Promise<GameweekPlan> {
    try {
      console.log(`[GameweekAnalyzer] Starting analysis for user ${userId}, gameweek ${gameweek}${targetPlayerId ? `, target player: ${targetPlayerId}` : ''}`);

      // 1. Collect all input data
      const inputData = await this.collectInputData(userId, gameweek);

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
          aiResponse = await this.generateAIRecommendations(userId, inputData, gameweek, targetPlayerId);

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
        }),
        status: 'pending',
        originalTeamSnapshot,
      });

      console.log(`[GameweekAnalyzer] Analysis complete, plan ID: ${plan.id}`);

      return plan;
    } catch (error) {
      console.error('[GameweekAnalyzer] Error analyzing gameweek:', error);
      throw new Error(`Failed to analyze gameweek: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async collectInputData(userId: number, gameweek: number) {
    console.log(`[GameweekAnalyzer] Collecting input data...`);

    const [
      userSettings,
      automationSettings,
      currentTeam,
      managerData,
      allPlayers,
      teams,
      fixtures,
      chipsUsed,
      transferHistory,
    ] = await Promise.all([
      storage.getUserSettings(userId),
      storage.getAutomationSettings(userId),
      this.getCurrentTeam(userId, gameweek),
      this.getManagerData(userId),
      fplApi.getPlayers(),
      fplApi.getTeams(),
      fplApi.getFixtures(),
      storage.getChipsUsed(userId),
      storage.getTransfersByUser(userId),
    ]);

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
              teams
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

  private async generateAIRecommendations(userId: number, inputData: any, gameweek: number, targetPlayerId?: number): Promise<AIGameweekResponse> {
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
        return `ID:${p.id} ${p.web_name} (${team?.short_name}) £${(p.now_cost / 10).toFixed(1)}m PPG:${p.points_per_game} Form:${p.form}`;
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

**CRITICAL FOR TRANSFERS**: You MUST explicitly calculate and state the budget in EVERY transfer reasoning:
- State OUT player's selling price
- State current bank balance  
- Calculate available funds (bank + selling price)
- State IN player's cost
- Confirm the transfer is affordable OR if recommending expensive players like Haaland, provide a MULTI-STEP plan showing which 2-3 additional players need downgrading

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

YOUR TASK:
Provide a strategic gameweek plan in this EXACT JSON format with VERBOSE, DATA-DRIVEN reasoning:

{
  "transfers": [
    {
      "player_out_id": <NUMERIC ID>,
      "player_in_id": <NUMERIC ID>,
      "expected_points_gain": <number>,
      "reasoning": "<VERBOSE explanation with specific stats, fixtures, ownership, prices>",
      "priority": "high|medium|low",
      "cost_impact": <number>
    }
  ],
  "captain_id": <NUMERIC ID from squad>,
  "vice_captain_id": <NUMERIC ID from squad>,
  "chip_to_play": <"wildcard"|"freehit"|"benchboost"|"triplecaptain"|null>,
  "formation": "<e.g., 3-4-3, 4-4-2>",
  "predicted_points": <number>,
  "confidence": <0-100>,
  "strategic_insights": [
    "<DETAILED insight with data - e.g., 'Top 3 managers all own Haaland (£14.0m, Form 9.5, 3 green fixtures) - essential coverage'>",
    "<DETAILED insight with data - e.g., 'Differential pick: Isak (owned by 0/5 leaders, Form 7.2, vs SHU/BUR/LUT avg diff 1.8)'>",
    "<DETAILED insight with data - e.g., 'GW15-18 fixture swing: Sell Arsenal assets (4 red fixtures), buy Liverpool (4 green fixtures)'>"
  ],
  "reasoning": "<OVERALL STRATEGY with specific data, league context, fixture analysis, and risk assessment>"
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
      const learningContext = await aiLearningFeedback.generateLearningContext(userId);
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
          model: "gpt-5",
          messages: [{ role: "user", content: finalPrompt }],
          response_format: { type: "json_object" },
          max_completion_tokens: 16384,
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

    for (const pick of updatedSquad) {
      if (pick.player_id) {
        const player = allPlayers.find(p => p.id === pick.player_id);
        if (player) {
          positionCounts[player.element_type] = (positionCounts[player.element_type] || 0) + 1;
          teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
        }
      }
    }

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
