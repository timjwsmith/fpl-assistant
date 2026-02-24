import type { FPLPlayer, FPLFixture, FPLTeam } from "@shared/schema";

interface DifferentialPlayer {
  player: FPLPlayer;
  ownership: number;
  form: number;
  upcomingFixtures: string[];
  score: number;
}

interface TemplatePlayer {
  player: FPLPlayer;
  ownership: number;
  eo: number;
  mustHave: boolean;
}

interface CaptaincySwing {
  player: FPLPlayer;
  expectedPoints: number;
  ownership: number;
  swingPotential: number;
  risk: "low" | "medium" | "high";
}

export class InsightsGenerator {
  async findDifferentials(
    allPlayers: FPLPlayer[],
    fixtures: FPLFixture[],
    teams: FPLTeam[],
    maxOwnership: number = 10
  ): Promise<DifferentialPlayer[]> {
    const differentials = allPlayers
      .filter(p => {
        const ownership = parseFloat(p.selected_by_percent);
        const form = parseFloat(p.form);
        return (
          ownership < maxOwnership &&
          ownership > 1 &&
          form > 4 &&
          p.status === 'a' &&
          p.chance_of_playing_this_round !== 0
        );
      })
      .map(p => {
        const team = teams.find(t => t.id === p.team);
        const upcomingFixtures = fixtures
          .filter(f => !f.finished && f.event && (f.team_h === p.team || f.team_a === p.team))
          .slice(0, 3)
          .map(f => {
            const isHome = f.team_h === p.team;
            const opponent = teams.find(t => t.id === (isHome ? f.team_a : f.team_h));
            const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
            return `${isHome ? 'H' : 'A'} ${opponent?.short_name || 'TBD'} (${difficulty})`;
          });

        const avgDifficulty =
          upcomingFixtures.length > 0
            ? fixtures
                .filter(f => !f.finished && f.event && (f.team_h === p.team || f.team_a === p.team))
                .slice(0, 3)
                .reduce((sum, f) => {
                  const difficulty = f.team_h === p.team ? f.team_h_difficulty : f.team_a_difficulty;
                  return sum + difficulty;
                }, 0) / 3
            : 3;

        const form = parseFloat(p.form);
        const ppg = parseFloat(p.points_per_game);
        const ict = parseFloat(p.ict_index || '0');
        const xGI = parseFloat(p.expected_goal_involvements || '0');

        const score =
          form * 0.3 +
          ppg * 0.25 +
          (ict / 100) * 0.2 +
          xGI * 0.15 +
          (5 - avgDifficulty) * 0.1;

        return {
          player: p,
          ownership: parseFloat(p.selected_by_percent),
          form,
          upcomingFixtures,
          score,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return differentials;
  }

  async findTemplatePlayers(
    allPlayers: FPLPlayer[],
    minOwnership: number = 40
  ): Promise<TemplatePlayer[]> {
    const templatePlayers = allPlayers
      .filter(p => {
        const ownership = parseFloat(p.selected_by_percent);
        return (
          ownership >= minOwnership &&
          p.status === 'a' &&
          p.chance_of_playing_this_round !== 0
        );
      })
      .map(p => {
        const ownership = parseFloat(p.selected_by_percent);
        const eo = ownership * 1.1;
        const ppg = parseFloat(p.points_per_game);
        const mustHave = ownership > 60 && ppg > 5;

        return {
          player: p,
          ownership,
          eo,
          mustHave,
        };
      })
      .sort((a, b) => b.ownership - a.ownership);

    return templatePlayers;
  }

  async analyzeCaptaincySwings(
    players: FPLPlayer[],
    fixtures: FPLFixture[],
    teams: FPLTeam[],
    currentGameweek: number
  ): Promise<CaptaincySwing[]> {
    const topCandidates = players
      .filter(p => {
        const form = parseFloat(p.form);
        return (
          form > 4 &&
          p.status === 'a' &&
          p.chance_of_playing_this_round !== 0 &&
          p.total_points > 30
        );
      })
      .slice(0, 20);

    const swings: CaptaincySwing[] = [];

    for (const player of topCandidates) {
      const nextFixture = fixtures.find(
        f => !f.finished && f.event === currentGameweek && (f.team_h === player.team || f.team_a === player.team)
      );

      if (!nextFixture) continue;

      const isHome = nextFixture.team_h === player.team;
      const difficulty = isHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;
      const ownership = parseFloat(player.selected_by_percent);

      const basePoints = parseFloat(player.points_per_game);
      const difficultyMultiplier = difficulty === 1 ? 1.3 : difficulty === 2 ? 1.15 : difficulty === 3 ? 1.0 : difficulty === 4 ? 0.85 : 0.7;
      const homeMultiplier = isHome ? 1.1 : 1.0;
      const expectedPoints = basePoints * difficultyMultiplier * homeMultiplier;

      const ownershipFactor = ownership < 30 ? "high" : ownership < 60 ? "medium" : "low";
      const swingPotential = ownership < 30 ? expectedPoints * 0.8 : ownership < 60 ? expectedPoints * 0.5 : expectedPoints * 0.3;

      swings.push({
        player,
        expectedPoints,
        ownership,
        swingPotential,
        risk: ownershipFactor,
      });
    }

    return swings.sort((a, b) => b.swingPotential - a.swingPotential).slice(0, 5);
  }

  async generateWeeklyInsights(
    allPlayers: FPLPlayer[],
    fixtures: FPLFixture[],
    teams: FPLTeam[],
    currentGameweek: number
  ): Promise<{
    differentials: DifferentialPlayer[];
    template: TemplatePlayer[];
    captaincySwings: CaptaincySwing[];
  }> {
    const [differentials, template, captaincySwings] = await Promise.all([
      this.findDifferentials(allPlayers, fixtures, teams),
      this.findTemplatePlayers(allPlayers),
      this.analyzeCaptaincySwings(allPlayers, fixtures, teams, currentGameweek),
    ]);

    return {
      differentials,
      template,
      captaincySwings,
    };
  }
}

export const insightsGenerator = new InsightsGenerator();
