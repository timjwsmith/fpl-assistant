import { storage } from './storage';
import { fplApi } from './fpl-api';
import type { GameweekPlan } from '../shared/schema';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

    // Fetch gameweek data for context
    const gameweekData = await this.getGameweekContext(plan.gameweek);

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
   * Get gameweek context for AI analysis
   */
  private async getGameweekContext(gameweek: number): Promise<{
    avgScore: number;
  }> {
    try {
      // Get gameweek stats
      const gameweeks = await fplApi.getGameweeks();
      const gw = gameweeks.find((g: any) => g.id === gameweek);
      const avgScore = gw?.average_entry_score || 0;

      return {
        avgScore,
      };
    } catch (error) {
      console.error(`[PredictionAnalysis] Error fetching gameweek context:`, error);
      return {
        avgScore: 0,
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

    const prompt = `You are analyzing why an FPL prediction failed.

PREDICTION DATA:
- Gameweek: ${plan.gameweek}
- Predicted Points: ${plan.predictedPoints} pts
- Actual Points: ${plan.actualPointsWithAI} pts
- Error: ${error} pts (${biasDirection} by ${Math.abs(bias)} pts)
- Average GW Score: ${context.avgScore} pts

GAMEWEEK CONTEXT:
- Average FPL Score: ${context.avgScore} pts

TASK: Explain in 2-4 concise bullet points WHY the prediction missed. Focus on:
1. Captain performance (if captain underperformed significantly)
2. Rotation/bench issues (if key players didn't start)
3. Defensive performance (if clean sheets missed or conceded unexpectedly)
4. Fixture surprises (if easy fixtures didn't deliver or tough fixtures exceeded expectations)
5. Over-optimism bias (if consistently over-predicting)

Format as bullet points starting with "• ". Be specific and data-driven. Max 4 bullets.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: 'You are an FPL prediction analyst. Provide concise, data-driven explanations for prediction failures.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 300,
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
