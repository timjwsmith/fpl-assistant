import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, TrendingUp, TrendingDown, Minus, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface GameweekAccuracyRecord {
  gameweek: number;
  predictedPoints: number;
  actualPoints: number | null;
  error: number | null;
  status: 'pending' | 'completed' | 'not_found';
  applied: boolean;
}

interface AccuracyMetrics {
  totalGameweeks: number;
  completedGameweeks: number;
  meanAbsoluteError: number | null;
  accuracyWithin5: number | null;
  accuracyWithin10: number | null;
  totalPredictedPoints: number;
  totalActualPoints: number;
  overallBias: number | null;
}

interface PredictionAccuracyHistory {
  history: GameweekAccuracyRecord[];
  metrics: AccuracyMetrics;
}

interface PredictionAccuracyProps {
  userId: number;
  startGameweek?: number;
}

export function PredictionAccuracy({ userId, startGameweek = 8 }: PredictionAccuracyProps) {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery<PredictionAccuracyHistory>({
    queryKey: [`/api/prediction-accuracy/${userId}`, { startGameweek }],
    queryFn: async () => {
      return apiRequest<PredictionAccuracyHistory>(
        'GET',
        `/api/prediction-accuracy/${userId}?startGameweek=${startGameweek}`
      );
    },
    staleTime: 5 * 60 * 1000,
  });

  const backfillMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/prediction-accuracy/backfill/${userId}`, {
        fromGameweek: startGameweek,
        toGameweek: 9,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/prediction-accuracy/${userId}`] 
      });
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Prediction Accuracy
          </CardTitle>
          <CardDescription>Loading accuracy data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Prediction Accuracy
          </CardTitle>
          <CardDescription>Unable to load accuracy data</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { history, metrics } = data;

  const getAccuracyIcon = (error: number | null) => {
    if (error === null) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (error <= 5) return <CheckCircle2 className="h-4 w-4 text-chart-2" />;
    if (error <= 10) return <AlertCircle className="h-4 w-4 text-chart-4" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  const getAccuracyBadge = (error: number | null) => {
    if (error === null) return <Badge variant="outline">Pending</Badge>;
    if (error <= 5) return <Badge className="bg-chart-2">Excellent</Badge>;
    if (error <= 10) return <Badge className="bg-chart-4">Good</Badge>;
    return <Badge variant="destructive">Missed</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Prediction Accuracy
            </CardTitle>
            <CardDescription>
              Tracking AI predictions vs actual results from GW{startGameweek}
            </CardDescription>
          </div>
          {metrics.completedGameweeks === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => backfillMutation.mutate()}
              disabled={backfillMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${backfillMutation.isPending ? 'animate-spin' : ''}`} />
              Load History
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics.completedGameweeks > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Avg Error</p>
              <p className="text-2xl font-bold">
                {metrics.meanAbsoluteError !== null 
                  ? `±${metrics.meanAbsoluteError.toFixed(1)}` 
                  : '-'}
              </p>
              <p className="text-xs text-muted-foreground">points per GW</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Within ±5pts</p>
              <p className="text-2xl font-bold text-chart-2">
                {metrics.accuracyWithin5 !== null 
                  ? `${Math.round(metrics.accuracyWithin5)}%` 
                  : '-'}
              </p>
              <p className="text-xs text-muted-foreground">accuracy rate</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Predicted Total</p>
              <p className="text-2xl font-bold">
                {metrics.totalPredictedPoints}
              </p>
              <p className="text-xs text-muted-foreground">points</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Actual Total</p>
              <p className="text-2xl font-bold">
                {metrics.totalActualPoints}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                {metrics.overallBias !== null && metrics.overallBias > 0 && (
                  <>
                    <TrendingUp className="h-3 w-3 text-destructive" />
                    <span className="text-destructive">
                      {metrics.overallBias > 0 ? '+' : ''}{metrics.overallBias.toFixed(1)} bias
                    </span>
                  </>
                )}
                {metrics.overallBias !== null && metrics.overallBias < 0 && (
                  <>
                    <TrendingDown className="h-3 w-3 text-chart-2" />
                    <span className="text-chart-2">
                      {metrics.overallBias.toFixed(1)} bias
                    </span>
                  </>
                )}
                {metrics.overallBias === 0 && 'no bias'}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Gameweek History</h4>
          <div className="space-y-2">
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>No predictions yet. Generate a plan to start tracking accuracy.</p>
              </div>
            ) : (
              history.map((record) => (
                <div
                  key={record.gameweek}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getAccuracyIcon(record.error)}
                    <div>
                      <p className="font-semibold">Gameweek {record.gameweek}</p>
                      <p className="text-xs text-muted-foreground">
                        {record.status === 'completed' 
                          ? `Predicted: ${record.predictedPoints} pts • Actual: ${record.actualPoints} pts` 
                          : `Predicted: ${record.predictedPoints} pts`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {record.error !== null && (
                      <Badge variant="outline" className="text-xs">
                        {record.error === 0 ? 'Perfect' : `±${record.error} pts`}
                      </Badge>
                    )}
                    {getAccuracyBadge(record.error)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {metrics.completedGameweeks === 0 && history.length > 0 && (
          <div className="bg-accent/30 border border-accent p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> Actual results will be automatically populated once gameweeks are completed. 
              Click "Load History" above to fetch results for past gameweeks (GW8-9).
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
