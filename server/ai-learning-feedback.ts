import { storage } from './storage';
import { fplApi } from './fpl-api';
import type { GameweekPlan } from '../shared/schema';

interface LearningInsight {
  gameweek: number;
  category: 'captain' | 'transfer' | 'chip' | 'general';
  mistake: string;
  impact: number;
  lesson: string;
}

interface AILearningContext {
  totalGameweeksAnalyzed: number;
  overallPerformance: {
    totalPointsImpact: number;
    averageImpact: number;
    successRate: number;
  };
  predictionAccuracy: {
    totalGameweeks: number;
    meanAbsoluteError: number;
    overallBias: number;
    recentMisses: Array<{
      gameweek: number;
      predicted: number;
      actual: number;
      error: number;
    }>;
  };
  recentMistakes: LearningInsight[];
  captainPatterns: {
    successfulPicks: string[];
    failedPicks: string[];
  };
  transferPatterns: {
    goodTransfers: string[];
    badTransfers: string[];
  };
  keyLessons: string[];
}

export class AILearningFeedbackService {
  /**
   * Generate learning context from past AI performance to improve future decisions
   */
  async generateLearningContext(userId: number): Promise<AILearningContext> {
    console.log(`[AILearning] Generating learning context for user ${userId}`);

    // Get all analyzed gameweek plans
    const allPlans = await storage.getGameweekPlansByUser(userId);
    const analyzedPlans = allPlans.filter(
      p => p.analysisCompletedAt && p.actualPointsWithAI !== null && p.actualPointsWithoutAI !== null
    );

    // Get prediction accuracy data (plans with actual points tracked)
    const plansWithPredictions = allPlans.filter(
      p => p.predictedPoints !== null && p.actualPointsWithAI !== null
    );

    if (analyzedPlans.length === 0 && plansWithPredictions.length === 0) {
      console.log(`[AILearning] No analyzed gameweeks found for user ${userId}`);
      return this.getEmptyContext();
    }

    // Calculate overall performance
    const totalPointsImpact = analyzedPlans.reduce((sum, p) => sum + (p.pointsDelta || 0), 0);
    const averageImpact = analyzedPlans.length > 0 ? totalPointsImpact / analyzedPlans.length : 0;
    const successfulGameweeks = analyzedPlans.filter(p => (p.pointsDelta || 0) > 0).length;
    const successRate = analyzedPlans.length > 0 ? (successfulGameweeks / analyzedPlans.length) * 100 : 0;

    // Calculate prediction accuracy metrics
    const predictionAccuracy = this.calculatePredictionAccuracy(plansWithPredictions);

    // Identify recent mistakes (last 5 gameweeks where AI hurt performance)
    const recentMistakes = await this.identifyRecentMistakes(analyzedPlans.slice(-10), userId);

    // Analyze captain decision patterns
    const captainPatterns = await this.analyzeCaptainPatterns(analyzedPlans, userId);

    // Analyze transfer patterns
    const transferPatterns = await this.analyzeTransferPatterns(analyzedPlans, userId);

    // Generate key lessons from the data
    const keyLessons = this.generateKeyLessons(recentMistakes, captainPatterns, transferPatterns, averageImpact);

    console.log(`[AILearning] Context generated: ${analyzedPlans.length} GWs analyzed, avg impact: ${averageImpact.toFixed(1)}, success rate: ${successRate.toFixed(1)}%, prediction MAE: ${predictionAccuracy.meanAbsoluteError.toFixed(1)}`);

    return {
      totalGameweeksAnalyzed: analyzedPlans.length,
      overallPerformance: {
        totalPointsImpact,
        averageImpact,
        successRate,
      },
      predictionAccuracy,
      recentMistakes,
      captainPatterns,
      transferPatterns,
      keyLessons,
    };
  }

