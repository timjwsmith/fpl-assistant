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
      // Get gameweek stats
      const gameweeks = await fplApi.getGameweeks();
      const gw = gameweeks.find((g: any) => g.id === gameweek);
      const avgScore = gw?.average_entry_score || 0;

      // Get all players data for this gameweek
      const allPlayers = await fplApi.getPlayers();
      const allTeams = await fplApi.getTeams();
      const fixtures = await fplApi.getFixtures();
      
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
      ? `Players who scored ≤2 pts:\n${context.topUnderperformers.map((p: any) => `  - ${p.name} (${p.position}): ${p.points} pts`).join('\n')}`
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

YOUR TASK: In 2-4 bullet points, explain WHY predictions were inaccurate for the ACTUAL team and decisions used.

CRITICAL RULES:
1. ONLY explain why predictions for actual players were wrong
2. Name specific players, their actual scores, and what happened in their matches
3. Focus on prediction errors, not alternative strategies
4. ${!context.recommendedCaptainFollowed && context.planWasApplied ? 'Note: Different captain was chosen than recommended - this may explain part of the error' : 'Analyze why predicted performance differed from actual'}

NEVER suggest players that weren't in the team or weren't recommended by the AI.
NEVER say "you should have done X" unless the AI specifically recommended X in the original plan.

Examples:
✅ "Semenyo (captain) scored 6 pts in Bournemouth's 3-3 draw. Prediction overestimated his involvement..."
✅ "Mitoma blanked despite Brighton winning because he was subbed early at 58 minutes..."
❌ "You should have captained Haaland" (NEVER suggest alternatives not recommended!)
❌ "Recommendations weren't followed" (NEVER be adversarial!)

Format as bullet points starting with "• ". Max 4 bullets.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are a collaborative FPL analyst helping understand prediction accuracy. Provide SPECIFIC, factual explanations using actual player names, teams, and scores. Focus on learning and improvement, not blame. Be educational and objective.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2, // Lower temperature for more factual analysis
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
