import { statisticalPredictor } from "./statistical-predictor";
import type { FPLPlayer, FPLFixture, FPLTeam, TransferRecommendation } from "@shared/schema";

interface TransferValue {
  playerId: number;
  valueScore: number;
  priceChangeRisk: "rising" | "falling" | "stable";
  roi3gw: number;
  roi5gw: number;
}

interface WildcardPlan {
  targetPlayers: FPLPlayer[];
  playersOut: FPLPlayer[];
  totalValue: number;
  projectedPoints3gw: number;
  projectedPoints5gw: number;
  riskLevel: "conservative" | "balanced" | "aggressive";
  reasoning: string;
}

export class TransferAnalyzer {
  async analyzeTransferValue(
    player: FPLPlayer,
    fixtures: FPLFixture[],
    teams: FPLTeam[],
    horizon: number = 5
  ): Promise<TransferValue> {
    const upcomingFixtures = fixtures
      .filter(f => !f.finished && f.event && (f.team_h === player.team || f.team_a === player.team))
      .slice(0, horizon);

    const prediction3gw = await statisticalPredictor.predictMultipleGameweeks(
      player,
      upcomingFixtures.slice(0, 3),
      teams,
      3
    );
    const prediction5gw = await statisticalPredictor.predictMultipleGameweeks(
      player,
      upcomingFixtures.slice(0, 5),
      teams,
      5
    );

    const price = player.now_cost / 10;
    const roi3gw = prediction3gw.totalPoints / price;
    const roi5gw = prediction5gw.totalPoints / price;

    const priceChangeRisk = this.assessPriceChangeRisk(player);

    const valueScore = roi5gw * 10 + (priceChangeRisk === "rising" ? 5 : priceChangeRisk === "falling" ? -5 : 0);

    return {
      playerId: player.id,
      valueScore,
      priceChangeRisk,
      roi3gw,
      roi5gw,
    };
  }

  private assessPriceChangeRisk(player: FPLPlayer): "rising" | "falling" | "stable" {
    const transfersInDelta = player.transfers_in_event - player.transfers_out_event;
    const ownership = parseFloat(player.selected_by_percent);
    const form = parseFloat(player.form);

    if (transfersInDelta > 50000 || (form > 6 && ownership < 20)) {
      return "rising";
    } else if (transfersInDelta < -50000 || (form < 3 && ownership > 10)) {
      return "falling";
    }
    return "stable";
  }

  async enhanceTransferRecommendations(
    recommendations: TransferRecommendation[],
    allPlayers: FPLPlayer[],
    fixtures: FPLFixture[],
    teams: FPLTeam[]
  ): Promise<
    Array<
      TransferRecommendation & {
        value_analysis: TransferValue;
      }
    >
  > {
    const enhanced = await Promise.all(
      recommendations.map(async rec => {
        const playerIn = allPlayers.find(p => p.id === rec.player_in_id);
        if (!playerIn) return { ...rec, value_analysis: null };

        const valueAnalysis = await this.analyzeTransferValue(playerIn, fixtures, teams);

        return {
          ...rec,
          value_analysis: valueAnalysis,
        };
      })
    );

    return enhanced.filter(e => e.value_analysis !== null) as Array<
      TransferRecommendation & { value_analysis: TransferValue }
    >;
  }

  async generateWildcardPlan(
    currentSquad: FPLPlayer[],
    allPlayers: FPLPlayer[],
    fixtures: FPLFixture[],
    teams: FPLTeam[],
    budget: number,
    riskProfile: "conservative" | "balanced" | "aggressive" = "balanced"
  ): Promise<WildcardPlan> {
    const availablePlayers = allPlayers.filter(
      p =>
        !currentSquad.some(cp => cp.id === p.id) &&
        p.status === 'a' &&
        p.chance_of_playing_this_round !== 0
    );

    const playerValues = await Promise.all(
      availablePlayers.map(async p => ({
        player: p,
        value: await this.analyzeTransferValue(p, fixtures, teams, 5),
      }))
    );

    const sortedByValue = playerValues.sort((a, b) => b.value.valueScore - a.value.valueScore);

    const targetsByPosition = {
      1: 2,
      2: 5,
      3: 5,
      4: 3,
    };

    const selectedPlayers: FPLPlayer[] = [];
    let remainingBudget = budget;

    for (const [positionStr, count] of Object.entries(targetsByPosition)) {
      const position = parseInt(positionStr);
      const positionPlayers = sortedByValue
        .filter(pv => pv.player.element_type === position && pv.player.now_cost / 10 <= remainingBudget)
        .slice(0, count * 2);

      const ownershipThreshold = riskProfile === "conservative" ? 30 : riskProfile === "balanced" ? 15 : 5;

      const picks = positionPlayers.slice(0, count).map(pv => pv.player);

      for (const pick of picks) {
        if (selectedPlayers.length < 15 && remainingBudget >= pick.now_cost / 10) {
          selectedPlayers.push(pick);
          remainingBudget -= pick.now_cost / 10;
        }
      }
    }

    const totalValue = selectedPlayers.reduce((sum, p) => sum + p.now_cost / 10, 0);

    const projections = await Promise.all(
      selectedPlayers.map(p => {
        const upcomingFixtures = fixtures
          .filter(f => !f.finished && f.event && (f.team_h === p.team || f.team_a === p.team))
          .slice(0, 5);
        return Promise.all([
          statisticalPredictor.predictMultipleGameweeks(p, upcomingFixtures.slice(0, 3), teams, 3),
          statisticalPredictor.predictMultipleGameweeks(p, upcomingFixtures.slice(0, 5), teams, 5),
        ]);
      })
    );

    const projectedPoints3gw = projections.reduce((sum, [pred3]) => sum + pred3.totalPoints, 0);
    const projectedPoints5gw = projections.reduce((sum, [, pred5]) => sum + pred5.totalPoints, 0);

    const avgOwnership =
      selectedPlayers.reduce((sum, p) => sum + parseFloat(p.selected_by_percent), 0) / selectedPlayers.length;
    const reasoning = `${riskProfile.charAt(0).toUpperCase() + riskProfile.slice(1)} wildcard strategy selecting ${selectedPlayers.length} players with average ownership ${avgOwnership.toFixed(1)}%. Projected ${projectedPoints3gw.toFixed(0)} points over next 3 GWs, ${projectedPoints5gw.toFixed(0)} over 5 GWs.`;

    return {
      targetPlayers: selectedPlayers,
      playersOut: currentSquad,
      totalValue,
      projectedPoints3gw,
      projectedPoints5gw,
      riskLevel: riskProfile,
      reasoning,
    };
  }
}

export const transferAnalyzer = new TransferAnalyzer();
