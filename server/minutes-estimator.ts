import { storage } from "./storage";
import { fplApi } from "./fpl-api";
import type { FPLPlayer, InsertPlayerMinutesHistory } from "@shared/schema";

interface MinutesProbability {
  playerId: number;
  expectedMinutes: number;
  probabilityPlaying: number;
  probability90: number;
  probability60: number;
  probabilityBench: number;
  probability0: number;
  riskLevel: 'low' | 'medium' | 'high';
  riskFactors: string[];
}

export class MinutesEstimatorService {
  async estimateMinutes(player: FPLPlayer): Promise<MinutesProbability> {
    const history = await storage.getPlayerMinutesHistory(player.id, 10);
    
    const chanceOfPlaying = player.chance_of_playing_next_round ?? 100;
    const status = player.status;
    const totalMinutes = player.minutes;
    
    const riskFactors: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (status === 'i' || status === 'u') {
      riskLevel = 'high';
      riskFactors.push('Injured/Unavailable');
      return {
        playerId: player.id,
        expectedMinutes: 0,
        probabilityPlaying: 0,
        probability90: 0,
        probability60: 0,
        probabilityBench: 0,
        probability0: 1,
        riskLevel,
        riskFactors
      };
    }

    if (status === 'd') {
      riskLevel = 'medium';
      riskFactors.push('Doubtful');
    }

    if (chanceOfPlaying < 50) {
      riskLevel = 'high';
      riskFactors.push(`Low chance of playing (${chanceOfPlaying}%)`);
    } else if (chanceOfPlaying < 75) {
      riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      riskFactors.push(`Questionable (${chanceOfPlaying}% chance)`);
    }

    let probability90 = 0;
    let probability60 = 0;
    let probabilityBench = 0;
    let probability0 = 0;
    
    if (history.length >= 3) {
      const recent5 = history.slice(0, 5);
      const gamesPlayed90 = recent5.filter(h => h.minutesPlayed >= 85).length;
      const gamesPlayed60 = recent5.filter(h => h.minutesPlayed >= 60 && h.minutesPlayed < 85).length;
      const gamesBenched = recent5.filter(h => h.minutesPlayed > 0 && h.minutesPlayed < 60).length;
      const gamesNotPlayed = recent5.filter(h => h.minutesPlayed === 0).length;
      
      const total = recent5.length;
      probability90 = gamesPlayed90 / total;
      probability60 = gamesPlayed60 / total;
      probabilityBench = gamesBenched / total;
      probability0 = gamesNotPlayed / total;

      if (gamesNotPlayed >= 2) {
        if (riskLevel !== 'high') riskLevel = 'medium';
        riskFactors.push(`Rotation risk (${gamesNotPlayed} benched/unused in last ${total})`);
      }
    } else {
      const avgMinutes = totalMinutes / 12;
      
      if (avgMinutes >= 75) {
        probability90 = 0.75;
        probability60 = 0.15;
        probabilityBench = 0.05;
        probability0 = 0.05;
      } else if (avgMinutes >= 45) {
        probability90 = 0.40;
        probability60 = 0.30;
        probabilityBench = 0.15;
        probability0 = 0.15;
        if (riskLevel !== 'high') riskLevel = 'medium';
        riskFactors.push('Rotation candidate (moderate average minutes)');
      } else {
        probability90 = 0.15;
        probability60 = 0.20;
        probabilityBench = 0.30;
        probability0 = 0.35;
        riskLevel = 'high';
        riskFactors.push('Backup/rotation player (low average minutes)');
      }
    }

    const playingChanceMultiplier = chanceOfPlaying / 100;
    probability90 *= playingChanceMultiplier;
    probability60 *= playingChanceMultiplier;
    probabilityBench *= playingChanceMultiplier;
    probability0 = 1 - (probability90 + probability60 + probabilityBench);

    const expectedMinutes = 
      (probability90 * 90) + 
      (probability60 * 70) + 
      (probabilityBench * 30) + 
      (probability0 * 0);

    const probabilityPlaying = probability90 + probability60 + probabilityBench;

    return {
      playerId: player.id,
      expectedMinutes: Math.round(expectedMinutes),
      probabilityPlaying: Math.round(probabilityPlaying * 100) / 100,
      probability90: Math.round(probability90 * 100) / 100,
      probability60: Math.round(probability60 * 100) / 100,
      probabilityBench: Math.round(probabilityBench * 100) / 100,
      probability0: Math.round(probability0 * 100) / 100,
      riskLevel,
      riskFactors
    };
  }

  async recordMinutesForGameweek(gameweek: number): Promise<number> {
    console.log(`[MinutesEstimator] Recording minutes history for GW${gameweek}`);
    
    const gameweeks = await fplApi.getGameweeks();
    const gw = gameweeks.find((g: any) => g.id === gameweek);
    
    if (!gw || !gw.finished) {
      console.log(`[MinutesEstimator] GW${gameweek} is not finished yet`);
      return 0;
    }

    const players = await fplApi.getPlayers();
    const records: InsertPlayerMinutesHistory[] = [];
    
    for (const player of players) {
      try {
        const playerDetails = await fplApi.getPlayerDetails(player.id);
        const gwHistory = playerDetails.history?.find((h: any) => h.round === gameweek);
        
        if (gwHistory) {
          records.push({
            playerId: player.id,
            gameweek,
            season: 2024,
            minutesPlayed: gwHistory.minutes || 0,
            wasInStartingXI: gwHistory.minutes >= 1,
            wasSubstituted: gwHistory.minutes > 0 && gwHistory.minutes < 90,
            injuryFlag: player.status,
            chanceOfPlaying: player.chance_of_playing_next_round ?? 100
          });
        }
      } catch (error) {
      }
      
      if (records.length >= 50) {
        await storage.bulkSavePlayerMinutesHistory(records);
        records.length = 0;
      }
    }
    
    if (records.length > 0) {
      await storage.bulkSavePlayerMinutesHistory(records);
    }
    
    console.log(`[MinutesEstimator] Recorded minutes for GW${gameweek}`);
    return records.length;
  }

  adjustPredictionForMinutes(basePrediction: number, minutesProbability: MinutesProbability): number {
    const expectedMinutesFactor = minutesProbability.expectedMinutes / 90;
    
    const adjustedPrediction = basePrediction * expectedMinutesFactor;
    
    if (minutesProbability.probability0 > 0.3) {
      return adjustedPrediction * 0.85;
    }
    
    return adjustedPrediction;
  }

  getMinutesRiskSummary(probability: MinutesProbability): string {
    if (probability.riskLevel === 'high') {
      return `HIGH RISK: ${probability.riskFactors.join(', ')}. Expected ${probability.expectedMinutes} mins (${Math.round(probability.probabilityPlaying * 100)}% to play).`;
    } else if (probability.riskLevel === 'medium') {
      return `MEDIUM RISK: ${probability.riskFactors.join(', ')}. Expected ${probability.expectedMinutes} mins.`;
    } else {
      return `Low risk: Expected ${probability.expectedMinutes} mins (${Math.round(probability.probability90 * 100)}% for 90 mins).`;
    }
  }
}

export const minutesEstimator = new MinutesEstimatorService();
