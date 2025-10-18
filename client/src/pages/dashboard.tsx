import { Trophy, Target, Calendar, Repeat, Sparkles, TrendingUp, DollarSign } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import { useFPLGameweeks, useFPLPlayers, useFPLTeams, useFPLFixtures } from "@/hooks/use-fpl-data";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";
import { useQuery } from "@tanstack/react-query";
import type { FPLPlayer, FPLTeam, FPLGameweek, FPLFixture, UserSettings } from "@shared/schema";

export default function Dashboard() {
  const userId = 1;
  const { data: gameweeks, isLoading: loadingGameweeks, error: gameweeksError, refetch: refetchGameweeks } = useFPLGameweeks();
  const { data: players, isLoading: loadingPlayers, error: playersError, refetch: refetchPlayers } = useFPLPlayers();
  const { data: teams, isLoading: loadingTeams, error: teamsError, refetch: refetchTeams } = useFPLTeams();
  const { data: fixtures, isLoading: loadingFixtures, error: fixturesError, refetch: refetchFixtures } = useFPLFixtures();

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings", userId],
    staleTime: 60 * 1000,
  });

  const { data: managerStatus, error: managerStatusError } = useQuery<{
    success: boolean;
    teamValue: number;
    freeTransfers: number;
    playerCount: number;
    captainId: number | null;
    viceCaptainId: number | null;
    gameweek: number;
    formation: string;
    lastSyncTime: string;
  }>({
    queryKey: ["/api/manager", settings?.manager_id, "status"],
    enabled: !!settings?.manager_id,
    retry: false,
  });

  const isLoading = loadingGameweeks || loadingPlayers || loadingTeams || loadingFixtures;
  const error = gameweeksError || playersError || teamsError || fixturesError;

  if (isLoading) {
    return <LoadingScreen message="Loading FPL data..." />;
  }

  if (error) {
    return <ErrorState 
      message="Failed to load FPL data. Please try again." 
      onRetry={() => {
        refetchGameweeks();
        refetchPlayers();
        refetchTeams();
        refetchFixtures();
      }}
    />;
  }

  const currentGameweek = (gameweeks as FPLGameweek[] | undefined)?.find((gw: FPLGameweek) => gw.is_current) || (gameweeks as FPLGameweek[] | undefined)?.[0];
  const topPlayers = (players as FPLPlayer[] | undefined)?.slice().sort((a: FPLPlayer, b: FPLPlayer) => b.total_points - a.total_points).slice(0, 5) || [];
  const upcomingFixtures = (fixtures as FPLFixture[] | undefined)?.filter((f: FPLFixture) => !f.finished && f.event === currentGameweek?.id).slice(0, 4) || [];

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 2) return "Easy";
    if (difficulty === 3) return "Medium";
    return "Hard";
  };

  return (
    <div className="space-y-8" data-testid="page-dashboard">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back! Here's your FPL performance overview.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Current Gameweek"
          value={`GW ${currentGameweek?.id || '-'}`}
          icon={Calendar}
          description={currentGameweek?.name}
        />
        <StatCard
          title="Team Value"
          value={managerStatus?.teamValue ? `£${(managerStatus.teamValue / 10).toFixed(1)}m` : '-'}
          icon={DollarSign}
          description={managerStatus ? `Formation: ${managerStatus.formation}` : "Sync team to view"}
        />
        <StatCard
          title="Free Transfers"
          value={managerStatus?.freeTransfers?.toString() || '-'}
          icon={Repeat}
          description={managerStatus ? `GW ${managerStatus.gameweek}` : "Sync team to view"}
        />
        <StatCard
          title="Squad Size"
          value={managerStatus?.playerCount?.toString() || '-'}
          icon={Trophy}
          description={managerStatus ? "Players in squad" : "Sync team to view"}
        />
      </div>

      {settings?.manager_id && managerStatusError && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-destructive" />
                Team Not Synced
              </CardTitle>
              <Badge variant="outline" className="border-destructive/50 text-destructive">Not Synced</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your manager data needs to be synced. Go to Settings to sync your FPL team.
            </p>
            <Link href="/settings">
              <Button size="sm" variant="outline" data-testid="button-sync-manager">
                <Repeat className="h-4 w-4 mr-2" />
                Sync Manager Data
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {managerStatus && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                Team Sync Status
              </CardTitle>
              <Badge variant="default">Synced</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              Last synced: {new Date(managerStatus.lastSyncTime).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!settings?.manager_id ? (
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Get Started</h4>
                <p className="text-sm text-muted-foreground">
                  Connect your FPL account in settings to receive personalized AI recommendations
                  for transfers, captain picks, and chip strategy.
                </p>
              </div>
              <Link href="/settings">
                <Button size="sm" data-testid="button-view-settings">Settings</Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <h4 className="font-semibold mb-1">Team Modeller</h4>
                <p className="text-sm text-muted-foreground">
                  Use our AI-powered team builder to create and optimize your squad with
                  real-time predictions and fixture analysis.
                </p>
              </div>
              <Link href="/team-modeller">
                <Button size="sm" variant="outline" data-testid="button-view-team">
                  Build Team
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Top Players</h2>
          <Link href="/team-modeller">
            <Button variant="outline" data-testid="button-edit-team">
              Build Team
            </Button>
          </Link>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-4 pb-4">
            {topPlayers.map((player: FPLPlayer) => {
              const team = (teams as FPLTeam[] | undefined)?.find((t: FPLTeam) => t.id === player.team);
              const positionNames = ['', 'GK', 'DEF', 'MID', 'FWD'];
              return (
                <Card key={player.id} className="w-[200px] flex-shrink-0 hover-elevate" data-testid={`card-squad-${player.id}`}>
                  <CardContent className="p-4">
                    <div className="mb-3 flex justify-center">
                      <Avatar className="h-20 w-20 border-2 border-border">
                        <AvatarImage src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.photo?.replace('.jpg', '.png')}`} />
                        <AvatarFallback className="text-sm font-semibold">
                          {player.web_name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <h4 className="font-semibold text-sm truncate">{player.web_name}</h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {team?.short_name} • {positionNames[player.element_type]}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs">{player.total_points} pts</span>
                      <Badge variant="outline" className="text-xs">£{(player.now_cost / 10).toFixed(1)}m</Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-semibold">Upcoming Fixtures</h2>
          <Link href="/fixtures">
            <Button variant="outline" data-testid="button-view-fixtures">
              View All
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {upcomingFixtures.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">No upcoming fixtures available</p>
              </CardContent>
            </Card>
          ) : (
            upcomingFixtures.map((fixture: FPLFixture) => {
              const homeTeam = (teams as FPLTeam[] | undefined)?.find((t: FPLTeam) => t.id === fixture.team_h);
              const awayTeam = (teams as FPLTeam[] | undefined)?.find((t: FPLTeam) => t.id === fixture.team_a);
              const avgDifficulty = (fixture.team_h_difficulty + fixture.team_a_difficulty) / 2;
              
              return (
                <Card key={fixture.id} className="hover-elevate" data-testid={`card-fixture-${fixture.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-center min-w-[80px]">
                        <p className="text-xs text-muted-foreground">Home</p>
                        <p className="font-semibold">{homeTeam?.short_name || 'TBD'}</p>
                      </div>
                      <div className="text-muted-foreground">vs</div>
                      <div className="text-center min-w-[80px]">
                        <p className="text-xs text-muted-foreground">Away</p>
                        <p className="font-semibold">{awayTeam?.short_name || 'TBD'}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {getDifficultyLabel(Math.round(avgDifficulty))}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
