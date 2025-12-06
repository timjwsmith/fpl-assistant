import { storage } from "./storage";
import { fplApi } from "./fpl-api";
import { calibrationService } from "./calibration-service";
import type { FPLPlayer, PredictionDB, InsertPredictionEvaluation, InsertPredictionBiasMetrics } from "@shared/schema";

interface PlayerPredictionResult {
  playerId: number;
  playerName: string;
  position: 'GK' | 'DEF' | 'MID' | 'FWD';
  predicted: number;
  actual: number;
  error: number;
  bias: number;
}

interface PositionMetrics {
  position: 'GK' | 'DEF' | 'MID' | 'FWD' | 'ALL';
  sampleSize: number;
  mae: number;
  bias: number;
  rmse: number;
}

export class PredictionEvaluatorService {
  private positionMap: { [key: number]: 'GK' | 'DEF' | 'MID' | 'FWD' } = {
    1: 'GK',
    2: 'DEF',
    3: 'MID',
    4: 'FWD'
  };

  async evaluateGameweek(gameweek: number): Promise<InsertPredictionEvaluation> {
    console.log(`[PredictionEvaluator] Evaluating predictions for GW${gameweek}`);
    
    const predictions = await storage.getAllPredictionsForGameweek(gameweek);
    console.log(`[PredictionEvaluator] Found ${predictions.length} predictions for GW${gameweek}`);
    
    if (predictions.length === 0) {
      console.log(`[PredictionEvaluator] No predictions found for GW${gameweek}`);
      return this.createEmptyEvaluation(gameweek);
    }

    const playersData = await fplApi.getPlayers();
    const playersMap = new Map<number, FPLPlayer>(playersData.map((p: FPLPlayer) => [p.id, p]));

    const results: PlayerPredictionResult[] = [];
    let predictionsWithActuals = 0;

    for (const pred of predictions) {
      if (pred.actualPoints !== null && pred.actualPoints !== undefined) {
        predictionsWithActuals++;
        const player = playersMap.get(pred.playerId);
        if (player) {
          const position = this.positionMap[player.element_type];
          const error = Math.abs(pred.predictedPoints - pred.actualPoints);
          const bias = pred.predictedPoints - pred.actualPoints;
          
          results.push({
            playerId: pred.playerId,
            playerName: player.web_name,
            position,
            predicted: pred.predictedPoints,
            actual: pred.actualPoints,
            error,
            bias
          });
        }
      }
    }

    console.log(`[PredictionEvaluator] ${predictionsWithActuals} predictions have actual points`);

    if (results.length === 0) {
      console.log(`[PredictionEvaluator] No results to evaluate for GW${gameweek}`);
      return this.createEmptyEvaluation(gameweek);
    }

    const positionMetrics = this.calculatePositionMetrics(results);
    const overallMetrics = this.calculateOverallMetrics(results);
    
    const topOverpredictions = [...results]
      .sort((a, b) => b.bias - a.bias)
      .slice(0, 5)
      .map(r => ({
        playerId: r.playerId,
        playerName: r.playerName,
        predicted: r.predicted,
        actual: r.actual,
        error: r.bias
      }));

    const topUnderpredictions = [...results]
      .sort((a, b) => a.bias - b.bias)
      .slice(0, 5)
      .map(r => ({
        playerId: r.playerId,
        playerName: r.playerName,
        predicted: r.predicted,
        actual: r.actual,
        error: r.bias
      }));

    const lessonsLearned = this.generateLessons(positionMetrics, topOverpredictions, topUnderpredictions);

    const evaluation: InsertPredictionEvaluation = {
      gameweek,
      totalPredictions: predictions.length,
      predictionsWithActuals,
      overallMAE: overallMetrics.mae,
      overallBias: overallMetrics.bias,
      gkMAE: positionMetrics.GK?.mae ?? 0,
      defMAE: positionMetrics.DEF?.mae ?? 0,
      midMAE: positionMetrics.MID?.mae ?? 0,
      fwdMAE: positionMetrics.FWD?.mae ?? 0,
      gkBias: positionMetrics.GK?.bias ?? 0,
      defBias: positionMetrics.DEF?.bias ?? 0,
      midBias: positionMetrics.MID?.bias ?? 0,
      fwdBias: positionMetrics.FWD?.bias ?? 0,
      topOverpredictions,
      topUnderpredictions,
      lessonsLearned
    };

    await storage.savePredictionEvaluation(evaluation);
    console.log(`[PredictionEvaluator] Saved evaluation for GW${gameweek}`);

    await this.saveBiasMetrics(gameweek, positionMetrics, overallMetrics);

    return evaluation;
  }

