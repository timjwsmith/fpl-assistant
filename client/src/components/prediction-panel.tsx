import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PredictionPanelProps {
  currentPoints: number;
  predictedPoints: number;
  confidence: number;
  insights: string[];
  className?: string;
}

export function PredictionPanel({
  currentPoints,
  predictedPoints,
  confidence,
  insights,
  className,
}: PredictionPanelProps) {
  const pointsDiff = predictedPoints - currentPoints;
  const isPositive = pointsDiff > 0;

  return (
    <Card className={cn("border-primary/50", className)} data-testid="panel-prediction">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Prediction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Current</p>
            <p className="text-2xl font-bold font-mono" data-testid="text-current-points">
              {currentPoints}
              <span className="text-sm text-muted-foreground ml-1">pts</span>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Predicted</p>
            <p className="text-2xl font-bold font-mono" data-testid="text-predicted-points">
              {predictedPoints}
              <span className="text-sm text-muted-foreground ml-1">pts</span>
            </p>
          </div>
        </div>

        <div className="p-3 rounded-md bg-muted/50 border">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Expected Change</span>
            <div className={cn(
              "flex items-center gap-1 font-bold font-mono",
              isPositive ? "text-chart-2" : "text-destructive"
            )}>
              {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {isPositive ? '+' : ''}{pointsDiff} pts
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Confidence</span>
          <div className="flex items-center gap-2">
            <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all"
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span className="text-sm font-semibold font-mono">{confidence}%</span>
          </div>
        </div>

        {insights.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Key Insights</p>
            <div className="space-y-1">
              {insights.map((insight, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5 text-xs">AI</Badge>
                  <p className="text-sm text-muted-foreground flex-1">{insight}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
