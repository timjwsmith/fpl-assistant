import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, TrendingUp } from "lucide-react";
import { useFPLFixtures, useFPLTeams, useFPLGameweeks } from "@/hooks/use-fpl-data";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";
import type { FPLFixture, FPLTeam } from "@shared/schema";

export default function Fixtures() {
  const { data: gameweeks } = useFPLGameweeks();
  const { data: fixtures, isLoading: loadingFixtures, error: fixturesError, refetch: refetchFixtures } = useFPLFixtures();
  const { data: teams, isLoading: loadingTeams, error: teamsError, refetch: refetchTeams } = useFPLTeams();

  const isLoading = loadingFixtures || loadingTeams;
  const error = fixturesError || teamsError;

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return "bg-chart-2/20 text-chart-2 border-chart-2/30";
    if (difficulty === 3) return "bg-chart-4/20 text-chart-4 border-chart-4/30";
    return "bg-destructive/20 text-destructive border-destructive/30";
  };

  if (isLoading) {
    return <LoadingScreen message="Loading fixtures..." />;
  }

  if (error) {
    return <ErrorState 
      message="Failed to load fixtures" 
      onRetry={() => {
        refetchFixtures();
        refetchTeams();
      }}
    />;
  }

  const currentGameweek = gameweeks?.find(gw => gw.is_current) || gameweeks?.[0];
  const currentGW = currentGameweek?.id || 1;

  // Get fixtures for next 6 gameweeks
  const upcomingFixtures = fixtures?.filter(f => 
    f.event && f.event >= currentGW && f.event < currentGW + 6
  ) || [];

  // Group fixtures by team and gameweek
  const teamFixtures: Record<number, Record<number, FPLFixture>> = {};
  upcomingFixtures.forEach(fixture => {
    if (!fixture.event) return;
    
    // Home team
    if (!teamFixtures[fixture.team_h]) teamFixtures[fixture.team_h] = {};
    teamFixtures[fixture.team_h][fixture.event] = fixture;
    
    // Away team
    if (!teamFixtures[fixture.team_a]) teamFixtures[fixture.team_a] = {};
    teamFixtures[fixture.team_a][fixture.event] = fixture;
  });

  // Get best and worst fixtures
  const fixtureAnalysis = upcomingFixtures.map(f => ({
    fixture: f,
    homeTeam: teams?.find((t: FPLTeam) => t.id === f.team_h),
    awayTeam: teams?.find((t: FPLTeam) => t.id === f.team_a),
    avgDifficulty: (f.team_h_difficulty + f.team_a_difficulty) / 2,
  }));

  const bestFixtures = fixtureAnalysis
    .sort((a, b) => a.avgDifficulty - b.avgDifficulty)
    .slice(0, 3);

  const toughFixtures = fixtureAnalysis
    .sort((a, b) => b.avgDifficulty - a.avgDifficulty)
    .slice(0, 3);

  return (
    <div className="space-y-8" data-testid="page-fixtures">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Fixture Planner</h1>
        <p className="text-muted-foreground mt-2">
          Analyze upcoming fixtures and plan your transfers for optimal returns.
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview" data-testid="tab-overview">
            6-Week Overview
          </TabsTrigger>
          <TabsTrigger value="team" data-testid="tab-team">
            By Team
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Fixture Difficulty (Next 6 Gameweeks)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Team</th>
                      {Array.from({ length: 6 }, (_, i) => currentGW + i).map((gw) => (
                        <th key={gw} className="text-center p-3 font-semibold" data-testid={`header-gw-${gw}`}>
                          GW{gw}
                        </th>
                      ))}
                      <th className="text-center p-3 font-semibold">Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams?.slice(0, 20).map((team: FPLTeam, i: number) => {
                      const difficulties: number[] = [];
                      
                      return (
                        <tr key={team.id} className="border-b hover:bg-muted/50" data-testid={`row-team-${i}`}>
                          <td className="p-3 font-medium">{team.short_name}</td>
                          {Array.from({ length: 6 }, (_, j) => currentGW + j).map((gw) => {
                            const fixture = teamFixtures[team.id]?.[gw];
                            const difficulty = fixture 
                              ? (fixture.team_h === team.id ? fixture.team_h_difficulty : fixture.team_a_difficulty)
                              : 0;
                            
                            if (difficulty > 0) difficulties.push(difficulty);

                            return (
                              <td key={gw} className="p-3 text-center">
                                {difficulty > 0 ? (
                                  <Badge
                                    variant="outline"
                                    className={`text-xs border ${getDifficultyColor(difficulty)}`}
                                    data-testid={`difficulty-${i}-${gw}`}
                                  >
                                    {difficulty}
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">-</span>
                                )}
                              </td>
                            );
                          })}
                          <td className="p-3 text-center font-semibold font-mono">
                            {difficulties.length > 0 
                              ? (difficulties.reduce((a, b) => a + b, 0) / difficulties.length).toFixed(1)
                              : '-'
                            }
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-chart-2/50 bg-chart-2/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-chart-2" />
                  Best Fixtures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bestFixtures.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-md bg-card border" data-testid={`best-fixture-${i}`}>
                      <div>
                        <p className="font-semibold">
                          {item.homeTeam?.short_name} vs {item.awayTeam?.short_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          GW{item.fixture.event}
                        </p>
                      </div>
                      <Badge variant="outline" className={`border ${getDifficultyColor(Math.round(item.avgDifficulty))}`}>
                        {item.avgDifficulty.toFixed(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-destructive rotate-180" />
                  Tough Fixtures
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {toughFixtures.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-md bg-card border" data-testid={`tough-fixture-${i}`}>
                      <div>
                        <p className="font-semibold">
                          {item.homeTeam?.short_name} vs {item.awayTeam?.short_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          GW{item.fixture.event}
                        </p>
                      </div>
                      <Badge variant="outline" className={`border ${getDifficultyColor(Math.round(item.avgDifficulty))}`}>
                        {item.avgDifficulty.toFixed(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="team" className="space-y-4 mt-6">
          <div className="text-center py-12 text-muted-foreground">
            <p>Select a team to view detailed fixture analysis</p>
            <p className="text-sm mt-1">Team-specific insights coming soon</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