  /**
   * Calculate prediction accuracy metrics from plans with tracked predictions
   */
  private calculatePredictionAccuracy(plansWithPredictions: GameweekPlan[]): {
    totalGameweeks: number;
    meanAbsoluteError: number;
    overallBias: number;
    recentMisses: Array<{
      gameweek: number;
      predicted: number;
      actual: number;
      error: number;
    }>;
  } {
    if (plansWithPredictions.length === 0) {
      return {
        totalGameweeks: 0,
        meanAbsoluteError: 0,
        overallBias: 0,
        recentMisses: [],
      };
    }

    // Calculate MAE and bias
    let totalError = 0;
    let totalBias = 0;
    const recentMisses: Array<{
      gameweek: number;
      predicted: number;
      actual: number;
      error: number;
    }> = [];

    for (const plan of plansWithPredictions) {
      const predicted = plan.predictedPoints!;
      const actual = plan.actualPointsWithAI!;
      const error = Math.abs(predicted - actual);
      const bias = predicted - actual;

      totalError += error;
      totalBias += bias;

      // Track recent misses (error > 10 pts)
      if (error > 10) {
        recentMisses.push({
          gameweek: plan.gameweek,
          predicted,
          actual,
          error,
        });
      }
    }

    // Sort recent misses by error (worst first) and take top 5
    recentMisses.sort((a, b) => b.error - a.error);
    const topMisses = recentMisses.slice(0, 5);

    return {
      totalGameweeks: plansWithPredictions.length,
      meanAbsoluteError: totalError / plansWithPredictions.length,
      overallBias: totalBias / plansWithPredictions.length,
      recentMisses: topMisses,
    };
  }

  /**
   * Identify specific mistakes from recent gameweeks
   */
  private async identifyRecentMistakes(recentPlans: GameweekPlan[], userId: number): Promise<LearningInsight[]> {
    const insights: LearningInsight[] = [];
    const allPlayers = await fplApi.getPlayers();
    const playersMap = new Map(allPlayers.map(p => [p.id, p]));

    for (const plan of recentPlans) {
      if (!plan.analysisCompletedAt || !plan.originalTeamSnapshot) continue;

      const impact = plan.pointsDelta || 0;
      
      // Only focus on mistakes (negative impact)
      if (impact >= 0) continue;

      // Captain mistake
      if (plan.captainId !== plan.originalTeamSnapshot.captain_id) {
        const originalCaptain = playersMap.get(plan.originalTeamSnapshot.captain_id);
        const aiCaptain = playersMap.get(plan.captainId!);

        if (originalCaptain && aiCaptain) {
          insights.push({
            gameweek: plan.gameweek,
            category: 'captain',
            mistake: `Recommended ${aiCaptain.web_name} as captain instead of keeping ${originalCaptain.web_name}`,
            impact,
            lesson: `${originalCaptain.web_name} outperformed ${aiCaptain.web_name} in GW${plan.gameweek}. Consider ${originalCaptain.team} players' recent form and fixtures more carefully.`,
          });
        }
      }

      // Transfer mistakes (if transfers were made and overall impact was negative)
      if (plan.transfers.length > 0 && impact < -4) {
        const transferInNames = plan.transfers
          .map(t => playersMap.get(t.player_in_id)?.web_name)
          .filter(Boolean)
          .join(', ');

        insights.push({
          gameweek: plan.gameweek,
          category: 'transfer',
          mistake: `Transfers in GW${plan.gameweek} (brought in: ${transferInNames}) resulted in ${impact} points loss`,
          impact,
          lesson: `The transfers made in GW${plan.gameweek} did not pay off. Be more conservative with transfers and prioritize long-term value over short-term fixtures.`,
        });
      }
    }

    // Sort by impact (most negative first) and return top 5
    return insights.sort((a, b) => a.impact - b.impact).slice(0, 5);
  }

  /**
   * Analyze patterns in captain decisions
   */
  private async analyzeCaptainPatterns(analyzedPlans: GameweekPlan[], userId: number): Promise<{
    successfulPicks: string[];
    failedPicks: string[];
  }> {
    const allPlayers = await fplApi.getPlayers();
    const playersMap = new Map(allPlayers.map(p => [p.id, p]));

    const captainResults = new Map<number, { successes: number; failures: number; totalImpact: number }>();

    for (const plan of analyzedPlans) {
      if (!plan.captainId || !plan.originalTeamSnapshot) continue;

      const captainId = plan.captainId;
      const impact = plan.pointsDelta || 0;
      
      if (!captainResults.has(captainId)) {
        captainResults.set(captainId, { successes: 0, failures: 0, totalImpact: 0 });
      }

      const result = captainResults.get(captainId)!;
      result.totalImpact += impact;

      if (impact > 0) {
        result.successes++;
      } else if (impact < 0) {
        result.failures++;
      }
    }

    // Identify successful picks (positive total impact)
    const successfulPicks = Array.from(captainResults.entries())
      .filter(([_, result]) => result.totalImpact > 0 && result.successes > result.failures)
      .sort((a, b) => b[1].totalImpact - a[1].totalImpact)
      .slice(0, 3)
      .map(([playerId]) => playersMap.get(playerId)?.web_name || `Player ${playerId}`);

    // Identify failed picks (negative total impact)
    const failedPicks = Array.from(captainResults.entries())
      .filter(([_, result]) => result.totalImpact < 0 || result.failures > result.successes)
      .sort((a, b) => a[1].totalImpact - b[1].totalImpact)
      .slice(0, 3)
      .map(([playerId]) => playersMap.get(playerId)?.web_name || `Player ${playerId}`);

    return { successfulPicks, failedPicks };
  }

