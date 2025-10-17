import { fplApi } from "./fpl-api";
import type { FPLPlayer, FPLFixture, FPLTeam, FPLTeamPicks } from "@shared/schema";

export interface CompetitorPrediction {
  managerId: number;
  managerName: string;
  teamName: string;
  predictedPoints: number;
  team: {
    playerId: number;
    playerName: string;
    position: number;
    isCaptain: boolean;
    isViceCaptain: boolean;
    predictedPoints: number;
  }[];
  captainId: number | null;
  viceCaptainId: number | null;
}

interface PredictionCache {
  data: CompetitorPrediction[];
  timestamp: number;
  gameweek: number;
  leagueId: number;
}

class CompetitorPredictorService {
  private cache = new Map<string, PredictionCache>();
  private readonly CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

  async predictCompetitorPoints(
    leagueId: number,
    competitorManagerIds: number[],
    gameweek: number,
    players: FPLPlayer[],
    fixtures: FPLFixture[],
    teams: FPLTeam[]
  ): Promise<CompetitorPrediction[]> {
    const cacheKey = `${leagueId}-${gameweek}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`[COMPETITOR PREDICTOR] Using cached predictions for league ${leagueId} GW${gameweek}`);
      return cached.data;
    }

    console.log(`[COMPETITOR PREDICTOR] Generating predictions for ${competitorManagerIds.length} competitors in GW${gameweek}`);

    const predictions: CompetitorPrediction[] = [];

    for (const managerId of competitorManagerIds) {
      try {
        const prediction = await this.predictSingleManager(
          managerId,
          gameweek,
          players,
          fixtures,
          teams
        );
        predictions.push(prediction);
      } catch (error) {
        console.error(`[COMPETITOR PREDICTOR] Error predicting for manager ${managerId}:`, error);
      }
    }

    this.cache.set(cacheKey, {
      data: predictions,
      timestamp: Date.now(),
      gameweek,
      leagueId,
    });

    console.log(`[COMPETITOR PREDICTOR] Generated ${predictions.length} predictions`);
    return predictions;
  }

  private async predictSingleManager(
    managerId: number,
    gameweek: number,
    players: FPLPlayer[],
    fixtures: FPLFixture[],
    teams: FPLTeam[]
  ): Promise<CompetitorPrediction> {
    const managerDetails = await fplApi.getManagerDetails(managerId);
    const teamPicks = await fplApi.getManagerPicks(managerId, gameweek);

    const playerMap = new Map(players.map(p => [p.id, p]));
    const teamMap = new Map(teams.map(t => [t.id, t]));

    let totalPredictedPoints = 0;
    const teamPredictions: CompetitorPrediction['team'] = [];
    
    let captainId: number | null = null;
    let viceCaptainId: number | null = null;

    for (const pick of teamPicks.picks) {
      const player = playerMap.get(pick.element);
      if (!player) continue;

      if (pick.is_captain) captainId = pick.element;
      if (pick.is_vice_captain) viceCaptainId = pick.element;

      const basePPG = parseFloat(player.points_per_game) || 0;
      const fixtureAdjustment = this.getFixtureAdjustment(player.team, gameweek, fixtures, teams);
      const adjustedPPG = basePPG * (1 + fixtureAdjustment);
      
      let playerPrediction = adjustedPPG;

      if (pick.multiplier === 2) {
        playerPrediction *= 2;
      } else if (pick.multiplier === 3) {
        playerPrediction *= 3;
      }

      if (pick.multiplier > 0) {
        totalPredictedPoints += playerPrediction;
      }

      teamPredictions.push({
        playerId: pick.element,
        playerName: player.web_name,
        position: pick.position,
        isCaptain: pick.is_captain,
        isViceCaptain: pick.is_vice_captain,
        predictedPoints: Math.round(playerPrediction * 10) / 10,
      });
    }

    return {
      managerId,
      managerName: `${managerDetails.player_first_name} ${managerDetails.player_last_name}`,
      teamName: managerDetails.entry_name,
      predictedPoints: Math.round(totalPredictedPoints),
      team: teamPredictions,
      captainId,
      viceCaptainId,
    };
  }

  private getFixtureAdjustment(
    teamId: number,
    gameweek: number,
    fixtures: FPLFixture[],
    teams: FPLTeam[]
  ): number {
    const teamFixtures = fixtures.filter(
      f => f.event === gameweek && (f.team_h === teamId || f.team_a === teamId)
    );

    if (teamFixtures.length === 0) return 0;

    let totalAdjustment = 0;
    
    for (const fixture of teamFixtures) {
      const isHome = fixture.team_h === teamId;
      const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
      
      if (difficulty <= 2) {
        totalAdjustment += 0.20;
      } else if (difficulty >= 4) {
        totalAdjustment -= 0.20;
      }
    }

    return totalAdjustment / teamFixtures.length;
  }

  clearCache() {
    this.cache.clear();
  }

  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        gameweek: value.gameweek,
        leagueId: value.leagueId,
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp,
      })),
    };
  }
}

export const competitorPredictor = new CompetitorPredictorService();
