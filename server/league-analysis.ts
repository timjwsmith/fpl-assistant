import { fplApi } from "./fpl-api";
import type { FPLPlayer } from "@shared/schema";

interface CompetitorAnalysis {
  managerId: number;
  teamName: string;
  managerName: string;
  totalPoints: number;
  rank: number;
  gameweekPoints: number;
  captain: number | null;
  viceCaptain: number | null;
  picks: number[];
  chipUsed: string | null;
}

interface LeagueInsights {
  userRank: number;
  leadersAnalysis: CompetitorAnalysis[];
  commonPicks: { playerId: number; count: number; playerName: string }[];
  differentials: { playerId: number; playerName: string; reason: string }[];
  strategicInsights: string[];
  gapToFirst: number;
  averageLeaguePoints: number;
}

class LeagueAnalysisService {
  async analyzeLeague(
    leagueId: number,
    userId: number,
    managerId: number,
    gameweek: number,
    players: FPLPlayer[]
  ): Promise<LeagueInsights | null> {
    try {
      console.log(`[LEAGUE ANALYSIS] Analyzing league ${leagueId} for user ${managerId}`);
      
      // Fetch league standings
      const standings = await fplApi.getLeagueStandings(leagueId);
      const entries = standings.standings?.results || [];
      
      if (entries.length === 0) {
        console.log("[LEAGUE ANALYSIS] No entries found in league");
        return null;
      }

      // Find user's position
      const userEntry = entries.find((e: any) => e.entry === managerId);
      if (!userEntry) {
        console.log("[LEAGUE ANALYSIS] User not found in league");
        return null;
      }

      const userRank = userEntry.rank;
      const firstPlace = entries[0];
      const gapToFirst = firstPlace.total - userEntry.total;

      // Get top 5 competitors (or top 3 if league is small)
      const topCount = Math.min(5, entries.length);
      const topEntries = entries.slice(0, topCount).filter((e: any) => e.entry !== managerId);
      
      console.log(`[LEAGUE ANALYSIS] Analyzing top ${topEntries.length} competitors`);

      // Fetch each competitor's team picks for current gameweek
      const competitorAnalyses: CompetitorAnalysis[] = [];
      
      for (const entry of topEntries) {
        try {
          const picks = await fplApi.getManagerPicks(entry.entry, gameweek);
          const gwPoints = picks.entry_history?.points || 0;
          const captain = picks.picks.find((p: any) => p.is_captain)?.element || null;
          const viceCaptain = picks.picks.find((p: any) => p.is_vice_captain)?.element || null;
          const playerIds = picks.picks.map((p: any) => p.element);

          competitorAnalyses.push({
            managerId: entry.entry,
            teamName: entry.entry_name,
            managerName: entry.player_name,
            totalPoints: entry.total,
            rank: entry.rank,
            gameweekPoints: gwPoints,
            captain,
            viceCaptain,
            picks: playerIds,
            chipUsed: picks.chips || null,
          });
        } catch (error) {
          console.error(`[LEAGUE ANALYSIS] Error fetching picks for ${entry.entry}:`, error);
        }
      }

      // Analyze common picks among leaders
      const pickCounts = new Map<number, number>();
      competitorAnalyses.forEach((comp) => {
        comp.picks.forEach((playerId) => {
          pickCounts.set(playerId, (pickCounts.get(playerId) || 0) + 1);
        });
      });

      const commonPicks = Array.from(pickCounts.entries())
        .filter(([_, count]) => count >= Math.ceil(competitorAnalyses.length * 0.6)) // 60%+ ownership
        .map(([playerId, count]) => {
          const player = players.find((p) => p.id === playerId);
          return {
            playerId,
            count,
            playerName: player?.web_name || `Player ${playerId}`,
          };
        })
        .sort((a, b) => b.count - a.count);

      // Identify differentials (owned by <40% of leaders)
      const allTopPicks = new Set<number>();
      competitorAnalyses.forEach((comp) => comp.picks.forEach((p) => allTopPicks.add(p)));
      
      const potentialDifferentials = players
        .filter((p) => {
          const leaderOwnership = (pickCounts.get(p.id) || 0) / competitorAnalyses.length;
          return leaderOwnership < 0.4 && parseFloat(p.form) > 3 && p.total_points > 15;
        })
        .slice(0, 5)
        .map((p) => ({
          playerId: p.id,
          playerName: p.web_name,
          reason: `Form ${p.form}, owned by ${Math.round(((pickCounts.get(p.id) || 0) / competitorAnalyses.length) * 100)}% of leaders`,
        }));

      // Generate strategic insights
      const insights: string[] = [];
      
      if (gapToFirst > 50) {
        insights.push(`You're ${gapToFirst} points behind first place. Consider differential picks and calculated risks to close the gap.`);
      } else if (gapToFirst > 20) {
        insights.push(`You're ${gapToFirst} points behind the leader. Small differential picks could help you climb the rankings.`);
      } else if (gapToFirst <= 5) {
        insights.push(`You're very close to first place (${gapToFirst} points behind)! Stay consistent and avoid risky moves.`);
      }

      const mostCommonCaptain = competitorAnalyses
        .map((c) => c.captain)
        .filter((c): c is number => c !== null)
        .reduce((acc, captainId) => {
          acc[captainId] = (acc[captainId] || 0) + 1;
          return acc;
        }, {} as Record<number, number>);

      const topCaptainId = Object.entries(mostCommonCaptain).sort(([, a], [, b]) => b - a)[0]?.[0];
      if (topCaptainId) {
        const captainPlayer = players.find((p) => p.id === parseInt(topCaptainId));
        const captainCount = mostCommonCaptain[parseInt(topCaptainId)];
        insights.push(
          `${captainCount}/${competitorAnalyses.length} top managers are captaining ${captainPlayer?.web_name || 'a popular player'}. Consider if this is a differential opportunity.`
        );
      }

      if (commonPicks.length > 0) {
        insights.push(
          `Essential picks among leaders: ${commonPicks.slice(0, 3).map((p) => p.playerName).join(", ")}. Missing these could hurt your ranking.`
        );
      }

      const avgPoints = entries.reduce((sum: number, e: any) => sum + e.total, 0) / entries.length;

      console.log(`[LEAGUE ANALYSIS] Analysis complete. User rank: ${userRank}, Gap to first: ${gapToFirst}`);

      return {
        userRank,
        leadersAnalysis: competitorAnalyses,
        commonPicks,
        differentials: potentialDifferentials,
        strategicInsights: insights,
        gapToFirst,
        averageLeaguePoints: Math.round(avgPoints),
      };
    } catch (error) {
      console.error("[LEAGUE ANALYSIS] Error analyzing league:", error);
      return null;
    }
  }
}

export const leagueAnalysis = new LeagueAnalysisService();
