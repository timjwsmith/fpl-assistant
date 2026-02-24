import type { FPLTeam, FPLFixture } from "@shared/schema";

export interface OpponentStrengthMetrics {
  teamId: number;
  attackStrengthHome: number;
  attackStrengthAway: number;
  defenseStrengthHome: number;
  defenseStrengthAway: number;
  overallStrength: number;
  recentForm: number;
  fixtureRating: number;
}

export interface FixtureDifficulty {
  fixtureId: number;
  teamId: number;
  opponentId: number;
  isHome: boolean;
  difficulty: number;
  attackDifficulty: number;
  defenseDifficulty: number;
  rating: 'easy' | 'moderate' | 'difficult' | 'very_difficult';
}

export class OpponentStrengthAnalyzer {
  analyzeTeamStrength(team: FPLTeam, allTeams: FPLTeam[]): OpponentStrengthMetrics {
    const avgAttackHome = allTeams.reduce((sum, t) => sum + t.strength_attack_home, 0) / allTeams.length;
    const avgAttackAway = allTeams.reduce((sum, t) => sum + t.strength_attack_away, 0) / allTeams.length;
    const avgDefenseHome = allTeams.reduce((sum, t) => sum + t.strength_defence_home, 0) / allTeams.length;
    const avgDefenseAway = allTeams.reduce((sum, t) => sum + t.strength_defence_away, 0) / allTeams.length;

    const relativeAttackHome = team.strength_attack_home / avgAttackHome;
    const relativeAttackAway = team.strength_attack_away / avgAttackAway;
    const relativeDefenseHome = team.strength_defence_home / avgDefenseHome;
    const relativeDefenseAway = team.strength_defence_away / avgDefenseAway;

    const overallStrength =
      (relativeAttackHome + relativeAttackAway + relativeDefenseHome + relativeDefenseAway) / 4;

    const recentForm = team.strength || 3;

    const fixtureRating = (overallStrength + recentForm / 5) / 2;

    return {
      teamId: team.id,
      attackStrengthHome: team.strength_attack_home,
      attackStrengthAway: team.strength_attack_away,
      defenseStrengthHome: team.strength_defence_home,
      defenseStrengthAway: team.strength_defence_away,
      overallStrength,
      recentForm,
      fixtureRating,
    };
  }

  analyzeFixtureDifficulty(
    fixture: FPLFixture,
    teamId: number,
    allTeams: FPLTeam[]
  ): FixtureDifficulty {
    const isHome = fixture.team_h === teamId;
    const opponentId = isHome ? fixture.team_a : fixture.team_h;

    const opponent = allTeams.find(t => t.id === opponentId);
    if (!opponent) {
      return {
        fixtureId: fixture.id,
        teamId,
        opponentId,
        isHome,
        difficulty: 3,
        attackDifficulty: 3,
        defenseDifficulty: 3,
        rating: 'moderate',
      };
    }

    const opponentMetrics = this.analyzeTeamStrength(opponent, allTeams);

    const opponentAttackStrength = isHome
      ? opponentMetrics.attackStrengthAway
      : opponentMetrics.attackStrengthHome;

    const opponentDefenseStrength = isHome
      ? opponentMetrics.defenseStrengthAway
      : opponentMetrics.defenseStrengthHome;

    const avgAttack = allTeams.reduce(
      (sum, t) => sum + (isHome ? t.strength_attack_away : t.strength_attack_home),
      0
    ) / allTeams.length;

    const avgDefense = allTeams.reduce(
      (sum, t) => sum + (isHome ? t.strength_defence_away : t.strength_defence_home),
      0
    ) / allTeams.length;

    const attackDifficultyRaw = opponentDefenseStrength / avgDefense;
    const defenseDifficultyRaw = opponentAttackStrength / avgAttack;

    const attackDifficulty = Math.max(1, Math.min(5, Math.round(attackDifficultyRaw * 3)));
    const defenseDifficulty = Math.max(1, Math.min(5, Math.round(defenseDifficultyRaw * 3)));

    const overallDifficulty = Math.round((attackDifficulty + defenseDifficulty) / 2);

    let rating: FixtureDifficulty['rating'];
    if (overallDifficulty <= 2) {
      rating = 'easy';
    } else if (overallDifficulty === 3) {
      rating = 'moderate';
    } else if (overallDifficulty === 4) {
      rating = 'difficult';
    } else {
      rating = 'very_difficult';
    }

    return {
      fixtureId: fixture.id,
      teamId,
      opponentId,
      isHome,
      difficulty: overallDifficulty,
      attackDifficulty,
      defenseDifficulty,
      rating,
    };
  }