  private calculatePositionMetrics(results: PlayerPredictionResult[]): { [key in 'GK' | 'DEF' | 'MID' | 'FWD']?: PositionMetrics } {
    const positions: ('GK' | 'DEF' | 'MID' | 'FWD')[] = ['GK', 'DEF', 'MID', 'FWD'];
    const metrics: { [key in 'GK' | 'DEF' | 'MID' | 'FWD']?: PositionMetrics } = {};

    for (const pos of positions) {
      const posResults = results.filter(r => r.position === pos);
      if (posResults.length > 0) {
        const totalError = posResults.reduce((sum, r) => sum + r.error, 0);
        const totalBias = posResults.reduce((sum, r) => sum + r.bias, 0);
        const squaredErrors = posResults.reduce((sum, r) => sum + r.error * r.error, 0);
        
        metrics[pos] = {
          position: pos,
          sampleSize: posResults.length,
          mae: totalError / posResults.length,
          bias: totalBias / posResults.length,
          rmse: Math.sqrt(squaredErrors / posResults.length)
        };
      }
    }

    return metrics;
  }

  private calculateOverallMetrics(results: PlayerPredictionResult[]): PositionMetrics {
    const totalError = results.reduce((sum, r) => sum + r.error, 0);
    const totalBias = results.reduce((sum, r) => sum + r.bias, 0);
    const squaredErrors = results.reduce((sum, r) => sum + r.error * r.error, 0);
    
    return {
      position: 'ALL',
      sampleSize: results.length,
      mae: totalError / results.length,
      bias: totalBias / results.length,
      rmse: Math.sqrt(squaredErrors / results.length)
    };
  }

  private async saveBiasMetrics(
    gameweek: number, 
    positionMetrics: { [key in 'GK' | 'DEF' | 'MID' | 'FWD']?: PositionMetrics },
    overallMetrics: PositionMetrics
  ): Promise<void> {
    const positions: ('GK' | 'DEF' | 'MID' | 'FWD' | 'ALL')[] = ['GK', 'DEF', 'MID', 'FWD', 'ALL'];
    
    for (const pos of positions) {
      const metrics = pos === 'ALL' ? overallMetrics : positionMetrics[pos];
      if (metrics) {
        const calibrationFactor = this.calculateCalibrationFactor(metrics.bias);
        
        const biasMetrics: InsertPredictionBiasMetrics = {
          gameweek,
          position: pos,
          sampleSize: metrics.sampleSize,
          meanAbsoluteError: metrics.mae,
          meanBias: metrics.bias,
          rootMeanSquareError: metrics.rmse,
          calibrationFactor
        };
        
        await storage.savePredictionBiasMetrics(biasMetrics);
        console.log(`[PredictionEvaluator] Saved bias metrics for ${pos}: MAE=${metrics.mae.toFixed(2)}, Bias=${metrics.bias.toFixed(2)}, Calibration=${calibrationFactor.toFixed(3)}`);
      }
    }

    calibrationService.clearCache();
    console.log(`[PredictionEvaluator] Cleared calibration cache to apply new factors immediately`);
  }

  private calculateCalibrationFactor(bias: number): number {
    if (bias === 0) return 1.0;
    if (bias > 0) {
      return Math.max(0.7, 1 - (bias * 0.05));
    } else {
      return Math.min(1.3, 1 + (Math.abs(bias) * 0.05));
    }
  }

  private generateLessons(
    positionMetrics: { [key in 'GK' | 'DEF' | 'MID' | 'FWD']?: PositionMetrics },
    topOverpredictions: Array<{ playerId: number; playerName: string; predicted: number; actual: number; error: number }>,
    topUnderpredictions: Array<{ playerId: number; playerName: string; predicted: number; actual: number; error: number }>
  ): string[] {
    const lessons: string[] = [];

    for (const [pos, metrics] of Object.entries(positionMetrics)) {
      if (metrics && Math.abs(metrics.bias) > 1.5) {
        if (metrics.bias > 0) {
          lessons.push(`${pos} players are consistently OVERPREDICTED by ${metrics.bias.toFixed(1)} points on average. Reduce ${pos} predictions.`);
        } else {
          lessons.push(`${pos} players are consistently UNDERPREDICTED by ${Math.abs(metrics.bias).toFixed(1)} points on average. Increase ${pos} predictions.`);
        }
      }
    }

    if (topOverpredictions.length > 0 && topOverpredictions[0].error > 5) {
      const player = topOverpredictions[0];
      lessons.push(`Major overprediction: ${player.playerName} predicted ${player.predicted.toFixed(1)} but scored ${player.actual.toFixed(1)} (${player.error.toFixed(1)} pts over). Be more conservative with similar players.`);
    }

    if (topUnderpredictions.length > 0 && Math.abs(topUnderpredictions[0].error) > 5) {
      const player = topUnderpredictions[0];
      lessons.push(`Major underprediction: ${player.playerName} predicted ${player.predicted.toFixed(1)} but scored ${player.actual.toFixed(1)} (${Math.abs(player.error).toFixed(1)} pts under). Consider upside potential more.`);
    }

    const injuredOverpredictions = topOverpredictions.filter(p => p.actual === 0 && p.predicted > 3);
    if (injuredOverpredictions.length > 0) {
      lessons.push(`${injuredOverpredictions.length} player(s) were predicted to score but got 0 points (likely didn't play). Check injury/rotation status more carefully.`);
    }

    if (lessons.length === 0) {
      lessons.push('Predictions were generally accurate this gameweek. Continue monitoring for patterns.');
    }

    return lessons;
  }

