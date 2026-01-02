import type { CompetitorPrediction } from "./competitor-predictor";

export interface LeagueEntry {
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  last_rank: number;
  total: number;
  event_total?: number;
}

export interface ProjectedStanding {
  managerId: number;
  managerName: string;
  teamName: string;
  currentRank: number;
  currentPoints: number;
  predictedGWPoints: number;
  projectedPoints: number;
  projectedRank: number;
  rankChange: number;
  gapToFirst: number;
  gapToNext: number;
  isUser: boolean;
}

export interface LeagueProjectionResult {
  standings: ProjectedStanding[];
  userStanding: ProjectedStanding | null;
  insights: string[];
  winStrategy: string[];
}

interface CompetitorMap {
  [managerId: number]: {
    predictedPoints: number;
    managerName: string;
    teamName: string;
  };
}

class LeagueProjectionService {
  calculateProjection(
    currentStandings: LeagueEntry[],
    competitorPredictions: CompetitorPrediction[],
    userManagerId: number,
    userAIPlanPoints?: number,
    currentGameweek?: number
  ): LeagueProjectionResult {
    const predictionMap: CompetitorMap = {};
    
    competitorPredictions.forEach(pred => {
      predictionMap[pred.managerId] = {
        predictedPoints: pred.predictedPoints,
        managerName: pred.managerName,
        teamName: pred.teamName,
      };
    });

    const completedGameweeks = currentGameweek ? currentGameweek - 1 : 19;

    const projectedStandings = currentStandings.map(entry => {
      const prediction = predictionMap[entry.entry];
      let predictedGWPoints = prediction?.predictedPoints;
      
      if (predictedGWPoints === undefined || predictedGWPoints === 0) {
        const historicalPPG = completedGameweeks > 0 ? Math.round(entry.total / completedGameweeks) : 50;
        predictedGWPoints = historicalPPG;
      }
      
      if (entry.entry === userManagerId && userAIPlanPoints !== undefined) {
        predictedGWPoints = userAIPlanPoints;
      }
      
      const projectedPoints = entry.total + predictedGWPoints;
      
      return {
        managerId: entry.entry,
        managerName: entry.player_name,
        teamName: entry.entry_name,
        currentRank: entry.rank,
        currentPoints: entry.total,
        predictedGWPoints,
        projectedPoints,
        projectedRank: 0,
        rankChange: 0,
        gapToFirst: 0,
        gapToNext: 0,
        isUser: entry.entry === userManagerId,
      };
    });

    projectedStandings.sort((a, b) => b.projectedPoints - a.projectedPoints);

    projectedStandings.forEach((standing, index) => {
      standing.projectedRank = index + 1;
      standing.rankChange = standing.currentRank - standing.projectedRank;
    });

    const firstPlace = projectedStandings[0];
    projectedStandings.forEach(standing => {
      standing.gapToFirst = firstPlace.projectedPoints - standing.projectedPoints;
      
      const nextRankIndex = standing.projectedRank - 2;
      if (nextRankIndex >= 0) {
        standing.gapToNext = projectedStandings[nextRankIndex].projectedPoints - standing.projectedPoints;
      }
    });

    const userStanding = projectedStandings.find(s => s.isUser) || null;

    const insights = this.generateInsights(projectedStandings, userStanding);
    const winStrategy = this.generateWinStrategy(
      projectedStandings,
      userStanding,
      competitorPredictions
    );

    return {
      standings: projectedStandings,
      userStanding,
      insights,
      winStrategy,
    };
  }

