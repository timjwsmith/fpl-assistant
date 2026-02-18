import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, TrendingDown, Target, RefreshCw, BarChart3, Activity } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { usePerformanceData, useUpdateActualPoints } from "@/hooks/use-performance-data";
import { useFPLGameweeks, useFPLPlayers } from "@/hooks/use-fpl-data";
import { ErrorState } from "@/components/error-state";
import { useToast } from "@/hooks/use-toast";
import type { UserSettings, FPLGameweek, FPLPlayer } from "@shared/schema";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function Performance() {
  const userId = 1;
  const { toast } = useToast();
  const [selectedGameweek, setSelectedGameweek] = useState<number | null>(null);

  const { data: settings, isLoading: loadingSettings } = useQuery<UserSettings>({
    queryKey: ["/api/settings", userId],
    staleTime: 60 * 1000,
  });

  const { data: gameweeks, isLoading: loadingGameweeks } = useFPLGameweeks();
  const { data: players } = useFPLPlayers();

  const currentGameweek = (gameweeks as FPLGameweek[] | undefined)?.find((gw: FPLGameweek) => gw.is_current);
  
  useEffect(() => {
    if (currentGameweek && !selectedGameweek) {
      setSelectedGameweek(currentGameweek.id);
    }
  }, [currentGameweek, selectedGameweek]);

  const { data: performanceData, isLoading: loadingPerformance, error: performanceError, refetch } = usePerformanceData(
    userId,
    selectedGameweek
  );

  const updateActualMutation = useUpdateActualPoints();

  const positionNames = ['', 'GK', 'DEF', 'MID', 'FWD'];
  const playersMap = new Map((players as FPLPlayer[] | undefined)?.map(p => [p.id, p]) || []);

  const handleUpdateActualPoints = async () => {
    if (!selectedGameweek) return;

    const gameweek = (gameweeks as FPLGameweek[] | undefined)?.find(gw => gw.id === selectedGameweek);
    if (!gameweek?.finished) {
      toast({
        title: "Gameweek Not Finished",
        description: "Cannot update actual points for an ongoing gameweek.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await updateActualMutation.mutateAsync({
        userId,
        gameweek: selectedGameweek,
      });

      if (result.errors.length > 0) {
        toast({
          title: "Partial Update",
          description: `Updated ${result.updated} predictions. ${result.errors.length} errors occurred.`,
          variant: "default",
        });
      } else {
        toast({
          title: "Success",
          description: `Updated ${result.updated} predictions with actual points.`,
        });
      }
      refetch();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update actual points. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loadingSettings || loadingGameweeks) {
    return (
      <div className="space-y-8" data-testid="page-performance">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Performance Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Track how AI predictions compare to actual performance.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!settings?.manager_id) {
    return (
      <div className="space-y-8" data-testid="page-performance">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Performance Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Track how AI predictions compare to actual performance.
          </p>
        </div>
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <Target className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-xl mb-2">No Performance Data Yet</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Connect your FPL account to track how AI predictions compare to your actual performance
                over time.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Link href="/settings">
                <Button data-testid="button-connect-fpl">Connect FPL Account</Button>
              </Link>
              <Link href="/team-modeller">
                <Button variant="outline" data-testid="button-build-team">Build a Team</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (performanceError) {
    return (
      <div className="space-y-8" data-testid="page-performance">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Performance Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Track how AI predictions compare to actual performance.
          </p>
        </div>
        <ErrorState 
          message="Failed to load performance data. Please try again." 
          onRetry={refetch}
        />
      </div>
    );
  }

  const hasData = performanceData && performanceData.predictions.length > 0;
  const metrics = performanceData?.metrics;
  const predictions = performanceData?.predictions || [];

  const chartData = predictions
    .filter(p => p.actualPoints !== null)
    .map(p => ({
      player: p.playerName,
      predicted: p.predictedPoints,
      actual: p.actualPoints || 0,
    }))
    .slice(0, 10);

  return (
    <div className="space-y-8" data-testid="page-performance">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Performance Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Track how AI predictions compare to actual performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select 
            value={selectedGameweek?.toString() || ""} 
            onValueChange={(value) => setSelectedGameweek(parseInt(value))}
          >
            <SelectTrigger className="w-[180px]" data-testid="select-gameweek">
              <SelectValue placeholder="Select gameweek" />
            </SelectTrigger>
            <SelectContent>
              {(gameweeks as FPLGameweek[] | undefined)?.map((gw: FPLGameweek) => (
                <SelectItem key={gw.id} value={gw.id.toString()} data-testid={`option-gw-${gw.id}`}>
                  Gameweek {gw.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loadingPerformance ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        </div>
      ) : !hasData ? (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <Activity className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-xl mb-2">No Predictions for This Gameweek</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Build a team and make predictions to track performance metrics.
              </p>
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Link href="/team-modeller">
                <Button data-testid="button-build-team-empty">Build a Team</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Accuracy Rate</p>
                    <p className="text-2xl font-bold font-mono" data-testid="text-accuracy-rate">
                      {metrics?.accuracyRate !== null ? `${metrics?.accuracyRate}%` : '-'}
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
                    <p className="text-sm text-muted-foreground">Avg Error</p>
                    <p className="text-2xl font-bold font-mono" data-testid="text-avg-error">
                      {metrics?.averageError !== null ? metrics?.averageError.toFixed(2) : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-chart-3/10">
                    <BarChart3 className="h-6 w-6 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">RMSE</p>
                    <p className="text-2xl font-bold font-mono" data-testid="text-rmse">
                      {metrics?.rmse !== null ? metrics?.rmse.toFixed(2) : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-chart-4/10">
                    <Activity className="h-6 w-6 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">MAE</p>
                    <p className="text-2xl font-bold font-mono" data-testid="text-mae">
                      {metrics?.mae !== null ? metrics?.mae.toFixed(2) : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {chartData.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Predicted vs Actual Points</CardTitle>
                  <Badge variant="outline" data-testid="badge-predictions-count">
                    {metrics?.completedPredictions}/{metrics?.totalPredictions} Complete
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="player" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="predicted" fill="hsl(var(--primary))" name="Predicted" />
                    <Bar dataKey="actual" fill="hsl(var(--chart-2))" name="Actual" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle>Player Performance Breakdown</CardTitle>
                <Button
                  onClick={handleUpdateActualPoints}
                  disabled={updateActualMutation.isPending || !(gameweeks as FPLGameweek[] | undefined)?.find(gw => gw.id === selectedGameweek)?.finished}
                  data-testid="button-update-actual"
                >
                  {updateActualMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Update Actual Points
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead data-testid="header-player">Player</TableHead>
                      <TableHead data-testid="header-position">Position</TableHead>
                      <TableHead className="text-right" data-testid="header-predicted">Predicted</TableHead>
                      <TableHead className="text-right" data-testid="header-actual">Actual</TableHead>
                      <TableHead className="text-right" data-testid="header-difference">Difference</TableHead>
                      <TableHead className="text-right" data-testid="header-accuracy">Accuracy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {predictions.map((pred, idx) => {
                      const player = playersMap.get(pred.playerId);
                      const position = player ? positionNames[player.element_type] : '-';
                      
                      return (
                        <TableRow key={pred.playerId} data-testid={`row-player-${idx}`}>
                          <TableCell className="font-medium" data-testid={`cell-player-${idx}`}>
                            {pred.playerName}
                          </TableCell>
                          <TableCell data-testid={`cell-position-${idx}`}>
                            <Badge variant="outline">{position}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono" data-testid={`cell-predicted-${idx}`}>
                            {pred.predictedPoints}
                          </TableCell>
                          <TableCell className="text-right font-mono" data-testid={`cell-actual-${idx}`}>
                            {pred.actualPoints !== null ? pred.actualPoints : '-'}
                          </TableCell>
                          <TableCell className="text-right" data-testid={`cell-difference-${idx}`}>
                            {pred.difference !== null ? (
                              <Badge 
                                variant="outline" 
                                className={
                                  pred.difference > 0 
                                    ? "border-chart-2/50 text-chart-2 bg-chart-2/10" 
                                    : pred.difference < 0
                                    ? "border-destructive/50 text-destructive bg-destructive/10"
                                    : ""
                                }
                              >
                                {pred.difference > 0 ? (
                                  <>
                                    <TrendingUp className="h-3 w-3 mr-1" />
                                    +{pred.difference}
                                  </>
                                ) : pred.difference < 0 ? (
                                  <>
                                    <TrendingDown className="h-3 w-3 mr-1" />
                                    {pred.difference}
                                  </>
                                ) : (
                                  '0'
                                )}
                              </Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono" data-testid={`cell-accuracy-${idx}`}>
                            {pred.accuracy !== null ? `${pred.accuracy.toFixed(1)}%` : '-'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {metrics && metrics.completedPredictions > 0 && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="p-6">
                <h3 className="font-semibold mb-3">Performance Summary</h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      <span className="font-semibold text-foreground">{metrics.completedPredictions}</span> of {metrics.totalPredictions} predictions have actual results
                    </p>
                    <p className="text-muted-foreground">
                      Average prediction error: <span className="font-semibold text-foreground">{metrics.averageError?.toFixed(2)} points</span>
                    </p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      Accuracy rate (±2 points): <span className="font-semibold text-foreground">{metrics.accuracyRate?.toFixed(1)}%</span>
                    </p>
                    <p className="text-muted-foreground">
                      Root Mean Square Error: <span className="font-semibold text-foreground">{metrics.rmse?.toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
