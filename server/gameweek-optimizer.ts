import { statisticalPredictor } from "./statistical-predictor";
import type { FPLPlayer, FPLFixture, FPLTeam } from "@shared/schema";

interface BenchOptimization {
  bench: FPLPlayer[];
  starting11: FPLPlayer[];
  expectedBenchPoints: number;
  reasoning: string;
}

interface ChipTiming {
  chip: "wildcard" | "freehit" | "benchboost" | "triplecaptain";
  recommendedGameweek: number;
  reasoning: string;
  expectedValue: number;
  confidence: number;
}

interface GameweekPlan {
  gameweek: number;
  lineup: {
    starting11: FPLPlayer[];
    bench: FPLPlayer[];
    captain: FPLPlayer;
    viceCaptain: FPLPlayer;
  };
  chipRecommendation?: ChipTiming;
  expectedPoints: number;
  benchOptimization: BenchOptimization;
}

export class GameweekOptimizer {
  async optimizeBench(
    squad: FPLPlayer[],
    fixtures: FPLFixture[],
    teams: FPLTeam[],
    gameweek: number
  ): Promise<BenchOptimization> {
    const predictions = await Promise.all(
      squad.map(async player => {
        const upcomingFixture = fixtures.filter(
          f => !f.finished && f.event === gameweek && (f.team_h === player.team || f.team_a === player.team)
        );
        const prediction = await statisticalPredictor.predictPlayerPointsStatistical(player, upcomingFixture, teams);
        return { player, prediction: prediction.predicted_points };
      })
    );

    const byPosition = {
      1: predictions.filter(p => p.player.element_type === 1),
      2: predictions.filter(p => p.player.element_type === 2),
      3: predictions.filter(p => p.player.element_type === 3),
      4: predictions.filter(p => p.player.element_type === 4),
    };

    for (const pos of [1, 2, 3, 4]) {
      byPosition[pos].sort((a, b) => b.prediction - a.prediction);
    }

    const starting11: FPLPlayer[] = [];
    const bench: FPLPlayer[] = [];

    starting11.push(byPosition[1][0].player);
    if (byPosition[1][1]) bench.push(byPosition[1][1].player);

    const defenders = byPosition[2].slice(0, 5);
    starting11.push(...defenders.slice(0, 3).map(p => p.player));
    bench.push(...defenders.slice(3).map(p => p.player));

    const midfielders = byPosition[3].slice(0, 5);
    starting11.push(...midfielders.slice(0, 3).map(p => p.player));
    bench.push(...midfielders.slice(3).map(p => p.player));

    const forwards = byPosition[4].slice(0, 3);
    starting11.push(...forwards.slice(0, 2).map(p => p.player));
    bench.push(...forwards.slice(2).map(p => p.player));

    while (starting11.length < 11) {
      const remaining = predictions.filter(
        p => !starting11.includes(p.player) && !bench.includes(p.player)
      );
      if (remaining.length === 0) break;
      remaining.sort((a, b) => b.prediction - a.prediction);
      starting11.push(remaining[0].player);
    }

    const expectedBenchPoints = bench.reduce((sum, player) => {
      const pred = predictions.find(p => p.player.id === player.id);
      return sum + (pred?.prediction || 0);
    }, 0);

    const reasoning = `Optimized bench based on predicted points. Expected bench points: ${expectedBenchPoints.toFixed(1)}. Consider Bench Boost if expecting ${(expectedBenchPoints / 4).toFixed(1)}+ points per bench player.`;

    return {
      bench,
      starting11,
      expectedBenchPoints,
      reasoning,
    };
  }