  analyzeFixtureRun(
    teamId: number,
    fixtures: FPLFixture[],
    allTeams: FPLTeam[],
    numFixtures: number = 5
  ): {
    averageDifficulty: number;
    averageAttackDifficulty: number;
    averageDefenseDifficulty: number;
    fixtureRating: 'excellent' | 'good' | 'mixed' | 'tough';
    fixtures: FixtureDifficulty[];
  } {
    const relevantFixtures = fixtures
      .filter(f => f.team_h === teamId || f.team_a === teamId)
      .slice(0, numFixtures);

    const analyzedFixtures = relevantFixtures.map(f =>
      this.analyzeFixtureDifficulty(f, teamId, allTeams)
    );

    if (analyzedFixtures.length === 0) {
      return {
        averageDifficulty: 3,
        averageAttackDifficulty: 3,
        averageDefenseDifficulty: 3,
        fixtureRating: 'mixed',
        fixtures: [],
      };
    }

    const avgDifficulty =
      analyzedFixtures.reduce((sum, f) => sum + f.difficulty, 0) / analyzedFixtures.length;

    const avgAttackDifficulty =
      analyzedFixtures.reduce((sum, f) => sum + f.attackDifficulty, 0) / analyzedFixtures.length;

    const avgDefenseDifficulty =
      analyzedFixtures.reduce((sum, f) => sum + f.defenseDifficulty, 0) / analyzedFixtures.length;

    let fixtureRating: 'excellent' | 'good' | 'mixed' | 'tough';
    if (avgDifficulty <= 2.2) {
      fixtureRating = 'excellent';
    } else if (avgDifficulty <= 2.8) {
      fixtureRating = 'good';
    } else if (avgDifficulty <= 3.5) {
      fixtureRating = 'mixed';
    } else {
      fixtureRating = 'tough';
    }

    return {
      averageDifficulty: Math.round(avgDifficulty * 10) / 10,
      averageAttackDifficulty: Math.round(avgAttackDifficulty * 10) / 10,
      averageDefenseDifficulty: Math.round(avgDefenseDifficulty * 10) / 10,
      fixtureRating,
      fixtures: analyzedFixtures,
    };
  }

  recommendPlayersForFixtures(
    allTeams: FPLTeam[],
    fixtures: FPLFixture[],
    currentGameweek: number
  ): Array<{
    teamId: number;
    teamName: string;
    fixtureScore: number;
    reasoning: string;
  }> {
    const upcomingFixtures = fixtures.filter(
      f => f.event && f.event >= currentGameweek && f.event < currentGameweek + 5
    );

    const teamScores = allTeams.map(team => {
      const fixtureRun = this.analyzeFixtureRun(team.id, upcomingFixtures, allTeams, 5);

      const difficultyScore = (5 - fixtureRun.averageDifficulty) * 20;

      const teamStrength = this.analyzeTeamStrength(team, allTeams);
      const strengthScore = teamStrength.overallStrength * 30;

      const totalScore = difficultyScore + strengthScore;

      let reasoning = '';
      if (fixtureRun.fixtureRating === 'excellent') {
        reasoning = `Excellent fixtures (avg ${fixtureRun.averageDifficulty.toFixed(1)})`;
      } else if (fixtureRun.fixtureRating === 'good') {
        reasoning = `Good fixtures (avg ${fixtureRun.averageDifficulty.toFixed(1)})`;
      } else if (fixtureRun.fixtureRating === 'tough') {
        reasoning = `Tough fixtures (avg ${fixtureRun.averageDifficulty.toFixed(1)})`;
      } else {
        reasoning = `Mixed fixtures (avg ${fixtureRun.averageDifficulty.toFixed(1)})`;
      }

      return {
        teamId: team.id,
        teamName: team.name,
        fixtureScore: Math.round(totalScore),
        reasoning,
      };
    });

    return teamScores.sort((a, b) => b.fixtureScore - a.fixtureScore);
  }
}

export const opponentStrengthAnalyzer = new OpponentStrengthAnalyzer();
