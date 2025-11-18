import { useMultiWeekPredictions } from "@/hooks/use-multi-week-predictions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LoadingScreen } from "@/components/loading-screen";

export function MultiWeekPredictionTracker({ userId }: { userId: number }) {
  const { data: predictions, isLoading } = useMultiWeekPredictions(userId);

  if (isLoading) {
    return <LoadingScreen message="Loading prediction history..." />;
  }

  if (!predictions || predictions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <p className="text-muted-foreground">
            No multi-week predictions tracked yet. Apply a transfer plan to start tracking!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xl font-semibold">Multi-Week Prediction Tracker</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Tracking AI's 6-week transfer gain predictions vs actual outcomes
        </p>
      </div>
      
      {predictions.map(pred => {
        const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
          switch (status) {
            case 'completed': return 'default';
            case 'tracking': return 'secondary';
            case 'voided': return 'destructive';
            default: return 'outline';
          }
        };

        const getAccuracyColor = (accuracy: number | null) => {
          if (!accuracy) return '';
          if (accuracy >= 90 && accuracy <= 110) return 'text-green-500';
          if (accuracy >= 75 && accuracy <= 125) return 'text-yellow-500';
          return 'text-red-500';
        };

        return (
          <Card key={pred.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">
                    {pred.playerOutName} → {pred.playerInName}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    GW{pred.startGameweek} • Predicted: +{pred.predictedGain.toFixed(1)} pts over {pred.timeframeWeeks} weeks
                  </p>
                </div>
                <Badge variant={getStatusVariant(pred.status)}>
                  {pred.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              {pred.status === 'tracking' && (
                <>
                  <Progress value={pred.progressPercent} className="mb-2" />
                  <p className="text-sm">
                    Week {pred.weeksElapsed}/{pred.timeframeWeeks}: 
                    <span className="font-semibold ml-2">
                      {pred.pointsActualToDate.toFixed(1)} pts accumulated
                    </span>
                    <span className="text-muted-foreground ml-2">
                      (Expected: ~{(pred.predictedGain * pred.weeksElapsed / pred.timeframeWeeks).toFixed(1)} pts at this point)
                    </span>
                  </p>
                </>
              )}
              
              {pred.status === 'completed' && (
                <div className="flex justify-between">
                  <div>
                    <p className="text-sm font-semibold">Final Result:</p>
                    <p className="text-lg">
                      Predicted: {pred.predictedGain.toFixed(1)} pts → Actual: {pred.actualGainFinal?.toFixed(1)} pts
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Accuracy</p>
                    <p className={`text-2xl font-bold ${getAccuracyColor(pred.accuracyPercent)}`}>
                      {pred.accuracyPercent?.toFixed(0)}%
                    </p>
                  </div>
                </div>
              )}
              
              {pred.status === 'voided' && (
                <p className="text-sm text-muted-foreground">
                  Voided: {pred.voidReason?.replace(/_/g, ' ')}
                </p>
              )}
              
              {pred.status === 'pending' && (
                <p className="text-sm text-muted-foreground">
                  Waiting for GW{pred.startGameweek} to start...
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
