import { storage } from './storage';
import { fplApi } from './fpl-api';
import type { GameweekPlan } from '@shared/schema';

interface GameweekAccuracyRecord {
  gameweek: number;
  predictedPoints: number;
  actualPoints: number | null;
  error: number | null;
  status: 'pending' | 'completed' | 'not_found';
  applied: boolean;
}

interface AccuracyMetrics {
  totalGameweeks: number;
  completedGameweeks: number;
  meanAbsoluteError: number | null;
  accuracyWithin5: number | null;
  accuracyWithin10: number | null;
  totalPredictedPoints: number;
  totalActualPoints: number;
  overallBias: number | null;
}

interface PredictionAccuracyHistory {
  history: GameweekAccuracyRecord[];
  metrics: AccuracyMetrics;
}

class PredictionAccuracyService {
  async updateActualPoints(userId: number, gameweek: number): Promise<void> {
    const settings = await storage.getUserSettings(userId);
    if (!settings?.manager_id) {
      throw new Error('Manager ID not configured');
    }

    const managerHistory = await fplApi.getManagerHistory(settings.manager_id);
    
    const gwHistory = managerHistory.current.find((gw: any) => gw.event === gameweek);
    if (!gwHistory) {
      console.log(`[ACCURACY] No history found for GW${gameweek}`);
      return;
    }

    const actualPoints = gwHistory.points - gwHistory.event_transfers_cost;

    const plan = await storage.getGameweekPlan(userId, gameweek);
    if (!plan) {
      console.log(`[ACCURACY] No plan found for GW${gameweek}`);
      return;
    }

    await storage.updateGameweekPlanActualPoints(plan.id, actualPoints);
    console.log(`[ACCURACY] Updated GW${gameweek}: Predicted ${plan.predictedPoints}, Actual ${actualPoints}, Error: ${Math.abs(plan.predictedPoints - actualPoints)}`);
  }

  async getAccuracyHistory(userId: number, startGameweek?: number): Promise<PredictionAccuracyHistory> {
    const plans = await storage.getGameweekPlansByUser(userId);
    
    const filteredPlans = startGameweek 
      ? plans.filter((p: GameweekPlan) => p.gameweek >= startGameweek)
      : plans;

    const latestPlansByGameweek = new Map<number, GameweekPlan>();
    for (const plan of filteredPlans) {
      const existing = latestPlansByGameweek.get(plan.gameweek);
      if (!existing || plan.createdAt > existing.createdAt) {
        latestPlansByGameweek.set(plan.gameweek, plan);
      }
    }

    const uniquePlans = Array.from(latestPlansByGameweek.values());

    const history: GameweekAccuracyRecord[] = uniquePlans.map((plan: GameweekPlan) => {
      const error = plan.actualPointsWithAI !== null 
        ? Math.abs(plan.predictedPoints - plan.actualPointsWithAI)
        : null;

      return {
        gameweek: plan.gameweek,
        predictedPoints: plan.predictedPoints,
        actualPoints: plan.actualPointsWithAI,
        error,
        status: plan.actualPointsWithAI !== null ? 'completed' : 'pending',
        applied: true,
      };
    });

    const completedRecords = history.filter(h => h.status === 'completed' && h.error !== null);
    
    const metrics: AccuracyMetrics = {
      totalGameweeks: history.length,
      completedGameweeks: completedRecords.length,
      meanAbsoluteError: completedRecords.length > 0
        ? completedRecords.reduce((sum, h) => sum + (h.error || 0), 0) / completedRecords.length
        : null,
      accuracyWithin5: completedRecords.length > 0
        ? (completedRecords.filter(h => (h.error || 0) <= 5).length / completedRecords.length) * 100
        : null,
      accuracyWithin10: completedRecords.length > 0
        ? (completedRecords.filter(h => (h.error || 0) <= 10).length / completedRecords.length) * 100
        : null,
      totalPredictedPoints: completedRecords.reduce((sum, h) => sum + h.predictedPoints, 0),
      totalActualPoints: completedRecords.reduce((sum, h) => sum + (h.actualPoints || 0), 0),
      overallBias: completedRecords.length > 0
        ? completedRecords.reduce((sum, h) => sum + (h.predictedPoints - (h.actualPoints || 0)), 0) / completedRecords.length
        : null,
    };

    return {
      history: history.sort((a, b) => a.gameweek - b.gameweek),
      metrics,
    };
  }

  async backfillActualPoints(userId: number, fromGameweek: number, toGameweek: number): Promise<number> {
    const settings = await storage.getUserSettings(userId);
    if (!settings?.manager_id) {
      throw new Error('Manager ID not configured');
    }

    let updated = 0;
    
    for (let gw = fromGameweek; gw <= toGameweek; gw++) {
      try {
        await this.updateActualPoints(userId, gw);
        updated++;
      } catch (error) {
        console.error(`[ACCURACY] Failed to backfill GW${gw}:`, error);
      }
    }

    return updated;
  }
}

export const predictionAccuracyService = new PredictionAccuracyService();
