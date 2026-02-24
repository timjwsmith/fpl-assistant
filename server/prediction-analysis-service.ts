import { storage } from './storage';
import { fplApi } from './fpl-api';
import type { GameweekPlan } from '../shared/schema';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Using Replit AI Integrations - provides OpenAI-compatible API access without requiring your own API key
const openai = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  ? new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
    })
  : null;

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

interface PredictionFailureAnalysis {
  gameweek: number;
  predicted: number;
  actual: number;
  error: number;
  analysis: string; // Bullet points explaining why prediction missed
}

export class PredictionAnalysisService {
  /**
   * Generate AI-powered analysis explaining why a prediction missed
   */
  async analyzePredictionFailure(planId: number): Promise<PredictionFailureAnalysis> {
    console.log(`[PredictionAnalysis] Analyzing prediction failure for plan ${planId}`);

    // Get the gameweek plan
    const plan = await storage.getGameweekPlanById(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    if (plan.predictedPoints === null || plan.actualPointsWithAI === null) {
      throw new Error(`Plan ${planId} missing prediction or actual points`);
    }

    const error = Math.abs(plan.predictedPoints - plan.actualPointsWithAI);
    
    // Skip analysis if prediction was close (error < 5 pts)
    if (error < 5) {
      console.log(`[PredictionAnalysis] Skipping analysis for GW${plan.gameweek} - prediction was accurate (error: ${error} pts)`);
      return {
        gameweek: plan.gameweek,
        predicted: plan.predictedPoints,
        actual: plan.actualPointsWithAI,
        error,
        analysis: '✅ Prediction was accurate (error < 5 pts)',
      };
    }

    // Fetch gameweek data for context with REAL data
    const gameweekData = await this.getGameweekContext(plan.gameweek, plan.userId, plan);

    // Use AI to analyze the failure
    const analysis = await this.generateAIAnalysis(plan, gameweekData, error);

    // Store the analysis in the database
    await storage.updatePredictionAnalysis(planId, analysis);

    console.log(`[PredictionAnalysis] Analysis complete for GW${plan.gameweek}: ${error} pts error`);

    return {
      gameweek: plan.gameweek,
      predicted: plan.predictedPoints,
      actual: plan.actualPointsWithAI,
      error,
      analysis,
    };
  }

  /**
   * Aggregate scoring breakdown across all fixtures from FPL explain array
   * CRITICAL FOR DOUBLE GAMEWEEKS - must sum, not overwrite
   * PUBLIC for testing to prevent regression bugs
   */
  public aggregateExplainArray(explainArray: any[]): Record<string, { points: number; value: number }> {
    const scoringBreakdown: Record<string, { points: number; value: number }> = {};
    
    for (const fixture of explainArray) {
      for (const stat of fixture.stats) {
        // Initialize if not exists
        if (!scoringBreakdown[stat.identifier]) {
          scoringBreakdown[stat.identifier] = {
            points: 0,
            value: 0,
          };
        }
        // CRITICAL: Aggregate points and values across all fixtures (must use += not =)
        scoringBreakdown[stat.identifier].points += stat.points;
        scoringBreakdown[stat.identifier].value += stat.value;
      }
    }
    
    return scoringBreakdown;
  }

  /**
   * Format scoring breakdown into human-readable strings
   * Handles ALL FPL identifiers to prevent silent data loss
   * PUBLIC for testing to ensure regression prevention
   */
  public formatScoringBreakdown(scoringBreakdown: any): string[] {
    const breakdown: string[] = [];
    
    for (const [identifier, data] of Object.entries(scoringBreakdown)) {
      const points = (data as any).points;
      const value = (data as any).value;
      
      switch (identifier) {
        case 'minutes':
          breakdown.push(`${value} mins: ${points > 0 ? '+' : ''}${points}`);
          break;
        case 'goals_scored':
          breakdown.push(`${value}G: +${points}`);
          break;
        case 'assists':
          breakdown.push(`${value}A: +${points}`);
          break;
        case 'clean_sheets':
          breakdown.push(`CS: +${points}`);
          break;
        case 'defensive_contribution':
          breakdown.push(`Def: +${points}`);
          break;
        case 'yellow_cards':
          breakdown.push(`${value}YC: ${points}`);
          break;
        case 'red_cards':
          breakdown.push(`${value}RC: ${points}`);
          break;
        case 'bonus':
          breakdown.push(`Bonus: +${points}`);
          break;
        case 'saves':
          breakdown.push(`${value} saves: +${points}`);
          break;
        case 'goals_conceded':
          breakdown.push(`${value} GC: ${points}`);
          break;
        case 'penalties_saved':
          breakdown.push(`${value} pen saved: +${points}`);
          break;
        case 'penalties_missed':
          breakdown.push(`${value} pen missed: ${points}`);
          break;
        case 'own_goals':
          breakdown.push(`${value}OG: ${points}`);
          break;
        case 'penalties_conceded':
          breakdown.push(`${value} pen conceded: ${points}`);
          break;
        default:
          // Handle any unknown identifiers to ensure no silent omissions
          breakdown.push(`${identifier}: ${points > 0 ? '+' : ''}${points}`);
          break;
      }
    }
    
    return breakdown;
  }

  /**
   * Get gameweek context for AI analysis with REAL data
   */
  private async getGameweekContext(gameweek: number, userId: number, plan: GameweekPlan): Promise<{
    avgScore: number;
    captain: { name: string; points: number; scoringBreakdown: any; position: string } | null;
    topUnderperformers: Array<{ name: string; points: number; position: string }>;
    fixtureResults: Array<{ team: string; opponent: string; result: string }>;
    teamSummary: string;
    planWasApplied: boolean;
    recommendedCaptainFollowed: boolean;
    implementationNote: string;
    allPlayers: any[];
  }> {
    try {
      // Use unified snapshot for consistency across all analysis
      const { gameweekSnapshot } = await import('./gameweek-data-snapshot');
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek, false); // Don't need Understat for analysis
      
      console.log(`[PredictionAnalysis] Using snapshot from ${new Date(snapshot.timestamp).toISOString()}`);

      // Fetch gameweek-specific live data for accurate historical player points
      const liveData = await fplApi.getLiveGameweekData(gameweek);
      console.log(`[PredictionAnalysis] Fetched live data for GW${gameweek} with ${liveData.elements?.length || 0} player records`);

      // Extract data from snapshot
      const gameweeks = snapshot.data.gameweeks;
      const gw = gameweeks.find((g: any) => g.id === gameweek);
      const avgScore = gw?.average_entry_score || 0;

      const allPlayers = snapshot.data.players;
      const allTeams = snapshot.data.teams;
      const fixtures = snapshot.data.fixtures;
      
      // Get user's team for this gameweek
      const userTeam = await storage.getTeam(userId, gameweek);
      if (!userTeam) {
        return {
          avgScore,
          captain: null,
          topUnderperformers: [],
          fixtureResults: [],
          teamSummary: 'No team data found for this gameweek',
          planWasApplied: false,
          recommendedCaptainFollowed: false,
          implementationNote: 'No team data available for this gameweek',
          allPlayers,
        };
      }

      // Create lookup map for live gameweek data (player_id -> full element data)
      const livePlayerData = new Map<number, any>();
      if (liveData.elements) {
        for (const element of liveData.elements) {
          livePlayerData.set(element.id, element);
        }
      }

      // Store captain info for later use
      const captainInfo = userTeam.players.find((p: any) => p.is_captain);
      
      // Fetch FPL picks data to get automatic substitutions
      const settings = await storage.getUserSettings(userId);
      const managerId = settings?.manager_id;
      
      let autoSubPlayerIds: Set<number> | null = null;
      if (managerId) {
        try {
          const picksData = await fplApi.getManagerPicks(managerId, gameweek);
          // automatic_subs is an array of {element_in, element_out, entry, event} objects
          if (picksData.automatic_subs && Array.isArray(picksData.automatic_subs)) {
            autoSubPlayerIds = new Set(picksData.automatic_subs.map((sub: any) => sub.element_in));
          } else {
            autoSubPlayerIds = new Set(); // Empty array = no auto-subs
          }
          console.log(`[PredictionAnalysis] GW${gameweek} auto-subs from API: ${JSON.stringify(Array.from(autoSubPlayerIds))}`);
        } catch (error) {
          console.error(`[PredictionAnalysis] Failed to fetch picks for manager ${managerId}, GW${gameweek}. Falling back to eventPoints heuristic:`, error);
          autoSubPlayerIds = null; // null = use fallback
        }
      } else {
        console.warn(`[PredictionAnalysis] No manager_id found for user ${userId}. Falling back to eventPoints heuristic.`);
      }
      
      // Get all players who actually played
      // Include: Starting XI (positions 1-11) OR bench players who were ACTUALLY auto-subbed
      const teamPerformance = userTeam.players
        .filter((p: any) => p.player_id) // Filter out null player_ids
        .map((p: any) => {
          const playerData = allPlayers.find((pl: any) => pl.id === p.player_id);
          const liveElement = livePlayerData.get(p.player_id);
          const eventPoints = liveElement?.stats.total_points || 0;
          
          // Parse the explain array to get actual scoring breakdown
          // AGGREGATE across all fixtures (important for double gameweeks)
          const scoringBreakdown = liveElement?.explain && liveElement.explain.length > 0
            ? this.aggregateExplainArray(liveElement.explain)
            : {};
          
          // Check if this bench player was actually auto-subbed
          // If autoSubPlayerIds is null (API unavailable), fall back to eventPoints heuristic
          const wasAutoSubbed = autoSubPlayerIds !== null 
            ? autoSubPlayerIds.has(p.player_id)
            : (p.position > 11 && eventPoints > 0); // Fallback: assume any bench player with points was auto-subbed
          
          return {
            name: playerData?.web_name || 'Unknown',
            points: eventPoints,
            position: ['GKP', 'DEF', 'MID', 'FWD'][(playerData?.element_type || 1) - 1] || 'Unknown',
            isCaptain: p.is_captain,
            lineupPosition: p.position, // 1-15 lineup slot
            playedFromBench: wasAutoSubbed, // TRUE auto-sub check (or fallback heuristic)
            player_id: p.player_id, // Store for filtering
            // Use the actual scoring breakdown from the explain array
            scoringBreakdown,
            // Keep basic stats for reference
            minutes: liveElement?.stats.minutes || 0,
            goalsScored: liveElement?.stats.goals_scored || 0,
            assists: liveElement?.stats.assists || 0,
          };
        })
        .filter((p: any) => 
          p.lineupPosition <= 11 || // Starting XI
          p.playedFromBench // Only bench players who were auto-subbed (verified or heuristic)
        );
      
      // Get captain info from teamPerformance (which already has scoringBreakdown from FPL API)
      let captain: { name: string; points: number; scoringBreakdown: any; position: string } | null = null;
      const captainPlayer = teamPerformance.find((p: any) => p.isCaptain);
      if (captainPlayer) {
        console.log(`[PredictionAnalysis] Captain player found: ${captainPlayer.name} with ${Object.keys(captainPlayer.scoringBreakdown).length} breakdown items`);
        console.log(`[PredictionAnalysis] Captain object created: ${captainPlayer.name} ${captainPlayer.points} pts, breakdown: ${JSON.stringify(captainPlayer.scoringBreakdown)}`);
        captain = {
          name: captainPlayer.name,
          points: captainPlayer.points * 2, // Captain gets double points
          scoringBreakdown: captainPlayer.scoringBreakdown,
          position: captainPlayer.position,
        };
      }
      
      // Find underperformers (players who scored 2 or fewer points)
      // ONLY analyze starting XI (positions 1-11), NOT bench substitutes
      const underperformers = teamPerformance
        .filter((p: any) => p.lineupPosition <= 11) // Starting XI only
        .filter((p: any) => p.points <= 2)
        .sort((a: any, b: any) => a.points - b.points)
        .slice(0, 5);
      
      // Debug: Log underperformers breakdown
      console.log(`[PredictionAnalysis] Found ${underperformers.length} underperformers for GW${gameweek}:`);
      for (const player of underperformers) {
        console.log(`[PredictionAnalysis]   - ${player.name}: ${player.points} pts, breakdown: ${JSON.stringify(player.scoringBreakdown)}`);
      }

      // Get relevant fixtures for teams in squad (players who actually played)
      const relevantTeamIds = new Set(
        teamPerformance
          .map((p: any) => {
            const playerData = allPlayers.find((pl: any) => pl.name === p.name);
            return playerData?.team;
          })
          .filter(Boolean)
      );

      const gwFixtures = fixtures
        .filter((f: any) => f.event === gameweek && f.finished)
        .filter((f: any) => 
          relevantTeamIds.has(f.team_h) || relevantTeamIds.has(f.team_a)
        )
        .slice(0, 8) // Limit to 8 fixtures
        .map((f: any) => {
          const homeTeam = allTeams.find((t: any) => t.id === f.team_h);
          const awayTeam = allTeams.find((t: any) => t.id === f.team_a);
          return {
            team: homeTeam?.name || 'Unknown',
            opponent: awayTeam?.name || 'Unknown',
            result: `${f.team_h_score}-${f.team_a_score}`,
          };
        });

      // Calculate total points
      const totalPoints = teamPerformance.reduce((sum: number, p: any) => {
        return sum + (p.isCaptain ? p.points * 2 : p.points);
      }, 0);

      const teamSummary = `${teamPerformance.length} players who played, ${totalPoints} total points`;

      // Check if plan was applied
      const planWasApplied = plan.status === 'applied' && plan.appliedAt !== null;
      
      // Check if recommended captain was followed
      const actualCaptainId = captainInfo?.player_id;
      const recommendedCaptainId = plan.captainId;
      const recommendedCaptainFollowed = actualCaptainId === recommendedCaptainId;
      
      // Build implementation note
      let implementationNote = '';
      if (!planWasApplied) {
        implementationNote = 'Plan was NOT applied - user did not implement these recommendations.';
      } else if (!recommendedCaptainFollowed && recommendedCaptainId) {
        const recommendedCaptainPlayer = allPlayers.find((p: any) => p.id === recommendedCaptainId);
        const recommendedCaptainName = recommendedCaptainPlayer?.web_name || 'Unknown';
        implementationNote = `Plan applied, but captain choice differed: Recommended ${recommendedCaptainName}, actual ${captain?.name || 'Unknown'}.`;
      } else {
        implementationNote = 'Plan was fully applied as recommended.';
      }

      return {
        avgScore,
        captain,
        topUnderperformers: underperformers,
        fixtureResults: gwFixtures,
        teamSummary,
        planWasApplied,
        recommendedCaptainFollowed,
        implementationNote,
        allPlayers,
      };
    } catch (error) {
      console.error(`[PredictionAnalysis] Error fetching gameweek context:`, error);
      return {
        avgScore: 0,
        captain: null,
        topUnderperformers: [],
        fixtureResults: [],
        teamSummary: 'Unable to load team data',
        planWasApplied: false,
        recommendedCaptainFollowed: false,
        implementationNote: 'Unable to verify implementation status',
        allPlayers: [],
      };
    }
  }