  async recommendChipTiming(
    currentGameweek: number,
    remainingChips: string[],
    fixtures: FPLFixture[]
  ): Promise<ChipTiming[]> {
    const recommendations: ChipTiming[] = [];

    const doubleGameweeks = this.identifyDoubleGameweeks(fixtures);
    const blankGameweeks = this.identifyBlankGameweeks(fixtures);

    if (remainingChips.includes("benchboost")) {
      const bestDgw = doubleGameweeks.find(gw => gw >= currentGameweek);
      if (bestDgw) {
        recommendations.push({
          chip: "benchboost",
          recommendedGameweek: bestDgw,
          reasoning: `Double gameweek ${bestDgw} - maximize bench boost value with players having two matches`,
          expectedValue: 25,
          confidence: 85,
        });
      } else {
        recommendations.push({
          chip: "benchboost",
          recommendedGameweek: currentGameweek + 3,
          reasoning: "Use during a gameweek with favorable fixtures across your squad",
          expectedValue: 15,
          confidence: 60,
        });
      }
    }

    if (remainingChips.includes("triplecaptain")) {
      const bestDgw = doubleGameweeks.find(gw => gw >= currentGameweek);
      if (bestDgw) {
        recommendations.push({
          chip: "triplecaptain",
          recommendedGameweek: bestDgw,
          reasoning: `Double gameweek ${bestDgw} - triple captain a premium player with two fixtures`,
          expectedValue: 35,
          confidence: 90,
        });
      } else {
        recommendations.push({
          chip: "triplecaptain",
          recommendedGameweek: currentGameweek + 5,
          reasoning: "Wait for a favorable fixture for your premium captain option",
          expectedValue: 20,
          confidence: 70,
        });
      }
    }

    if (remainingChips.includes("freehit")) {
      const bestBlank = blankGameweeks.find(gw => gw >= currentGameweek);
      if (bestBlank) {
        recommendations.push({
          chip: "freehit",
          recommendedGameweek: bestBlank,
          reasoning: `Blank gameweek ${bestBlank} - use free hit to field a full team when many teams don't play`,
          expectedValue: 40,
          confidence: 95,
        });
      } else {
        recommendations.push({
          chip: "freehit",
          recommendedGameweek: currentGameweek + 8,
          reasoning: "Save for a blank gameweek or when your team has poor fixtures",
          expectedValue: 30,
          confidence: 65,
        });
      }
    }

    if (remainingChips.includes("wildcard")) {
      recommendations.push({
        chip: "wildcard",
        recommendedGameweek: currentGameweek + 2,
        reasoning: "Use when you need multiple transfers to navigate fixture swings or injury crises",
        expectedValue: 50,
        confidence: 75,
      });
    }

    return recommendations.sort((a, b) => b.expectedValue - a.expectedValue);
  }

  private identifyDoubleGameweeks(fixtures: FPLFixture[]): number[] {
    const gameweekCounts = new Map<number, Map<number, number>>();

    for (const fixture of fixtures) {
      if (!fixture.event || fixture.finished) continue;

      if (!gameweekCounts.has(fixture.event)) {
        gameweekCounts.set(fixture.event, new Map());
      }

      const gwMap = gameweekCounts.get(fixture.event)!;
      gwMap.set(fixture.team_h, (gwMap.get(fixture.team_h) || 0) + 1);
      gwMap.set(fixture.team_a, (gwMap.get(fixture.team_a) || 0) + 1);
    }

    const doubleGameweeks: number[] = [];
    for (const [gw, teamCounts] of gameweekCounts.entries()) {
      const teamsWithDoubles = Array.from(teamCounts.values()).filter(count => count >= 2).length;
      if (teamsWithDoubles >= 5) {
        doubleGameweeks.push(gw);
      }
    }

    return doubleGameweeks;
  }

  private identifyBlankGameweeks(fixtures: FPLFixture[]): number[] {
    const gameweekTeams = new Map<number, Set<number>>();

    for (const fixture of fixtures) {
      if (!fixture.event || fixture.finished) continue;

      if (!gameweekTeams.has(fixture.event)) {
        gameweekTeams.set(fixture.event, new Set());
      }

      gameweekTeams.get(fixture.event)!.add(fixture.team_h);
      gameweekTeams.get(fixture.event)!.add(fixture.team_a);
    }

    const blankGameweeks: number[] = [];
    for (const [gw, teams] of gameweekTeams.entries()) {
      if (teams.size < 14) {
        blankGameweeks.push(gw);
      }
    }

    return blankGameweeks;
  }

  async createOptimalGameweekPlan(
    squad: FPLPlayer[],
    fixtures: FPLFixture[],
    teams: FPLTeam[],
    gameweek: number,
    remainingChips: string[]
  ): Promise<GameweekPlan> {
    const benchOptimization = await this.optimizeBench(squad, fixtures, teams, gameweek);

    const predictions = await Promise.all(
      benchOptimization.starting11.map(async player => {
        const upcomingFixture = fixtures.filter(
          f => !f.finished && f.event === gameweek && (f.team_h === player.team || f.team_a === player.team)
        );
        const prediction = await statisticalPredictor.predictPlayerPointsStatistical(player, upcomingFixture, teams);
        return { player, prediction: prediction.predicted_points };
      })
    );

    predictions.sort((a, b) => b.prediction - a.prediction);

    const captain = predictions[0]?.player;
    const viceCaptain = predictions[1]?.player;

    const expectedPoints =
      predictions.reduce((sum, p) => sum + p.prediction, 0) + (predictions[0]?.prediction || 0);

    const chipRecommendations = await this.recommendChipTiming(gameweek, remainingChips, fixtures);

    return {
      gameweek,
      lineup: {
        starting11: benchOptimization.starting11,
        bench: benchOptimization.bench,
        captain: captain!,
        viceCaptain: viceCaptain!,
      },
      chipRecommendation: chipRecommendations[0],
      expectedPoints,
      benchOptimization,
    };
  }
}

export const gameweekOptimizer = new GameweekOptimizer();
