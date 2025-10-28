import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowRight, AlertTriangle, Sparkles, TrendingUp } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFPLPlayers, useFPLTeams } from "@/hooks/use-fpl-data";
import { useTransferRecommendations } from "@/hooks/use-ai-predictions";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";
import { useState } from "react";
import type { FPLPlayer } from "@shared/schema";
import { Link } from "wouter";

export default function Transfers() {
  const { data: players, isLoading: loadingPlayers, error: playersError, refetch: refetchPlayers } = useFPLPlayers();
  const { data: teams } = useFPLTeams();
  const [showDemo, setShowDemo] = useState(false);
  
  const transferRecs = useTransferRecommendations();

  // For demo: Show recommendations for top players
  const handleGetRecommendations = () => {
    if (!players) return;
    
    // Get top 11 players as current team (demo)
    const topPlayers = players.slice().sort((a, b) => b.total_points - a.total_points).slice(0, 11);
    transferRecs.mutate({ currentPlayers: topPlayers, budget: 10.0 });
    setShowDemo(true);
  };

  if (loadingPlayers) {
    return <LoadingScreen message="Loading player data..." />;
  }

  if (playersError) {
    return <ErrorState message="Failed to load data" onRetry={refetchPlayers} />;
  }

  return (
    <div className="space-y-8" data-testid="page-transfers">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Transfer Analyzer</h1>
        <p className="text-muted-foreground mt-2">
          AI-powered transfer recommendations based on fixtures, form, and predicted points.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Free Transfers</p>
            <p className="text-3xl font-bold font-mono mt-1" data-testid="text-free-transfers">1</p>
            <p className="text-xs text-muted-foreground mt-2">Connect account for details</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Transfer Cost</p>
            <p className="text-3xl font-bold font-mono mt-1" data-testid="text-transfer-cost">-4 pts</p>
            <p className="text-xs text-muted-foreground mt-2">Per additional transfer</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Wildcard</p>
            <Badge variant="outline" className="mt-1" data-testid="badge-wildcard">Available</Badge>
            <p className="text-xs text-muted-foreground mt-2">Connect account for status</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="recommendations" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="recommendations" data-testid="tab-recommendations">
            AI Recommendations
          </TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">
            How It Works
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-6 mt-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            <span>Powered by AI analysis of fixtures, form, and expected points</span>
          </div>

          {!showDemo && !transferRecs.data && (
            <Card>
              <CardContent className="p-8 text-center space-y-4">
                <h3 className="font-semibold text-lg">Get AI Transfer Recommendations</h3>
                <p className="text-muted-foreground">
                  Connect your FPL account in settings, or try our demo to see how AI recommendations work.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/settings">
                    <Button>Connect Account</Button>
                  </Link>
                  <Button variant="outline" onClick={handleGetRecommendations} disabled={transferRecs.isPending}>
                    {transferRecs.isPending ? "Analysing..." : "Try Demo"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {transferRecs.isPending && <LoadingScreen message="Analysing transfers..." />}

          {transferRecs.error && (
            <ErrorState 
              message="Failed to get transfer recommendations. Please try again." 
              onRetry={handleGetRecommendations} 
            />
          )}

          {transferRecs.data && !transferRecs.error && (
            <div className="space-y-4">
              {transferRecs.data.map((rec, i) => {
                const playerOut = players?.find(p => p.id === rec.player_out_id);
                const playerIn = players?.find(p => p.id === rec.player_in_id);
                const teamOut = teams?.find(t => t.id === playerOut?.team);
                const teamIn = teams?.find(t => t.id === playerIn?.team);
                const positionNames = ['', 'GK', 'DEF', 'MID', 'FWD'];

                return (
                  <Card key={i} className="hover-elevate" data-testid={`card-recommendation-${i}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <Badge
                          variant={rec.priority === "high" ? "default" : "outline"}
                          className="capitalize"
                        >
                          {rec.priority} Priority
                        </Badge>
                        <div className="flex items-center gap-2 text-sm font-semibold text-chart-2">
                          <TrendingUp className="h-4 w-4" />
                          +{rec.expected_points_gain.toFixed(1)} pts
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1 p-3 rounded-md bg-destructive/10 border border-destructive/30">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 border-2 border-destructive/30">
                              <AvatarImage src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${playerOut?.photo?.replace('.jpg', '.png')}`} />
                              <AvatarFallback className="text-xs font-semibold">
                                {playerOut?.web_name.substring(0, 2).toUpperCase() || '??'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">Out</p>
                              <p className="font-semibold truncate">{playerOut?.web_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {teamOut?.short_name} • {positionNames[playerOut?.element_type || 0]}
                              </p>
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />

                        <div className="flex-1 p-3 rounded-md bg-chart-2/10 border border-chart-2/30">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-12 w-12 border-2 border-chart-2/30">
                              <AvatarImage src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${playerIn?.photo?.replace('.jpg', '.png')}`} />
                              <AvatarFallback className="text-xs font-semibold">
                                {playerIn?.web_name.substring(0, 2).toUpperCase() || '??'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-muted-foreground mb-1">In</p>
                              <p className="font-semibold truncate">{playerIn?.web_name || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {teamIn?.short_name} • {positionNames[playerIn?.element_type || 0]}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground mb-4">{rec.reasoning}</p>

                      <Button className="w-full" variant={rec.priority === "high" ? "default" : "outline"} data-testid={`button-apply-${i}`} disabled>
                        Apply Transfer
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Important Reminder</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Making 2 or more transfers will cost you 4 points each. Consider using your
                  Wildcard if planning multiple transfers.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>How Transfer Recommendations Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">1. Fixture Analysis</h4>
                <p className="text-sm text-muted-foreground">
                  AI analyses upcoming fixtures to identify players with favourable schedules
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">2. Form & Stats</h4>
                <p className="text-sm text-muted-foreground">
                  Evaluates recent form, expected goals (xG), expected assists (xA), and underlying statistics
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">3. Points Prediction</h4>
                <p className="text-sm text-muted-foreground">
                  Predicts expected points gain/loss for each potential transfer
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">4. Priority Ranking</h4>
                <p className="text-sm text-muted-foreground">
                  Recommendations are ranked by priority based on expected impact
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
