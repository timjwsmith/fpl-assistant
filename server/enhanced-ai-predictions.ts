import { statisticalPredictor } from "./statistical-predictor";
import type { FPLPlayer, FPLFixture, FPLTeam, Prediction } from "@shared/schema";

export interface EnhancedPrediction extends Prediction {
  confidence_interval: {
    lower: number;
    upper: number;
  };
  prediction_models: {
    statistical: number;
    form_based: number;
    fixture_adjusted: number;
    ensemble: number;
  };
  risk_factors: string[];
}

class EnhancedAIPredictionService {
  async predictWithConfidenceInterval(
    player: FPLPlayer,
    upcomingFixtures: FPLFixture[],
    teams: FPLTeam[]
  ): Promise<EnhancedPrediction> {
    const basePrediction = await statisticalPredictor.predictPlayerPointsStatistical(
      player,
      upcomingFixtures,
      teams
    );

    const formBasedPrediction = this.calculateFormBasedPrediction(player);
    const fixtureAdjustedPrediction = this.calculateFixtureAdjustedPrediction(
      player,
      upcomingFixtures,
      teams
    );

    const models = {
      statistical: basePrediction.predicted_points,
      form_based: formBasedPrediction,
      fixture_adjusted: fixtureAdjustedPrediction,
      ensemble: 0,
    };

    models.ensemble = this.calculateEnsemblePrediction(models);

    const variance = this.calculatePredictionVariance(player, models);
    const stdDev = Math.sqrt(variance);
    const confidenceInterval = {
      lower: Math.max(0, models.ensemble - 1.96 * stdDev),
      upper: models.ensemble + 1.96 * stdDev,
    };

    const riskFactors = this.identifyRiskFactors(player, upcomingFixtures);

    return {
      player_id: player.id,
      predicted_points: models.ensemble,
      confidence: basePrediction.confidence,
      reasoning: this.generateEnhancedReasoning(player, models, riskFactors),
      fixtures_considered: basePrediction.fixtures_considered,
      confidence_interval: confidenceInterval,
      prediction_models: models,
      risk_factors: riskFactors,
    };
  }

  private calculateFormBasedPrediction(player: FPLPlayer): number {
    const form = parseFloat(player.form);
    const ppg = parseFloat(player.points_per_game);
    const recentWeight = 0.7;
    const seasonWeight = 0.3;
    return form * recentWeight + ppg * seasonWeight;
  }

  private calculateFixtureAdjustedPrediction(
    player: FPLPlayer,
    fixtures: FPLFixture[],
    teams: FPLTeam[]
  ): number {
    const nextFixture = fixtures[0];
    if (!nextFixture) return parseFloat(player.points_per_game);

    const isHome = nextFixture.team_h === player.team;
    const difficulty = isHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;

    const difficultyMultipliers: Record<number, number> = {
      1: 1.3,
      2: 1.15,
      3: 1.0,
      4: 0.85,
      5: 0.7,
    };

    const homeBonus = isHome ? 1.1 : 1.0;
    const ppg = parseFloat(player.points_per_game);

    return ppg * (difficultyMultipliers[difficulty] || 1.0) * homeBonus;
  }

  private calculateEnsemblePrediction(models: {
    statistical: number;
    form_based: number;
    fixture_adjusted: number;
  }): number {
    const weights = {
      statistical: 0.5,
      form_based: 0.25,
      fixture_adjusted: 0.25,
    };

    return (
      models.statistical * weights.statistical +
      models.form_based * weights.form_based +
      models.fixture_adjusted * weights.fixture_adjusted
    );
  }

  private calculatePredictionVariance(
    player: FPLPlayer,
    models: { statistical: number; form_based: number; fixture_adjusted: number }
  ): number {
    const predictions = [models.statistical, models.form_based, models.fixture_adjusted];
    const mean = predictions.reduce((sum, val) => sum + val, 0) / predictions.length;
    const squaredDiffs = predictions.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / predictions.length;

    const formFactor = Math.abs(parseFloat(player.form) - parseFloat(player.points_per_game));
    return variance + formFactor * 0.5;
  }

  private identifyRiskFactors(player: FPLPlayer, fixtures: FPLFixture[]): string[] {
    const risks: string[] = [];

    if (player.chance_of_playing_this_round !== null && player.chance_of_playing_this_round < 75) {
      risks.push(`Injury concern (${player.chance_of_playing_this_round}% chance)`);
    }

    if (player.yellow_cards >= 4) {
      risks.push(`Suspension risk (${player.yellow_cards} yellow cards)`);
    }

    const form = parseFloat(player.form);
    const ppg = parseFloat(player.points_per_game);
    if (form < ppg * 0.7) {
      risks.push(`Poor recent form (${form.toFixed(1)} vs ${ppg} PPG)`);
    }

    const nextFixture = fixtures[0];
    if (nextFixture) {
      const isHome = nextFixture.team_h === player.team;
      const difficulty = isHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;
      if (difficulty >= 4) {
        risks.push(`Difficult fixture (difficulty ${difficulty})`);
      }
    }

    const minutes = player.minutes;
    const gamesPlayed = player.total_points > 0 ? Math.ceil(minutes / 90) : 0;
    if (gamesPlayed > 0) {
      const minutesPerGame = minutes / gamesPlayed;
      if (minutesPerGame < 60) {
        risks.push(`Rotation risk (${minutesPerGame.toFixed(0)} mins/game)`);
      }
    }

    return risks;
  }

  private generateEnhancedReasoning(
    player: FPLPlayer,
    models: {
      statistical: number;
      form_based: number;
      fixture_adjusted: number;
      ensemble: number;
    },
    risks: string[]
  ): string {
    const parts: string[] = [];

    parts.push(
      `Ensemble prediction: ${models.ensemble.toFixed(1)} pts (Statistical: ${models.statistical.toFixed(1)}, Form: ${models.form_based.toFixed(1)}, Fixture: ${models.fixture_adjusted.toFixed(1)})`
    );

    if (risks.length > 0) {
      parts.push(`Risk factors: ${risks.join(", ")}`);
    } else {
      parts.push("No significant risk factors identified");
    }

    return parts.join(". ");
  }
}

export const enhancedAIPredictions = new EnhancedAIPredictionService();
