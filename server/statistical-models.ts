import type { FPLPlayer, FPLTeam, FPLFixture } from "@shared/schema";

export interface PoissonDistribution {
  probabilities: number[];
  expectedValue: number;
}

export interface StatisticalPredictionComponents {
  expectedGoals: number;
  expectedAssists: number;
  expectedCleanSheet: number;
  expectedSaves: number;
  expectedYellowCard: number;
  expectedBonus: number;
  expectedMinutes: number;
}

export class StatisticalModels {
  poissonProbability(lambda: number, k: number): number {
    if (lambda <= 0) return k === 0 ? 1 : 0;

    const logProbability = k * Math.log(lambda) - lambda - this.logFactorial(k);
    return Math.exp(logProbability);
  }

  private logFactorial(n: number): number {
    if (n <= 1) return 0;
    let result = 0;
    for (let i = 2; i <= n; i++) {
      result += Math.log(i);
    }
    return result;
  }

  poissonDistribution(lambda: number, maxK: number = 10): PoissonDistribution {
    const probabilities: number[] = [];
    let cumulative = 0;

    for (let k = 0; k <= maxK; k++) {
      const prob = this.poissonProbability(lambda, k);
      probabilities.push(prob);
      cumulative += prob;
    }

    const probGTE_maxK = 1 - cumulative;
    probabilities.push(probGTE_maxK);

    return {
      probabilities,
      expectedValue: lambda,
    };
  }

  xGToGoalsProbability(xG: number, adjustmentFactor: number = 1.0): PoissonDistribution {
    const adjustedXG = xG * adjustmentFactor;
    return this.poissonDistribution(adjustedXG, 5);
  }

  xAToAssistsProbability(xA: number, adjustmentFactor: number = 1.0): PoissonDistribution {
    const adjustedXA = xA * adjustmentFactor;
    return this.poissonDistribution(adjustedXA, 4);
  }

  calculateCleanSheetProbability(
    teamDefenseStrength: number,
    opponentAttackStrength: number,
    isHome: boolean
  ): number {
    const homeAdvantage = isHome ? 0.85 : 1.15;
    const expectedGoalsConceded = (opponentAttackStrength / teamDefenseStrength) * homeAdvantage;

    const poissonZero = this.poissonProbability(expectedGoalsConceded, 0);

    return Math.max(0, Math.min(1, poissonZero));
  }

  calculateExpectedSaves(
    opponentAttackStrength: number,
    teamDefenseStrength: number,
    isHome: boolean
  ): number {
    const homeAdvantage = isHome ? 0.85 : 1.15;
    const expectedShots = (opponentAttackStrength / teamDefenseStrength) * homeAdvantage * 12;

    const saveRate = 0.70;
    return expectedShots * saveRate;
  }

  calculateYellowCardProbability(player: FPLPlayer): number {
    const gamesPlayed = Math.max(1, Math.floor(player.minutes / 90));
    const yellowCardsPerGame = player.yellow_cards / gamesPlayed;

    return Math.min(0.35, yellowCardsPerGame);
  }

  calculateBonusProbability(player: FPLPlayer, position: string): number {
    const gamesPlayed = Math.max(1, Math.floor(player.minutes / 90));
    const bonusPerGame = player.bonus / gamesPlayed;

    const bpsScore = parseFloat(player.bps) || 0;
    const avgBPSPerGame = bpsScore / gamesPlayed;

    const positionMultiplier = position === 'FWD' ? 1.1 : position === 'MID' ? 1.0 : 0.9;

    const expectedBonus = (bonusPerGame * 0.7 + (avgBPSPerGame / 100) * positionMultiplier * 0.3);

    return Math.min(3, Math.max(0, expectedBonus));
  }

  calculateDefensiveContributionBonus(
    player: FPLPlayer,
    position: string,
    opponentAttackStrength: number
  ): number {
    if (position === 'FWD') return 0;

    const ictIndex = parseFloat(player.ict_index || '0');
    const influence = parseFloat(player.influence || '0');

    if (position === 'DEF') {
      const probabilityCBIT10Plus = Math.min(0.85, (influence / 1000) * opponentAttackStrength);
      return probabilityCBIT10Plus * 2;
    }

    if (position === 'MID') {
      const probabilityCBIRT12Plus = Math.min(0.40, (ictIndex / 800) * 0.5);
      return probabilityCBIRT12Plus * 2;
    }

    return 0;
  }