  /**
   * Analyze patterns in transfer decisions
   */
  private async analyzeTransferPatterns(analyzedPlans: GameweekPlan[], userId: number): Promise<{
    goodTransfers: string[];
    badTransfers: string[];
  }> {
    const allPlayers = await fplApi.getPlayers();
    const playersMap = new Map(allPlayers.map(p => [p.id, p]));

    const goodTransfers: string[] = [];
    const badTransfers: string[] = [];

    for (const plan of analyzedPlans) {
      if (plan.transfers.length === 0) continue;

      const impact = plan.pointsDelta || 0;

      for (const transfer of plan.transfers) {
        const playerIn = playersMap.get(transfer.player_in_id)?.web_name;
        const playerOut = playersMap.get(transfer.player_out_id)?.web_name;

        if (!playerIn || !playerOut) continue;

        const transferDesc = `${playerOut} → ${playerIn} (GW${plan.gameweek})`;

        if (impact > 0) {
          goodTransfers.push(transferDesc);
        } else if (impact < -4) {
          badTransfers.push(transferDesc);
        }
      }
    }

    return {
      goodTransfers: goodTransfers.slice(0, 5),
      badTransfers: badTransfers.slice(0, 5),
    };
  }

  /**
   * Generate actionable lessons from the analysis
   */
  private generateKeyLessons(
    recentMistakes: LearningInsight[],
    captainPatterns: { successfulPicks: string[]; failedPicks: string[] },
    transferPatterns: { goodTransfers: string[]; badTransfers: string[] },
    averageImpact: number
  ): string[] {
    const lessons: string[] = [];

    // Overall performance lesson
    if (averageImpact < -2) {
      lessons.push('CRITICAL: AI recommendations are currently hurting performance. Be more conservative and prioritize safer, high-ownership picks.');
    } else if (averageImpact > 5) {
      lessons.push('AI recommendations are performing well. Continue with current strategy.');
    }

    // Captain lessons
    if (captainPatterns.failedPicks.length > 0) {
      lessons.push(`Avoid captaining: ${captainPatterns.failedPicks.join(', ')}. These players have consistently underperformed AI expectations.`);
    }

    if (captainPatterns.successfulPicks.length > 0) {
      lessons.push(`Successful captain picks: ${captainPatterns.successfulPicks.join(', ')}. Prioritize these players when fixtures align.`);
    }

    // Transfer lessons
    if (transferPatterns.badTransfers.length > 0) {
      lessons.push(`Learn from failed transfers: ${transferPatterns.badTransfers.slice(0, 2).join('; ')}. Consider if similar patterns are repeating.`);
    }

    // Specific mistake lessons
    const captainMistakes = recentMistakes.filter(m => m.category === 'captain');
    if (captainMistakes.length > 0) {
      const worstMistake = captainMistakes[0];
      lessons.push(`LESSON FROM GW${worstMistake.gameweek}: ${worstMistake.lesson}`);
    }

    // If no lessons yet, add a generic one
    if (lessons.length === 0) {
      lessons.push('Continue monitoring AI performance and adjusting strategy based on outcomes.');
    }

    return lessons;
  }

