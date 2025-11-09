import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertCircle, TrendingUp, TrendingDown, Minus, RefreshCw, ChevronDown, ChevronUp, Sparkles, RotateCcw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface GameweekAccuracyRecord {
  gameweek: number;
  predictedPoints: number;
  actualPoints: number | null;
  error: number | null;
  status: 'pending' | 'completed' | 'not_found';
  applied: boolean;
  analysis: string | null;
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
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpanded = (gameweek: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gameweek)) {
        newSet.delete(gameweek);
      } else {
        newSet.add(gameweek);
      }
      return newSet;
    });
  };

  const formatAnalysis = (analysis: string | null): string[] => {
    if (!analysis) return [];
    return analysis
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => line.startsWith('•') || line.startsWith('-') ? line.substring(1).trim() : line);
  };

  const { data: gameweeks } = useQuery<Array<{ id: number; is_current: boolean; is_previous: boolean; finished: boolean }>>({
    queryKey: ["/api/fpl/gameweeks"],
  });

  const currentGameweek = gameweeks?.find(gw => gw.is_current)?.id || 10;

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
        toGameweek: Math.max(currentGameweek - 1, startGameweek),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/prediction-accuracy/${userId}`] 
      });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', `/api/prediction-accuracy/analyze/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: [`/api/prediction-accuracy/${userId}`] 
      });
    },
  });

  const regenerateGameweekMutation = useMutation({
    mutationFn: async (gameweek: number) => {
      return apiRequest('POST', `/api/prediction-accuracy/analyze/${userId}?gameweek=${gameweek}&forceRegenerate=true`, {});
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
              Tracking AI predictions vs actual results from GW{startGameweek} onwards
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => backfillMutation.mutate()}
              disabled={backfillMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${backfillMutation.isPending ? 'animate-spin' : ''}`} />
              {metrics.completedGameweeks === 0 ? 'Load History' : 'Update History'}
            </Button>
            {metrics.completedGameweeks > 0 && (
              <Button
                variant="default"
                size="sm"
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
              >
                <Sparkles className={`h-4 w-4 mr-2 ${analyzeMutation.isPending ? 'animate-pulse' : ''}`} />
                Generate Analysis
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {metrics.completedGameweeks > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Prediction Bias</p>
              <p className={`text-2xl font-bold ${
                metrics.overallBias && metrics.overallBias > 0 
                  ? 'text-destructive' 
                  : metrics.overallBias && metrics.overallBias < 0 
                    ? 'text-chart-2' 
                    : ''
              }`}>
                {metrics.overallBias !== null 
                  ? `${metrics.overallBias > 0 ? '+' : ''}${metrics.overallBias.toFixed(1)}` 
                  : '-'}
              </p>
              <p className="text-xs text-muted-foreground">
                {metrics.overallBias && metrics.overallBias > 0 
                  ? 'over-predicting' 
                  : metrics.overallBias && metrics.overallBias < 0 
                    ? 'under-predicting' 
                    : 'points per GW'}
              </p>
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
              history.map((record) => {
                const isExpanded = expandedItems.has(record.gameweek);
                const analysisPoints = formatAnalysis(record.analysis);
                const hasAnalysis = analysisPoints.length > 0;

                return (
                  <div
                    key={record.gameweek}
                    className="rounded-lg border bg-card overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors">
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
                      <div className="flex items-center gap-2">
                        {record.error !== null && record.actualPoints !== null && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              record.error === 0 
                                ? '' 
                                : record.predictedPoints > record.actualPoints 
                                  ? 'text-destructive border-destructive/50' 
                                  : 'text-chart-2 border-chart-2/50'
                            }`}
                          >
                            {record.error === 0 
                              ? 'Perfect' 
                              : `${record.predictedPoints > record.actualPoints ? '+' : ''}${record.predictedPoints - record.actualPoints} pts`}
                          </Badge>
                        )}
                        {getAccuracyBadge(record.error)}
                        {record.status === 'completed' && record.error !== null && record.error >= 5 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => regenerateGameweekMutation.mutate(record.gameweek)}
                            disabled={regenerateGameweekMutation.isPending}
                            className="h-8 px-2"
                          >
                            <RotateCcw className={`h-3 w-3 ${regenerateGameweekMutation.isPending ? 'animate-spin' : ''}`} />
                            <span className="ml-1 text-xs">Regenerate</span>
                          </Button>
                        )}
                        {hasAnalysis && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleExpanded(record.gameweek)}
                            className="h-8 px-2"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                            <span className="ml-1 text-xs">
                              {isExpanded ? 'Hide' : 'Show'} Analysis
                            </span>
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {hasAnalysis && isExpanded && (
                      <div className="px-3 pb-3 pt-0">
                        <div className="bg-accent/30 rounded-md p-3 space-y-1.5">
                          {analysisPoints.map((point, idx) => (
                            <div key={idx} className="flex gap-2 text-sm">
                              <span className="text-muted-foreground mt-0.5">•</span>
                              <span className="text-muted-foreground">{point}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
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
