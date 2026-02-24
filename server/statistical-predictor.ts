import { statisticalModels, type StatisticalPredictionComponents } from "./statistical-models";
import { minutesEstimator } from "./minutes-estimator";
import type { FPLPlayer, FPLTeam, FPLFixture, Prediction } from "@shared/schema";

interface StatisticalPredictionContext {
  player: FPLPlayer;
  playerTeam: FPLTeam;
  fixture: FPLFixture;
  opponentTeam: FPLTeam;
  allTeams: FPLTeam[];
  isHome: boolean;
}

export interface DetailedPrediction {
  player_id: number;
  predicted_points: number;
  confidence: number;
  reasoning: string;
  fixtures_considered: number[];
  components: StatisticalPredictionComponents;
  breakdown: {
    appearance: number;
    goals: number;
    assists: number;
    cleanSheet: number;
    saves: number;
    bonus: number;
    yellowCard: number;
    defensiveContribution: number;
  };
  minutesEstimate: {
    expected: number;
    probability90: number;
    probability60: number;
    riskLevel: string;
  };
}

export class StatisticalPredictorService {
  async predictPlayerPointsStatistical(
    player: FPLPlayer,
    upcomingFixtures: FPLFixture[],
    allTeams: FPLTeam[]
  ): Promise<DetailedPrediction> {
    const position = statisticalModels.getPositionFromType(player.element_type);
    const isDefensive = position === 'GKP' || position === 'DEF';

    if (!upcomingFixtures || upcomingFixtures.length === 0) {
      return this.createZeroPrediction(player, position, 'No upcoming fixtures');
    }

    const nextFixture = upcomingFixtures[0];
    const playerTeam = allTeams.find(t => t.id === player.team);
    const isHome = nextFixture.team_h === player.team;
    const opponentTeamId = isHome ? nextFixture.team_a : nextFixture.team_h;
    const opponentTeam = allTeams.find(t => t.id === opponentTeamId);

    if (!playerTeam || !opponentTeam) {
      return this.createZeroPrediction(player, position, 'Team data unavailable');
    }

    const minutesProb = await minutesEstimator.estimateMinutes(player);

    if (minutesProb.expectedMinutes === 0) {
      return this.createZeroPrediction(
        player,
        position,
        `Player unavailable: ${minutesProb.riskFactors.join(', ')}`
      );
    }

    const context: StatisticalPredictionContext = {
      player,
      playerTeam,
      fixture: nextFixture,
      opponentTeam,
      allTeams,
      isHome,
    };

    const components = await this.calculatePredictionComponents(context, minutesProb.expectedMinutes, position);

    const totalPoints = statisticalModels.calculateExpectedPointsFromComponents(components, position);

    const breakdown = this.calculateBreakdown(components, position);

    const confidence = this.calculateConfidence(player, minutesProb, components);

    return {
      player_id: player.id,
      predicted_points: totalPoints,
      confidence,
      reasoning: this.generateReasoning(player, position, components, minutesProb, breakdown),
      fixtures_considered: [nextFixture.id],
      components,
      breakdown,
      minutesEstimate: {
        expected: minutesProb.expectedMinutes,
        probability90: minutesProb.probability90,
        probability60: minutesProb.probability60,
        riskLevel: minutesProb.riskLevel,
      },
    };
  }