  private generateInsights(
    standings: ProjectedStanding[],
    userStanding: ProjectedStanding | null
  ): string[] {
    const insights: string[] = [];

    if (!userStanding) return insights;

    if (userStanding.rankChange > 0) {
      insights.push(
        `📈 You're projected to climb ${userStanding.rankChange} position${userStanding.rankChange > 1 ? 's' : ''} to ${this.getOrdinal(userStanding.projectedRank)} place!`
      );
    } else if (userStanding.rankChange < 0) {
      insights.push(
        `📉 You're at risk of dropping ${Math.abs(userStanding.rankChange)} position${Math.abs(userStanding.rankChange) > 1 ? 's' : ''} to ${this.getOrdinal(userStanding.projectedRank)} place.`
      );
    } else {
      insights.push(
        `📊 You're projected to maintain your current position at ${this.getOrdinal(userStanding.projectedRank)} place.`
      );
    }

    if (userStanding.projectedRank === 1) {
      insights.push('🏆 You\'re projected to take the lead! Keep up the momentum!');
    } else if (userStanding.gapToFirst <= 10) {
      insights.push(
        `🎯 You're only ${userStanding.gapToFirst} points behind 1st place. Victory is within reach!`
      );
    } else if (userStanding.gapToFirst <= 30) {
      insights.push(
        `⚡ ${userStanding.gapToFirst} points behind 1st. Consider differential picks to close the gap.`
      );
    } else {
      insights.push(
        `🚀 ${userStanding.gapToFirst} points behind 1st. You'll need high-risk differentials to catch up.`
      );
    }

    if (userStanding.gapToNext < 0 && Math.abs(userStanding.gapToNext) <= 5) {
      insights.push(
        `⚠️ Only ${Math.abs(userStanding.gapToNext)} points ahead of the manager below. Don't lose ground!`
      );
    }

    const bigMovers = standings.filter(s => Math.abs(s.rankChange) >= 3 && !s.isUser);
    if (bigMovers.length > 0) {
      const climber = bigMovers.find(s => s.rankChange > 0);
      if (climber) {
        insights.push(
          `🔥 Watch out for ${climber.teamName} - projected to climb ${climber.rankChange} positions!`
        );
      }
    }

    return insights;
  }

  private generateWinStrategy(
    standings: ProjectedStanding[],
    userStanding: ProjectedStanding | null,
    competitorPredictions: CompetitorPrediction[]
  ): string[] {
    const strategy: string[] = [];

    if (!userStanding) return strategy;

    const firstPlace = standings[0];
    const targetToFirst = userStanding.gapToFirst;

    if (userStanding.projectedRank === 1) {
      strategy.push(
        `✅ Maintain your lead by sticking with proven performers and avoiding unnecessary risks.`
      );
    } else if (targetToFirst <= 10) {
      strategy.push(
        `🎯 To catch 1st place: You need ${targetToFirst} extra points. Focus on high-upside captains and players with great fixtures.`
      );
    } else if (targetToFirst <= 30) {
      strategy.push(
        `⚡ To catch 1st place: You need ${targetToFirst} points. Consider 1-2 differential picks that leaders don't own.`
      );
    } else {
      strategy.push(
        `🚀 Big gap of ${targetToFirst} points to 1st. You need bold differentials and captaincy choices that your rivals don't have.`
      );
    }

    const nextRankUp = standings[userStanding.projectedRank - 2];
    if (nextRankUp && userStanding.projectedRank > 1) {
      const pointsNeeded = Math.abs(userStanding.gapToNext) + 1;
      strategy.push(
        `📊 To move up a position: Beat ${nextRankUp.teamName} who is predicted to score ${nextRankUp.predictedGWPoints} points. You need ${pointsNeeded}+ points.`
      );
    }

    const topCompetitors = competitorPredictions.slice(0, 3);
    if (topCompetitors.length > 0 && userStanding.projectedRank > 1) {
      const topCaptains = topCompetitors
        .map(c => c.captainId ? c.team.find(p => p.playerId === c.captainId)?.playerName : null)
        .filter(Boolean);
      
      if (topCaptains.length > 0) {
        const uniqueCaptains = Array.from(new Set(topCaptains));
        strategy.push(
          `👑 Top managers are captaining: ${uniqueCaptains.slice(0, 2).join(', ')}. Consider if a differential captain could give you an edge.`
        );
      }
    }

    const commonPlayers = this.findCommonPlayers(competitorPredictions.slice(0, 5));
    if (commonPlayers.length > 0) {
      strategy.push(
        `🔑 Essential picks among leaders: ${commonPlayers.slice(0, 3).join(', ')}. Make sure you have these covered.`
      );
    }

    return strategy;
  }

  private findCommonPlayers(predictions: CompetitorPrediction[]): string[] {
    const playerCounts = new Map<number, { count: number; name: string }>();

    predictions.forEach(pred => {
      pred.team.forEach(player => {
        const existing = playerCounts.get(player.playerId) || { count: 0, name: player.playerName };
        playerCounts.set(player.playerId, {
          count: existing.count + 1,
          name: player.playerName,
        });
      });
    });

    const threshold = Math.ceil(predictions.length * 0.6);

    return Array.from(playerCounts.entries())
      .filter(([_, data]) => data.count >= threshold)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([_, data]) => data.name);
  }

  private getOrdinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
}

export const leagueProjection = new LeagueProjectionService();
