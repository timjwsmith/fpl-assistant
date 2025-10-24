import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PredictionPanelProps {
  predictedPoints: number;
  confidence: number;
  insights: string[];
  className?: string;
  isStreaming?: boolean;
  streamingContent?: string;
  isLoading?: boolean;
  hasData?: boolean;
  label?: string;
}

export function PredictionPanel({
  predictedPoints,
  confidence,
  insights,
  className,
  isStreaming = false,
  streamingContent = '',
  isLoading = false,
  hasData = false,
  label,
}: PredictionPanelProps) {
  const showLoadingState = isLoading || (predictedPoints === 0 && confidence === 0 && !hasData);
  
  if (showLoadingState && !hasData) {
    return (
      <Card className={cn("border-primary/50", className)} data-testid="panel-prediction">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Prediction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-primary">Analyzing your team...</p>
              <p className="text-xs text-muted-foreground">This may take 30-45 seconds</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-primary/50", className)} data-testid="panel-prediction">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Prediction
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm text-muted-foreground">Predicted Gameweek Points</p>
            {label && (
              <Badge variant="secondary" className="text-xs">{label}</Badge>
            )}
          </div>
          <p className="text-3xl font-bold font-mono" data-testid="text-predicted-points">
            {predictedPoints}
            <span className="text-lg text-muted-foreground ml-2">pts</span>
          </p>
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

        {isStreaming && streamingContent && (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              <p className="text-xs font-medium text-primary">AI Streaming...</p>
            </div>
            <div className="p-2 rounded-md bg-muted/30 border border-dashed">
              <p className="text-xs text-muted-foreground font-mono max-h-24 overflow-y-auto">
                {streamingContent.slice(-200)}...
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