  private createEmptyEvaluation(gameweek: number): InsertPredictionEvaluation {
    return {
      gameweek,
      totalPredictions: 0,
      predictionsWithActuals: 0,
      overallMAE: 0,
      overallBias: 0,
      gkMAE: 0,
      defMAE: 0,
      midMAE: 0,
      fwdMAE: 0,
      gkBias: 0,
      defBias: 0,
      midBias: 0,
      fwdBias: 0,
      topOverpredictions: [],
      topUnderpredictions: [],
      lessonsLearned: ['No predictions available for evaluation.']
    };
  }

  async backfillActualPoints(gameweek: number): Promise<{ updated: number; attempted: number; notFinished: boolean }> {
    console.log(`[PredictionEvaluator] Backfilling actual points for GW${gameweek}`);
    
    const gameweeks = await fplApi.getGameweeks();
    const gw = gameweeks.find((g: any) => g.id === gameweek);
    
    if (!gw || !gw.finished) {
      console.log(`[PredictionEvaluator] GW${gameweek} is not finished yet`);
      return { updated: 0, attempted: 0, notFinished: true };
    }

    const playersData = await fplApi.getPlayers();
    const predictions = await storage.getAllPredictionsForGameweek(gameweek);
    
    const predictionsToUpdate = predictions.filter((p: PredictionDB) => p.actualPoints === null || p.actualPoints === undefined);
    console.log(`[PredictionEvaluator] Found ${predictionsToUpdate.length} predictions needing actual points`);
    
    if (predictionsToUpdate.length === 0) {
      return { updated: 0, attempted: 0, notFinished: false };
    }
    
    let updatedCount = 0;
    let attemptedCount = 0;
    
    for (const pred of predictionsToUpdate) {
      const player = playersData.find((p: FPLPlayer) => p.id === pred.playerId);
      if (player) {
        attemptedCount++;
        const actualPoints = await this.getPlayerActualPoints(pred.playerId, gameweek);
        if (actualPoints !== null) {
          await storage.updateActualPointsByPlayer(pred.userId, gameweek, pred.playerId, actualPoints);
          updatedCount++;
        }
      }
    }
    
    console.log(`[PredictionEvaluator] Updated ${updatedCount}/${attemptedCount} predictions with actual points`);
    return { updated: updatedCount, attempted: attemptedCount, notFinished: false };
  }

  private async getPlayerActualPoints(playerId: number, gameweek: number): Promise<number | null> {
    try {
      const playerDetails = await fplApi.getPlayerDetails(playerId);
      const gwHistory = playerDetails.history?.find((h: any) => h.round === gameweek);
      return gwHistory?.total_points ?? null;
    } catch (error) {
      console.error(`[PredictionEvaluator] Error fetching history for player ${playerId}:`, error);
      return null;
    }
  }

  async evaluateAllCompletedGameweeks(): Promise<void> {
    console.log(`[PredictionEvaluator] Evaluating all completed gameweeks`);
    
    const gameweeks = await fplApi.getGameweeks();
    const completedGameweeks = gameweeks.filter((gw: any) => gw.finished);
    
    for (const gw of completedGameweeks) {
      const existingEval = await storage.getPredictionEvaluation(gw.id);
      if (!existingEval) {
        await this.backfillActualPoints(gw.id);
        await this.evaluateGameweek(gw.id);
      }
    }
  }

  async getLearningContext(): Promise<{
    recentEvaluations: InsertPredictionEvaluation[];
    currentBiasMetrics: { position: string; bias: number; calibrationFactor: number }[];
    keyLessons: string[];
  }> {
    const recentEvaluations = await storage.getRecentPredictionEvaluations(3);
    const biasMetrics = await storage.getLatestBiasMetrics();
    
    const keyLessons: string[] = [];
    
    for (const eval_ of recentEvaluations) {
      if (eval_.lessonsLearned) {
        keyLessons.push(...eval_.lessonsLearned.slice(0, 2));
      }
    }

    return {
      recentEvaluations: recentEvaluations as InsertPredictionEvaluation[],
      currentBiasMetrics: biasMetrics.map(m => ({
        position: m.position,
        bias: m.meanBias,
        calibrationFactor: m.calibrationFactor
      })),
      keyLessons: Array.from(new Set(keyLessons)).slice(0, 5)
    };
  }
}

export const predictionEvaluator = new PredictionEvaluatorService();
