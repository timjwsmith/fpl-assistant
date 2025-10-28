import { storage } from './storage';
import { fplApi } from './fpl-api';
import type { GameweekPlan } from '../shared/schema';
import OpenAI from 'openai';

// Using Replit AI Integrations - provides OpenAI-compatible API access without requiring your own API key
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

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
   * Get gameweek context for AI analysis with REAL data
   */
  private async getGameweekContext(gameweek: number, userId: number, plan: GameweekPlan): Promise<{
    avgScore: number;
    captain: { name: string; points: number } | null;
    topUnderperformers: Array<{ name: string; points: number; position: string }>;
    fixtureResults: Array<{ team: string; opponent: string; result: string }>;
    teamSummary: string;
    planWasApplied: boolean;
    recommendedCaptainFollowed: boolean;
    implementationNote: string;
  }> {
    try {
      // Use unified snapshot for consistency across all analysis
      const { gameweekSnapshot } = await import('./gameweek-data-snapshot');
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek, false); // Don't need Understat for analysis
      
      console.log(`[PredictionAnalysis] Using snapshot from ${new Date(snapshot.timestamp).toISOString()}`);

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
        };
      }

      // Get captain info
      let captain: { name: string; points: number } | null = null;
      const captainInfo = userTeam.players.find((p: any) => p.is_captain);
      if (captainInfo?.player_id) {
        const captainPlayer = allPlayers.find((p: any) => p.id === captainInfo.player_id);
        if (captainPlayer) {
          const gwPoints = captainPlayer.event_points || 0;
          captain = {
            name: captainPlayer.web_name,
            points: gwPoints * 2, // Captain gets double points
          };
        }
      }

      // Get all players who actually played
      // Include: Starting XI (positions 1-11) OR bench players who got minutes (event_points > 0)
      const teamPerformance = userTeam.players
        .filter((p: any) => p.player_id) // Filter out null player_ids
        .map((p: any) => {
          const playerData = allPlayers.find((pl: any) => pl.id === p.player_id);
          const eventPoints = playerData?.event_points || 0;
          return {
            name: playerData?.web_name || 'Unknown',
            points: eventPoints,
            position: ['GKP', 'DEF', 'MID', 'FWD'][(playerData?.element_type || 1) - 1] || 'Unknown',
            isCaptain: p.is_captain,
            lineupPosition: p.position, // 1-15 lineup slot
            playedFromBench: p.position > 11 && eventPoints > 0, // Bench player who came on
            // Detailed stats breakdown for analysis
            minutes: playerData?.minutes || 0,
            goalsScored: playerData?.goals_scored || 0,
            assists: playerData?.assists || 0,
            cleanSheets: playerData?.clean_sheets || 0,
            yellowCards: playerData?.yellow_cards || 0,
            redCards: playerData?.red_cards || 0,
            bonus: playerData?.bonus || 0,
            saves: playerData?.saves || 0,
          };
        })
        .filter((p: any) => 
          p.lineupPosition <= 11 || // Starting XI
          (p.lineupPosition > 11 && p.points > 0) // Bench player who actually played
        );
      
      // Find underperformers (players who scored 2 or fewer points)
      const underperformers = teamPerformance
        .filter((p: any) => p.points <= 2)
        .sort((a: any, b: any) => a.points - b.points)
        .slice(0, 5);

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
    const captainText = context.captain 
      ? `Captain: ${context.captain.name} scored ${context.captain.points} pts (including captaincy)`
      : 'Captain: Unknown';

    const underperformersText = context.topUnderperformers.length > 0
      ? `Players who scored ≤2 pts (with exact breakdown):\n${context.topUnderperformers.map((p: any) => {
          const breakdown: string[] = [];
          if (p.minutes >= 60) breakdown.push(`${p.minutes} mins: +2`);
          else if (p.minutes > 0) breakdown.push(`${p.minutes} mins: +1`);
          if (p.goalsScored > 0) breakdown.push(`${p.goalsScored}G: +${p.goalsScored * (p.position === 'FWD' ? 4 : p.position === 'MID' ? 5 : 6)}`);
          if (p.assists > 0) breakdown.push(`${p.assists}A: +${p.assists * 3}`);
          if (p.cleanSheets > 0 && (p.position === 'GKP' || p.position === 'DEF')) breakdown.push(`CS: +4`);
          if (p.yellowCards > 0) breakdown.push(`${p.yellowCards}YC: -${p.yellowCards}`);
          if (p.redCards > 0) breakdown.push(`${p.redCards}RC: -${p.redCards * 3}`);
          if (p.bonus > 0) breakdown.push(`Bonus: +${p.bonus}`);
          if (p.saves >= 3) breakdown.push(`${p.saves} saves: +${Math.floor(p.saves / 3)}`);
          return `  - ${p.name} (${p.position}): ${p.points} pts [${breakdown.join(', ')}]`;
        }).join('\n')}`
      : 'No major underperformers';

    const fixturesText = context.fixtureResults.length > 0
      ? `Key fixtures:\n${context.fixtureResults.map((f: any) => `  - ${f.team} vs ${f.opponent}: ${f.result}`).join('\n')}`
      : 'Fixtures data unavailable';

    const prompt = `Analyze why this FPL prediction missed the mark. Focus ONLY on explaining prediction errors for the actual decisions that were made.

PREDICTION vs REALITY:
- Gameweek: ${plan.gameweek}
- Predicted: ${plan.predictedPoints} pts → Actual: ${plan.actualPointsWithAI} pts
- Difference: ${error} pts (${biasDirection} by ${Math.abs(bias)} pts)
- League Average: ${context.avgScore} pts

WHAT ACTUALLY HAPPENED:
${captainText}
${context.teamSummary}

${underperformersText}

${fixturesText}

YOUR TASK: In 2-4 bullet points, explain WHY predictions were inaccurate using ONLY definitive statements based on exact data.

CRITICAL RULES - ABSOLUTELY ZERO SPECULATION OR HEDGING:
1. ONLY explain why predictions for actual players were wrong
2. Use the EXACT point breakdown provided [90 mins: +2, 1YC: -1, etc.] - DO NOT speculate
3. STATE EXACT POINT VALUES for every factor: "yellow card cost him 1 point", "no clean sheet cost him 4 points" (DEF/GKP only)
4. For defenders/GKs: NO clean sheet in breakdown = their team DEFINITELY conceded (not "likely", not "probably")
5. Match results show EXACT scores - use them: "Fulham 0-2 Man City" means Leno conceded 2 goals (FACT, not speculation)
6. Name specific players with EXACT breakdown + EXACT match result + EXACT point impacts: "Leno scored 2 pts [90 mins: +2]. Fulham conceded 2 goals (0-2 vs Man City), no clean sheet cost him 4 points."
7. Focus on prediction errors, not alternative strategies
8. ${!context.recommendedCaptainFollowed && context.planWasApplied ? 'Note: Different captain was chosen than recommended - this may explain part of the error' : 'Analyze why predicted performance differed from actual'}

BANNED WORDS & PHRASES - THESE WILL FAIL YOUR ANALYSIS:
❌ "likely" (in any context)
❌ "probably" 
❌ "may have"
❌ "might have"
❌ "appears to"
❌ "seems to"
❌ "could have"
❌ "would have"
❌ "potentially"
❌ "possibly"
❌ "The prediction likely overestimated" → ✅ "The prediction overestimated - he scored X pts [breakdown] versus predicted Y pts"
❌ "likely conceded" → ✅ "conceded 2 goals (seen in 0-2 result)"
❌ "probably didn't get clean sheet" → ✅ "no clean sheet (team conceded 2 goals)"
❌ "may have received yellow card" → ✅ "received 1 yellow card (shown in breakdown) costing him 1 point"
❌ "appears to have underperformed" → ✅ "underperformed - scored X pts instead of predicted Y pts"
❌ "the yellow card cost him" → ✅ "the yellow card cost him 1 point"
❌ "no clean sheet" → ✅ "no clean sheet cost him 4 points" (for DEF/GKP)

NEVER suggest players that weren't in the team or weren't recommended by the AI.
NEVER say "you should have done X" unless the AI specifically recommended X in the original plan.
You have the EXACT data - use it. No hedging, no speculation, no weasel words. DEFINITIVE STATEMENTS ONLY.

Examples of EXACT analysis with EXACT point values (use these patterns):
✅ "Leno scored 2 pts [90 mins: +2]. Fulham conceded 2 goals (0-2 vs Man City), no clean sheet cost him 4 points."
✅ "Cucurella scored 1 pt [90 mins: +2, 1YC: -1]. Chelsea conceded (no clean sheet cost him 4 points), and the yellow card cost him 1 point."
✅ "Semenyo (captain) scored 6 pts [90 mins: +2, 1G: +4] in Bournemouth's 3-3 draw. The prediction overestimated by 6 points - expected 2 goal involvements (12 pts) but only had 1 goal involvement (6 pts)."
✅ "Mitoma scored 1 pt [58 mins: +1]. Subbed off at 58 minutes, missing 1 appearance point (would have been +2 for 60+ mins)."
✅ "Saliba scored 2 pts [90 mins: +2]. Arsenal conceded 1 goal vs Bournemouth, no clean sheet cost him 4 points."
❌ "Leno only got 2 points, likely due to conceding goals" (BANNED WORD "likely" - you can see the exact 0-2 score!)
❌ "The prediction likely overestimated his attacking output, as he did not register a goal or assist" (BANNED PHRASE - state definitively!)
❌ "Cucurella underperformed defensively, likely due to conceding goals or receiving a yellow card" (VAGUE AND BANNED!)
❌ "the yellow card cost him" (MISSING POINT VALUE - say "cost him 1 point")
❌ "no clean sheet" (MISSING POINT VALUE - say "no clean sheet cost him 4 points" for DEF/GKP)
❌ "You should have captained Haaland" (NEVER suggest alternatives not recommended!)

Format as bullet points starting with "• ". Max 4 bullets. REVIEW YOUR OUTPUT BEFORE RESPONDING TO ENSURE ZERO SPECULATION.`;

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
  async analyzeAllCompletedGameweeks(userId: number): Promise<PredictionFailureAnalysis[]> {
    console.log(`[PredictionAnalysis] Analyzing all completed gameweeks for user ${userId}`);

    const allPlans = await storage.getGameweekPlansByUser(userId);
    
    // Filter to plans with both predicted and actual points
    const completedPlans = allPlans.filter(
      p => p.predictedPoints !== null && p.actualPointsWithAI !== null
    );

    // Sort by gameweek to analyze oldest first
    completedPlans.sort((a, b) => a.gameweek - b.gameweek);

    const results: PredictionFailureAnalysis[] = [];

    for (const plan of completedPlans) {
      // Skip if already analyzed
      if (plan.predictionAnalysis) {
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
