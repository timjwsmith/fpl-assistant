import { fplApi } from "./fpl-api";
import { storage } from "./storage";
import type { PredictionDB } from "@shared/schema";

interface PlayerActualPoints {
  playerId: number;
  actualPoints: number;
}

interface AccuracyMetrics {
  totalPredictions: number;
  completedPredictions: number;
  averageError: number | null;
  rmse: number | null;
  mae: number | null;
  accuracyRate: number | null;
}

class ActualPointsService {
  async fetchActualGameweekPoints(gameweek: number): Promise<Map<number, number>> {
    try {
      const liveData = await fplApi.getLiveGameweekData(gameweek);
      const pointsMap = new Map<number, number>();

      if (liveData.elements && Array.isArray(liveData.elements)) {
        for (const element of liveData.elements) {
          if (element.id && element.stats && typeof element.stats.total_points === 'number') {
            pointsMap.set(element.id, element.stats.total_points);
          }
        }
      }

      return pointsMap;
    } catch (error) {
      console.error(`Error fetching actual points for gameweek ${gameweek}:`, error);
      return new Map();
    }
  }

  async updateActualPoints(userId: number, gameweek: number): Promise<{ updated: number; errors: string[] }> {
    const errors: string[] = [];
    let updated = 0;

    try {
      const gameweeks = await fplApi.getGameweeks();
      const targetGameweek = gameweeks.find(gw => gw.id === gameweek);

      if (!targetGameweek) {
        return { updated: 0, errors: ['Gameweek not found'] };
      }

      if (!targetGameweek.finished) {
        return { updated: 0, errors: ['Gameweek has not finished yet'] };
      }

      const predictionsToUpdate = await storage.getPredictionsWithoutActuals(userId, gameweek);

      if (predictionsToUpdate.length === 0) {
        return { updated: 0, errors: [] };
      }

      const actualPointsMap = await this.fetchActualGameweekPoints(gameweek);

      for (const prediction of predictionsToUpdate) {
        const actualPoints = actualPointsMap.get(prediction.playerId);

        if (actualPoints !== undefined) {
          try {
            await storage.updateActualPointsByPlayer(
              userId,
              gameweek,
              prediction.playerId,
              actualPoints
            );
            updated++;
          } catch (error) {
            errors.push(`Failed to update prediction for player ${prediction.playerId}: ${error}`);
          }
        } else {
          errors.push(`No actual points found for player ${prediction.playerId}`);
        }
      }

      return { updated, errors };
    } catch (error) {
      console.error('Error updating actual points:', error);
      return { updated, errors: [...errors, `Failed to update: ${error}`] };
    }
  }

  calculateAccuracyMetrics(predictions: PredictionDB[]): AccuracyMetrics {
    const completedPredictions = predictions.filter(p => p.actualPoints !== null);
    const totalPredictions = predictions.length;
    const completedCount = completedPredictions.length;

    if (completedCount === 0) {
      return {
        totalPredictions,
        completedPredictions: 0,
        averageError: null,
        rmse: null,
        mae: null,
        accuracyRate: null,
      };
    }

    let sumSquaredError = 0;
    let sumAbsoluteError = 0;
    let sumError = 0;
    let withinTwoPoints = 0;

    for (const prediction of completedPredictions) {
      const predicted = prediction.predictedPoints;
      const actual = prediction.actualPoints!;
      const error = predicted - actual;
      const absError = Math.abs(error);

      sumSquaredError += error * error;
      sumAbsoluteError += absError;
      sumError += error;

      if (absError <= 2) {
        withinTwoPoints++;
      }
    }

    const averageError = sumError / completedCount;
    const rmse = Math.sqrt(sumSquaredError / completedCount);
    const mae = sumAbsoluteError / completedCount;
    const accuracyRate = (withinTwoPoints / completedCount) * 100;

    return {
      totalPredictions,
      completedPredictions: completedCount,
      averageError: parseFloat(averageError.toFixed(2)),
      rmse: parseFloat(rmse.toFixed(2)),
      mae: parseFloat(mae.toFixed(2)),
      accuracyRate: parseFloat(accuracyRate.toFixed(2)),
    };
  }

  async getPerformanceComparison(userId: number, gameweek: number) {
    try {
      const predictions = await storage.getPredictions(userId, gameweek);
      const allPlayers = await fplApi.getPlayers();
      const playersMap = new Map(allPlayers.map(p => [p.id, p]));

      const predictionDetails = predictions.map(p => {
        const player = playersMap.get(p.playerId);
        const difference = p.actualPoints !== null ? p.predictedPoints - p.actualPoints : null;
        
        let accuracy: number | null = null;
        if (p.actualPoints !== null) {
          const error = Math.abs(p.predictedPoints - p.actualPoints);
          accuracy = p.actualPoints !== 0 
            ? Math.max(0, 100 - (error / Math.abs(p.actualPoints)) * 100)
            : p.predictedPoints === p.actualPoints ? 100 : 0;
          accuracy = parseFloat(accuracy.toFixed(2));
        }

        return {
          playerId: p.playerId,
          playerName: player?.web_name || `Player ${p.playerId}`,
          predictedPoints: p.predictedPoints,
          actualPoints: p.actualPoints,
          difference,
          accuracy,
        };
      });

      const metrics = this.calculateAccuracyMetrics(predictions);

      return {
        gameweek,
        predictions: predictionDetails,
        metrics,
      };
    } catch (error) {
      console.error('Error getting performance comparison:', error);
      throw error;
    }
  }
}

export const actualPointsService = new ActualPointsService();