  /**
   * Generate AI analysis of why prediction missed
   */
  private async generateAIAnalysis(
    plan: GameweekPlan,
    context: any,
    error: number
  ): Promise<string> {
    const bias = plan.predictedPoints - plan.actualPointsWithAI!;
    const biasDirection = bias > 0 ? 'over-predicted' : 'under-predicted';

    // Build specific context with real data
    let captainText = 'Captain: Unknown';
    if (context.captain) {
      // Use comprehensive formatter to handle ALL identifiers
      const breakdown = this.formatScoringBreakdown(context.captain.scoringBreakdown);
      
      const basePoints = context.captain.points / 2;
      const breakdownText = breakdown.join(', ');
      const totalPts = breakdown.length > 0 ? `= ${basePoints} pts` : '';
      captainText = `Captain: ${context.captain.name} scored ${context.captain.points} pts (with captaincy) [base points: ${breakdownText} ${totalPts}]`;
      console.log(`[PredictionAnalysis] Captain breakdown for GW${plan.gameweek}: ${captainText}`);
    }

    const underperformersText = context.topUnderperformers.length > 0
      ? `Players who scored ≤2 pts (with exact breakdown):\n${context.topUnderperformers.map((p: any) => {
          // Use comprehensive formatter to handle ALL identifiers
          const breakdown = this.formatScoringBreakdown(p.scoringBreakdown);
          return `  - ${p.name} (${p.position}): ${p.points} pts [${breakdown.join(', ')}]`;
        }).join('\n')}`
      : 'No major underperformers';

    const fixturesText = context.fixtureResults.length > 0
      ? `Key fixtures:\n${context.fixtureResults.map((f: any) => `  - ${f.team} vs ${f.opponent}: ${f.result}`).join('\n')}`
      : 'Fixtures data unavailable';

    // Build captain comparison text if user chose a different captain
    let captainComparisonText = '';
    if (!context.recommendedCaptainFollowed && plan.captainId) {
      const recommendedCaptainData = context.allPlayers?.find((p: any) => p.id === plan.captainId);
      const recommendedCaptainName = recommendedCaptainData?.web_name || 'Unknown';
      captainComparisonText = `
⚠️ CAPTAIN CHOICE DIFFERS FROM RECOMMENDATION:
- AI Recommended Captain: ${recommendedCaptainName}
- User's Actual Captain: ${context.captain?.name || 'Unknown'}
`;
    }

    const prompt = `Analyze why this FPL prediction missed the mark. Focus ONLY on explaining prediction errors for the USER'S ACTUAL TEAM CHOICES.

IMPORTANT: This analysis is based on what the user ACTUALLY picked, not what the AI recommended.

PREDICTION vs REALITY:
- Gameweek: ${plan.gameweek}
- Predicted: ${plan.predictedPoints} pts → Actual: ${plan.actualPointsWithAI} pts
- Difference: ${error} pts (${biasDirection} by ${Math.abs(bias)} pts)
- League Average: ${context.avgScore} pts
${captainComparisonText}
WHAT THE USER'S ACTUAL TEAM DID:
${captainText}
${context.teamSummary}

${underperformersText}

${fixturesText}

YOUR TASK: In 2-4 bullet points, explain WHY the USER'S ACTUAL TEAM performance differed from predictions using ONLY definitive statements based on exact data.
${!context.recommendedCaptainFollowed && plan.captainId ? '\n⚠️ IMPORTANT: The user picked a DIFFERENT captain than recommended. Mention this in your first bullet point and explain how it affected the score.' : ''}

REQUIRED FORMAT - Use these patterns:
1. Start with player name and exact score with breakdown: "Player scored X pts [breakdown]"
2. State exact point impacts: "yellow card cost him 1 point", "no clean sheet cost him 4 points"
3. For defenders/goalkeepers, use the EXACT DATA from scoringBreakdown to determine what happened:
   - If "goals_conceded" appears: Team conceded X goals (use exact value from breakdown)
   - If NO "goals_conceded" AND player has 60+ minutes: Team kept a clean sheet
   - If NO "goals_conceded" AND player has <60 minutes: Cannot state team conceded - player simply didn't reach 60-min threshold for clean sheet points
4. Use match results with exact scores: "Team vs Opponent: X-Y"
5. State exact prediction differences: "expected X pts but scored Y pts"
6. ${!context.recommendedCaptainFollowed && context.planWasApplied ? 'Note: Different captain was chosen than recommended' : 'Focus on actual performance vs prediction'}

FPL SCORING RULES (2025/26):
• Minutes: 60+ mins = +2 pts, 1-59 mins = +1 pt
• Goals: FWD +4, MID +5, DEF +6
• Assists: +3 pts
• Clean Sheet: GKP/DEF +4 pts, MID +1 pt (requires BOTH 60+ mins AND no goals conceded)
• Defensive Contribution (NEW): DEF 10+ CBITs = +2 pts, MID/FWD 12+ CBIRTs = +2 pts
• Yellow Card: -1 pt
• Red Card: -3 pts
• Bonus: +1/+2/+3 pts
• Saves: GKP +1 pt per 3 saves

CRITICAL CLEAN SHEET LOGIC:
• If scoringBreakdown contains "goals_conceded": Team conceded goals (state exact number)
• If scoringBreakdown has NO "goals_conceded" entry AND player played 60+ minutes: Team kept a clean sheet
• If scoringBreakdown has NO "goals_conceded" entry AND player played <60 minutes: Player missed clean sheet points due to insufficient playing time (team may or may not have conceded - don't assume!)

WRITE ONLY DEFINITIVE STATEMENTS:
• Never use: "likely", "probably", "may have", "might have", "appears to", "seems to", "could have", "would have", "potentially", "possibly"
• Always include exact point values for every factor
• Use the exact point breakdown provided [90 mins: +2, Def: +2, 1YC: -1, etc.]
• For missing clean sheets DUE TO GOALS CONCEDED: state "no clean sheet cost him 4 points" (DEF/GKP)
• For missing clean sheets DUE TO <60 MINUTES: state "missed clean sheet points due to insufficient playing time" (DEF/GKP)
• For yellow cards: always state "yellow card cost him 1 point"
• "Def: +2" means defensive contribution bonus (10+ defensive actions for DEF, 12+ for MID/FWD)

CORRECT EXAMPLES (copy these patterns):
"Leno scored 2 pts [90 mins: +2, 2 GC: -1]. Fulham conceded 2 goals, no clean sheet cost him 4 points. The prediction overestimated by 4 points, expecting a clean sheet."

"Cucurella scored 1 pt [90 mins: +2, 2 GC: -1, 1YC: -1]. Chelsea conceded 2 goals, no clean sheet cost him 4 points, and the yellow card cost him 1 point. The prediction overestimated by 5 points."

"Semenyo (captain) scored 6 pts [90 mins: +2, 1G: +4]. The prediction overestimated by 6 points, expecting 2 goal involvements (12 pts) but only 1 goal involvement (6 pts) was delivered."

"Saliba scored 2 pts [90 mins: +2, 1 GC: -1]. Arsenal conceded 1 goal, no clean sheet cost him 4 points. The prediction overestimated by 5 points, expecting a clean sheet."

"Mitoma scored 1 pt [45 mins: +1]. Subbed off at halftime (45 minutes), missing the 60-minute threshold for +2 appearance points. He also missed clean sheet points (+4) due to insufficient playing time."

Format as bullet points starting with "• ". Max 4 bullets.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a precise FPL data analyst. You ONLY make definitive statements based on exact data. You NEVER use speculation words like "likely", "probably", "may have", or "could have". Every statement must be a provable fact from the provided data. If you use any banned speculation words, your analysis fails. Be factual, direct, and educational.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.1, // Extremely low temperature for purely factual analysis
        max_tokens: 400,
      });

      const analysis = response.choices[0]?.message?.content || 'Unable to generate analysis';
      return analysis.trim();
    } catch (error) {
      console.error(`[PredictionAnalysis] AI analysis failed:`, error);
      return `• Prediction missed by ${error} pts\n• ${biasDirection} by ${Math.abs(bias)} pts\n• Analysis unavailable due to error`;
    }
  }

  /**
   * Batch analyze all completed gameweeks for a user
   */
  async analyzeAllCompletedGameweeks(userId: number, options?: { gameweek?: number; forceRegenerate?: boolean }): Promise<PredictionFailureAnalysis[]> {
    const { gameweek: targetGameweek, forceRegenerate = false } = options || {};
    
    if (targetGameweek) {
      console.log(`[PredictionAnalysis] Analyzing specific gameweek ${targetGameweek} for user ${userId} (force=${forceRegenerate})`);
    } else {
      console.log(`[PredictionAnalysis] Analyzing all completed gameweeks for user ${userId}`);
    }

    const allPlans = await storage.getGameweekPlansByUser(userId);
    
    // Filter to plans with both predicted and actual points
    let completedPlans = allPlans.filter(
      p => p.predictedPoints !== null && p.actualPointsWithAI !== null
    );

    // Filter to specific gameweek if requested
    if (targetGameweek) {
      completedPlans = completedPlans.filter(p => p.gameweek === targetGameweek);
      if (completedPlans.length === 0) {
        console.log(`[PredictionAnalysis] No completed plan found for GW${targetGameweek}`);
        return [];
      }
    }

    // Sort by gameweek to analyze oldest first
    completedPlans.sort((a, b) => a.gameweek - b.gameweek);

    const results: PredictionFailureAnalysis[] = [];

    for (const plan of completedPlans) {
      // Skip if already analyzed (unless forcing regeneration)
      if (plan.predictionAnalysis && !forceRegenerate) {
        console.log(`[PredictionAnalysis] Plan ${plan.id} (GW${plan.gameweek}) already analyzed`);
        continue;
      }

      try {
        const result = await this.analyzePredictionFailure(plan.id);
        results.push(result);
      } catch (error) {
        console.error(`[PredictionAnalysis] Error analyzing plan ${plan.id}:`, error);
      }
    }

    console.log(`[PredictionAnalysis] Analyzed ${results.length} gameweeks`);
    return results;
  }
}

export const predictionAnalysisService = new PredictionAnalysisService();
