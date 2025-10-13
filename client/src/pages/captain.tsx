import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, TrendingUp, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFPLPlayers, useFPLTeams } from "@/hooks/use-fpl-data";
import { useCaptainRecommendations } from "@/hooks/use-ai-predictions";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";
import { useState } from "react";
import { Link } from "wouter";

export default function Captain() {
  const { data: players, isLoading: loadingPlayers, error: playersError, refetch: refetchPlayers } = useFPLPlayers();
  const { data: teams } = useFPLTeams();
  const [showDemo, setShowDemo] = useState(false);
  
  const captainRecs = useCaptainRecommendations();

  const handleGetRecommendations = () => {
    if (!players) return;
    
    // Get top 11 players as demo team
    const topPlayerIds = players
      .slice()
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, 11)
      .map(p => p.id);
    
    captainRecs.mutate({ playerIds: topPlayerIds });
    setShowDemo(true);
  };

  if (loadingPlayers) {
    return <LoadingScreen message="Loading player data..." />;
  }

  if (playersError) {
    return <ErrorState message="Failed to load data" onRetry={refetchPlayers} />;
  }

  const topRec = captainRecs.data?.[0];
  const topPlayer = players?.find(p => p.id === topRec?.player_id);

  return (
    <div className="space-y-8" data-testid="page-captain">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Captain Selector</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered captain recommendations based on fixtures, form, and historical data.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Trophy className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Top Pick</p>
                <p className="font-semibold" data-testid="text-top-pick">
                  {topPlayer?.web_name || 'Connect Account'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-chart-2/10">
                <TrendingUp className="h-6 w-6 text-chart-2" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expected Pts</p>
                <p className="font-semibold font-mono" data-testid="text-expected">
                  {topRec?.expected_points?.toFixed(1) || '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-chart-4/10">
                <Users className="h-6 w-6 text-chart-4" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ownership</p>
                <p className="font-semibold font-mono" data-testid="text-ownership">
                  {topRec?.ownership_percent?.toFixed(1) || '-'}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Captain doubles your points - choose wisely!</span>
        </div>

        {!showDemo && !captainRecs.data && (
          <Card>
            <CardContent className="p-8 text-center space-y-4">
              <h3 className="font-semibold text-lg">Get AI Captain Recommendations</h3>
              <p className="text-muted-foreground">
                Connect your FPL account to get personalized captain recommendations, or try our demo.
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/settings">
                  <Button>Connect Account</Button>
                </Link>
                <Button variant="outline" onClick={handleGetRecommendations} disabled={captainRecs.isPending}>
                  {captainRecs.isPending ? "Analyzing..." : "Try Demo"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {captainRecs.isPending && <LoadingScreen message="Analyzing captain options..." />}

        {captainRecs.error && (
          <ErrorState 
            message="Failed to get captain recommendations. Please try again." 
            onRetry={handleGetRecommendations} 
          />
        )}

        {captainRecs.data && !captainRecs.error && captainRecs.data?.map((rec, i) => {
          const player = players?.find(p => p.id === rec.player_id);
          const team = teams?.find(t => t.id === player?.team);
          const positionNames = ['', 'GK', 'DEF', 'MID', 'FWD'];

          return (
            <Card
              key={i}
              className={`hover-elevate ${i === 0 ? "border-primary/50 bg-primary/5" : ""}`}
              data-testid={`card-captain-${i}`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16 border-2 border-border">
                    <AvatarImage src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${player?.id}.png`} />
                    <AvatarFallback className="text-lg font-semibold">
                      {player?.web_name.split(' ').map(n => n[0]).join('') || '??'}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-lg">{player?.web_name || 'Unknown'}</h3>
                        <p className="text-sm text-muted-foreground">
                          {team?.short_name} • {positionNames[player?.element_type || 0]} • £{player ? (player.now_cost / 10).toFixed(1) : '-'}m
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Expected Points</p>
                        <p className="text-2xl font-bold font-mono text-primary">{rec.expected_points.toFixed(1)}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Confidence:</span>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${rec.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold font-mono">{rec.confidence}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Ownership:</span>
                        <span className="text-sm font-semibold font-mono">{rec.ownership_percent.toFixed(1)}%</span>
                      </div>

                      {rec.differential && (
                        <Badge variant="outline" className="border-chart-4/50 text-chart-4">
                          Differential
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">{rec.reasoning}</p>

                    <Button
                      className="w-full"
                      variant={i === 0 ? "default" : "outline"}
                      data-testid={`button-select-${i}`}
                      disabled
                    >
                      <Trophy className="h-4 w-4 mr-2" />
                      Select as Captain
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
