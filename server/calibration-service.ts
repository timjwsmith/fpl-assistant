import { storage } from "./storage";
import type { PredictionBiasMetrics } from "@shared/schema";

interface CalibrationFactors {
  overall: number;
  byPosition: {
    GK: number;
    DEF: number;
    MID: number;
    FWD: number;
  };
  lastUpdated: Date | null;
}

export class CalibrationService {
  private cachedFactors: CalibrationFactors | null = null;
  private cacheExpiryMs = 1000 * 60 * 30; // 30 minutes cache
  private lastCacheTime: number = 0;

  async getCalibrationFactors(): Promise<CalibrationFactors> {
    const now = Date.now();
    if (this.cachedFactors && (now - this.lastCacheTime) < this.cacheExpiryMs) {
      return this.cachedFactors;
    }

    const metrics = await storage.getLatestBiasMetrics();
    
    if (metrics.length === 0) {
      const defaultFactors: CalibrationFactors = {
        overall: 1.0,
        byPosition: { GK: 1.0, DEF: 1.0, MID: 1.0, FWD: 1.0 },
        lastUpdated: null
      };
      this.cachedFactors = defaultFactors;
      this.lastCacheTime = now;
      return defaultFactors;
    }

    const factors: CalibrationFactors = {
      overall: 1.0,
      byPosition: { GK: 1.0, DEF: 1.0, MID: 1.0, FWD: 1.0 },
      lastUpdated: metrics[0]?.updatedAt || null
    };

    for (const metric of metrics) {
      if (metric.position === 'ALL') {
        factors.overall = metric.calibrationFactor;
      } else if (metric.position in factors.byPosition) {
        factors.byPosition[metric.position as keyof typeof factors.byPosition] = metric.calibrationFactor;
      }
    }

    this.cachedFactors = factors;
    this.lastCacheTime = now;
    
    console.log(`[Calibration] Loaded factors: Overall=${factors.overall.toFixed(3)}, GK=${factors.byPosition.GK.toFixed(3)}, DEF=${factors.byPosition.DEF.toFixed(3)}, MID=${factors.byPosition.MID.toFixed(3)}, FWD=${factors.byPosition.FWD.toFixed(3)}`);
    
    return factors;
  }

  async calibratePrediction(
    basePrediction: number, 
    position: 'GK' | 'DEF' | 'MID' | 'FWD'
  ): Promise<number> {
    const factors = await this.getCalibrationFactors();
    
    const positionFactor = factors.byPosition[position];
    
    const combinedFactor = (factors.overall + positionFactor) / 2;
    
    const calibrated = basePrediction * combinedFactor;
    
    return Math.max(0, Math.round(calibrated * 10) / 10);
  }

  async calibratePredictions(
    predictions: Array<{ playerId: number; position: number; predictedPoints: number }>
  ): Promise<Array<{ playerId: number; predictedPoints: number; calibratedPoints: number }>> {
    const factors = await this.getCalibrationFactors();
    const positionMap: { [key: number]: 'GK' | 'DEF' | 'MID' | 'FWD' } = {
      1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD'
    };

    return predictions.map(pred => {
      const position = positionMap[pred.position] || 'MID';
      const positionFactor = factors.byPosition[position];
      const combinedFactor = (factors.overall + positionFactor) / 2;
      
      const calibratedPoints = Math.max(0, Math.round(pred.predictedPoints * combinedFactor * 10) / 10);
      
      return {
        playerId: pred.playerId,
        predictedPoints: pred.predictedPoints,
        calibratedPoints
      };
    });
  }

  async getCalibrationSummary(): Promise<{
    isCalibrated: boolean;
    factors: CalibrationFactors;
    adjustmentsSummary: string;
  }> {
    const factors = await this.getCalibrationFactors();
    const isCalibrated = factors.lastUpdated !== null;

    let adjustmentsSummary = '';
    if (isCalibrated) {
      const adjustments: string[] = [];
      
      if (factors.overall < 0.95) {
        adjustments.push(`Overall predictions reduced by ${((1 - factors.overall) * 100).toFixed(0)}%`);
      } else if (factors.overall > 1.05) {
        adjustments.push(`Overall predictions increased by ${((factors.overall - 1) * 100).toFixed(0)}%`);
      }
      
      for (const [pos, factor] of Object.entries(factors.byPosition)) {
        if (factor < 0.9) {
          adjustments.push(`${pos} predictions reduced by ${((1 - factor) * 100).toFixed(0)}%`);
        } else if (factor > 1.1) {
          adjustments.push(`${pos} predictions increased by ${((factor - 1) * 100).toFixed(0)}%`);
        }
      }
      
      adjustmentsSummary = adjustments.length > 0 
        ? adjustments.join('; ') 
        : 'Predictions are well-calibrated, minimal adjustments applied.';
    } else {
      adjustmentsSummary = 'No historical data available for calibration. Using baseline predictions.';
    }

    return {
      isCalibrated,
      factors,
      adjustmentsSummary
    };
  }

  clearCache(): void {
    this.cachedFactors = null;
    this.lastCacheTime = 0;
  }
}

export const calibrationService = new CalibrationService();