  private async calculatePredictionComponents(
    context: StatisticalPredictionContext,
    expectedMinutes: number,
    position: string
  ): Promise<StatisticalPredictionComponents> {
    const { player, playerTeam, opponentTeam, isHome, allTeams } = context;

    const teamStats = statisticalModels.normalizeTeamStrength(allTeams);

    const playerXG = parseFloat(player.expected_goals || '0');
    const playerXA = parseFloat(player.expected_assists || '0');

    const gamesPlayed = Math.max(1, Math.floor(player.minutes / 90));
    const xGPerGame = playerXG / gamesPlayed;
    const xAPerGame = playerXA / gamesPlayed;

    const opponentDefenseStrength = isHome
      ? opponentTeam.strength_defence_away
      : opponentTeam.strength_defence_home;
    const avgDefenseStrength = isHome ? teamStats.avgDefenseAway : teamStats.avgDefenseHome;

    const adjustedXG = statisticalModels.calculateOpponentAdjustedXG(
      xGPerGame,
      opponentDefenseStrength,
      avgDefenseStrength,
      isHome
    );

    const adjustedXA = statisticalModels.calculateOpponentAdjustedXG(
      xAPerGame,
      opponentDefenseStrength,
      avgDefenseStrength,
      isHome
    );

    const goalConversionRate = statisticalModels.calculateHistoricalConversionRate(player, 'goals');
    const assistConversionRate = statisticalModels.calculateHistoricalConversionRate(player, 'assists');

    let expectedGoals = adjustedXG * goalConversionRate;
    let expectedAssists = adjustedXA * assistConversionRate;

    const goalMinutesFactor = statisticalModels.minutesAdjustmentFactor(expectedMinutes, 'goals');
    const assistMinutesFactor = statisticalModels.minutesAdjustmentFactor(expectedMinutes, 'assists');
    expectedGoals *= goalMinutesFactor;
    expectedAssists *= assistMinutesFactor;

    let expectedCleanSheet = 0;
    let expectedSaves = 0;

    if (position === 'GKP' || position === 'DEF') {
      const teamDefenseStrength = isHome
        ? playerTeam.strength_defence_home
        : playerTeam.strength_defence_away;
      const opponentAttackStrength = isHome
        ? opponentTeam.strength_attack_away
        : opponentTeam.strength_attack_home;

      const cleanSheetProb = statisticalModels.calculateCleanSheetProbability(
        teamDefenseStrength,
        opponentAttackStrength,
        isHome
      );

      const cleanSheetMinutesFactor = statisticalModels.minutesAdjustmentFactor(
        expectedMinutes,
        'clean_sheet'
      );
      expectedCleanSheet = cleanSheetProb * cleanSheetMinutesFactor;

      if (position === 'GKP') {
        expectedSaves = statisticalModels.calculateExpectedSaves(
          opponentAttackStrength,
          teamDefenseStrength,
          isHome
        );
        const savesMinutesFactor = statisticalModels.minutesAdjustmentFactor(expectedMinutes, 'saves');
        expectedSaves *= savesMinutesFactor;
      }
    }

    const yellowCardProb = statisticalModels.calculateYellowCardProbability(player);
    const yellowMinutesFactor = statisticalModels.minutesAdjustmentFactor(expectedMinutes, 'yellow_card');
    const expectedYellowCard = yellowCardProb * yellowMinutesFactor;

    const bonusProb = statisticalModels.calculateBonusProbability(player, position);
    const bonusMinutesFactor = statisticalModels.minutesAdjustmentFactor(expectedMinutes, 'bonus');
    const expectedBonus = bonusProb * bonusMinutesFactor;

    return {
      expectedGoals,
      expectedAssists,
      expectedCleanSheet,
      expectedSaves,
      expectedYellowCard,
      expectedBonus,
      expectedMinutes,
    };
  }

  private calculateBreakdown(
    components: StatisticalPredictionComponents,
    position: string
  ): DetailedPrediction['breakdown'] {
    const goalPoints = position === 'FWD' ? 4 : position === 'MID' ? 5 : 6;
    const assistPoints = 3;
    const cleanSheetPoints =
      position === 'GKP' || position === 'DEF' ? 4 : position === 'MID' ? 1 : 0;
    const savePoints = position === 'GKP' ? 1 / 3 : 0;

    const appearance = statisticalModels.minutesAdjustmentFactor(components.expectedMinutes, 'appearance') * 2;

    return {
      appearance: Math.round(appearance * 10) / 10,
      goals: Math.round(components.expectedGoals * goalPoints * 10) / 10,
      assists: Math.round(components.expectedAssists * assistPoints * 10) / 10,
      cleanSheet: Math.round(components.expectedCleanSheet * cleanSheetPoints * 10) / 10,
      saves: Math.round(components.expectedSaves * savePoints * 10) / 10,
      bonus: Math.round(components.expectedBonus * 10) / 10,
      yellowCard: Math.round(components.expectedYellowCard * -1 * 10) / 10,
      defensiveContribution: 0,
    };
  }