  /**
   * Format learning context for inclusion in AI prompt
   */
  formatForPrompt(context: AILearningContext): string {
    let prompt = '\n\n=== AI PERFORMANCE HISTORY & LEARNING ===\n\n';

    // Overall stats
    prompt += `You have been analyzed across ${context.totalGameweeksAnalyzed} gameweeks.\n`;
    prompt += `Overall Impact: ${context.overallPerformance.totalPointsImpact >= 0 ? '+' : ''}${context.overallPerformance.totalPointsImpact.toFixed(0)} points total (avg: ${context.overallPerformance.averageImpact >= 0 ? '+' : ''}${context.overallPerformance.averageImpact.toFixed(1)} per GW)\n`;
    prompt += `Success Rate: ${context.overallPerformance.successRate.toFixed(0)}% of gameweeks had positive impact\n\n`;

    // Prediction accuracy stats
    if (context.predictionAccuracy.totalGameweeks > 0) {
      prompt += '**PREDICTION ACCURACY ANALYSIS:**\n';
      prompt += `Tracked predictions: ${context.predictionAccuracy.totalGameweeks} gameweeks\n`;
      prompt += `Average prediction error: ${context.predictionAccuracy.meanAbsoluteError.toFixed(1)} points per gameweek\n`;
      prompt += `Prediction bias: ${context.predictionAccuracy.overallBias >= 0 ? '+' : ''}${context.predictionAccuracy.overallBias.toFixed(1)} points (${context.predictionAccuracy.overallBias > 0 ? 'OVER-PREDICTING' : context.predictionAccuracy.overallBias < 0 ? 'UNDER-PREDICTING' : 'NEUTRAL'})\n`;
      
      if (context.predictionAccuracy.recentMisses.length > 0) {
        prompt += '\n**RECENT SIGNIFICANT PREDICTION FAILURES (error >10 pts):**\n';
        for (const miss of context.predictionAccuracy.recentMisses) {
          prompt += `- GW${miss.gameweek}: Predicted ${miss.predicted} pts, Actual ${miss.actual} pts (±${miss.error} pts error)\n`;
        }
        prompt += '\n';
      }

      // Critical warning if over-predicting significantly
      if (context.predictionAccuracy.overallBias > 10) {
        prompt += `⚠️ CRITICAL: You are SEVERELY OVER-PREDICTING by an average of ${context.predictionAccuracy.overallBias.toFixed(1)} points per gameweek. You MUST:\n`;
        prompt += '1. Apply a conservative bias correction to all predictions\n';
        prompt += '2. Be more realistic about captain points (reduce captain multiplier expectations)\n';
        prompt += '3. Account for rotation risk, especially in defense\n';
        prompt += '4. Reduce points expectations for players with tough fixtures\n\n';
      } else if (context.predictionAccuracy.overallBias > 5) {
        prompt += `⚠️ WARNING: You are over-predicting by ${context.predictionAccuracy.overallBias.toFixed(1)} points per gameweek. Be more conservative in your predictions.\n\n`;
      }
    }

    // Recent mistakes
    if (context.recentMistakes.length > 0) {
      prompt += '**CRITICAL LESSONS FROM RECENT MISTAKES:**\n';
      for (const mistake of context.recentMistakes) {
        prompt += `- GW${mistake.gameweek} (${mistake.impact} pts): ${mistake.mistake}\n`;
        prompt += `  → ${mistake.lesson}\n`;
      }
      prompt += '\n';
    }

    // Key lessons
    if (context.keyLessons.length > 0) {
      prompt += '**KEY LESSONS TO APPLY:**\n';
      for (const lesson of context.keyLessons) {
        prompt += `- ${lesson}\n`;
      }
      prompt += '\n';
    }

    // Captain patterns
    if (context.captainPatterns.failedPicks.length > 0) {
      prompt += `**Captains to avoid** (historical failures): ${context.captainPatterns.failedPicks.join(', ')}\n`;
    }
    if (context.captainPatterns.successfulPicks.length > 0) {
      prompt += `**Successful past captains**: ${context.captainPatterns.successfulPicks.join(', ')}\n`;
    }

    prompt += '\n**INSTRUCTIONS:** Review this historical performance data carefully. Learn from past mistakes and adjust your recommendations accordingly. If you previously recommended a player who underperformed, explain why this time is different or choose someone else.\n';

    return prompt;
  }

  private getEmptyContext(): AILearningContext {
    return {
      totalGameweeksAnalyzed: 0,
      overallPerformance: {
        totalPointsImpact: 0,
        averageImpact: 0,
        successRate: 0,
      },
      predictionAccuracy: {
        totalGameweeks: 0,
        meanAbsoluteError: 0,
        overallBias: 0,
        recentMisses: [],
      },
      recentMistakes: [],
      captainPatterns: {
        successfulPicks: [],
        failedPicks: [],
      },
      transferPatterns: {
        goodTransfers: [],
        badTransfers: [],
      },
      keyLessons: ['No historical data available yet. Make recommendations based on current data and best practices.'],
    };
  }
}

export const aiLearningFeedback = new AILearningFeedbackService();