  minutesAdjustmentFactor(expectedMinutes: number, component: string): number {
    if (expectedMinutes === 0) return 0;

    if (component === 'goals' || component === 'assists') {
      return expectedMinutes / 90;
    }

    if (component === 'clean_sheet') {
      if (expectedMinutes >= 60) {
        return 1;
      } else {
        return expectedMinutes / 60;
      }
    }

    if (component === 'appearance') {
      if (expectedMinutes >= 60) return 1;
      if (expectedMinutes >= 1) return 0.5;
      return 0;
    }

    if (component === 'bonus' || component === 'yellow_card' || component === 'saves') {
      return expectedMinutes / 90;
    }

    return expectedMinutes / 90;
  }

  calculateExpectedPointsFromComponents(
    components: StatisticalPredictionComponents,
    position: string
  ): number {
    const goalPoints = position === 'FWD' ? 4 : position === 'MID' ? 5 : 6;
    const assistPoints = 3;
    const cleanSheetPoints =
      position === 'GKP' || position === 'DEF' ? 4 : position === 'MID' ? 1 : 0;
    const savePoints = position === 'GKP' ? 1 / 3 : 0;

    const appearancePoints =
      this.minutesAdjustmentFactor(components.expectedMinutes, 'appearance') * 2;

    const goalContribution = components.expectedGoals * goalPoints;
    const assistContribution = components.expectedAssists * assistPoints;
    const cleanSheetContribution = components.expectedCleanSheet * cleanSheetPoints;
    const saveContribution = components.expectedSaves * savePoints;
    const yellowCardPenalty = components.expectedYellowCard * -1;
    const bonusContribution = components.expectedBonus;

    const totalPoints =
      appearancePoints +
      goalContribution +
      assistContribution +
      cleanSheetContribution +
      saveContribution +
      yellowCardPenalty +
      bonusContribution;

    return Math.max(0, Math.round(totalPoints * 10) / 10);
  }

  calculateHistoricalConversionRate(
    player: FPLPlayer,
    metric: 'goals' | 'assists'
  ): number {
    const expected = metric === 'goals'
      ? parseFloat(player.expected_goals || '0')
      : parseFloat(player.expected_assists || '0');

    const actual = metric === 'goals'
      ? player.goals_scored
      : player.assists;

    if (expected === 0) return 1.0;

    const conversionRate = actual / expected;

    const minRate = 0.5;
    const maxRate = 2.0;
    return Math.max(minRate, Math.min(maxRate, conversionRate));
  }

  getPositionFromType(elementType: number): string {
    const positions = ['GKP', 'DEF', 'MID', 'FWD'];
    return positions[elementType - 1] || 'MID';
  }

  normalizeTeamStrength(teams: FPLTeam[]): {
    avgAttackHome: number;
    avgAttackAway: number;
    avgDefenseHome: number;
    avgDefenseAway: number;
  } {
    const avgAttackHome = teams.reduce((sum, t) => sum + t.strength_attack_home, 0) / teams.length;
    const avgAttackAway = teams.reduce((sum, t) => sum + t.strength_attack_away, 0) / teams.length;
    const avgDefenseHome = teams.reduce((sum, t) => sum + t.strength_defence_home, 0) / teams.length;
    const avgDefenseAway = teams.reduce((sum, t) => sum + t.strength_defence_away, 0) / teams.length;

    return {
      avgAttackHome,
      avgAttackAway,
      avgDefenseHome,
      avgDefenseAway,
    };
  }

  calculateOpponentAdjustedXG(
    playerXG: number,
    opponentDefenseStrength: number,
    avgDefenseStrength: number,
    isHome: boolean
  ): number {
    const relativeDefenseStrength = opponentDefenseStrength / avgDefenseStrength;
    const difficultyMultiplier = 1 / relativeDefenseStrength;

    const homeAdvantage = isHome ? 1.15 : 0.95;

    return playerXG * difficultyMultiplier * homeAdvantage;
  }
}

export const statisticalModels = new StatisticalModels();