  private calculateConfidence(
    player: FPLPlayer,
    minutesProb: any,
    components: StatisticalPredictionComponents
  ): number {
    let confidence = 70;

    if (minutesProb.riskLevel === 'high') {
      confidence -= 30;
    } else if (minutesProb.riskLevel === 'medium') {
      confidence -= 15;
    }

    const gamesPlayed = Math.max(1, Math.floor(player.minutes / 90));
    if (gamesPlayed < 5) {
      confidence -= 10;
    }

    const form = parseFloat(player.form || '0');
    if (form > 6) {
      confidence += 10;
    } else if (form < 3) {
      confidence -= 10;
    }

    const expectedGoalInvolvements = components.expectedGoals + components.expectedAssists;
    if (expectedGoalInvolvements > 0.8) {
      confidence += 5;
    }

    return Math.max(20, Math.min(95, confidence));
  }

  private generateReasoning(
    player: FPLPlayer,
    position: string,
    components: StatisticalPredictionComponents,
    minutesProb: any,
    breakdown: DetailedPrediction['breakdown']
  ): string {
    const reasons: string[] = [];

    reasons.push(
      `Expected ${components.expectedMinutes} mins (${Math.round(minutesProb.probability90 * 100)}% for 90)`
    );

    if (components.expectedGoals > 0.3) {
      reasons.push(`${components.expectedGoals.toFixed(2)} xG → ${breakdown.goals.toFixed(1)} pts`);
    }

    if (components.expectedAssists > 0.2) {
      reasons.push(`${components.expectedAssists.toFixed(2)} xA → ${breakdown.assists.toFixed(1)} pts`);
    }

    if (components.expectedCleanSheet > 0.4) {
      reasons.push(`${Math.round(components.expectedCleanSheet * 100)}% CS → ${breakdown.cleanSheet.toFixed(1)} pts`);
    }

    if (components.expectedSaves > 3) {
      reasons.push(`${components.expectedSaves.toFixed(1)} saves → ${breakdown.saves.toFixed(1)} pts`);
    }

    if (components.expectedBonus > 0.5) {
      reasons.push(`Bonus: ${breakdown.bonus.toFixed(1)} pts`);
    }

    if (minutesProb.riskLevel !== 'low') {
      reasons.push(`⚠️ ${minutesProb.riskLevel.toUpperCase()} RISK: ${minutesProb.riskFactors[0]}`);
    }

    return reasons.join('; ');
  }

  private createZeroPrediction(
    player: FPLPlayer,
    position: string,
    reason: string
  ): DetailedPrediction {
    return {
      player_id: player.id,
      predicted_points: 0,
      confidence: 100,
      reasoning: reason,
      fixtures_considered: [],
      components: {
        expectedGoals: 0,
        expectedAssists: 0,
        expectedCleanSheet: 0,
        expectedSaves: 0,
        expectedYellowCard: 0,
        expectedBonus: 0,
        expectedMinutes: 0,
      },
      breakdown: {
        appearance: 0,
        goals: 0,
        assists: 0,
        cleanSheet: 0,
        saves: 0,
        bonus: 0,
        yellowCard: 0,
        defensiveContribution: 0,
      },
      minutesEstimate: {
        expected: 0,
        probability90: 0,
        probability60: 0,
        riskLevel: 'high',
      },
    };
  }
}

export const statisticalPredictor = new StatisticalPredictorService();
