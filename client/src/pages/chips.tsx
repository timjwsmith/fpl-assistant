import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Users, Shield, AlertCircle } from "lucide-react";
import { useFPLGameweeks } from "@/hooks/use-fpl-data";
import { useChipStrategy } from "@/hooks/use-ai-predictions";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";
import { useState } from "react";

export default function Chips() {
  const { data: gameweeks, isLoading: loadingGameweeks, error: gameweeksError, refetch: refetchGameweeks } = useFPLGameweeks();
  const [showDemo, setShowDemo] = useState(false);
  
  const chipStrategy = useChipStrategy();

  const currentGameweek = gameweeks?.find(gw => gw.is_current);

  const handleGetStrategy = () => {
    if (!currentGameweek) return;
    
    chipStrategy.mutate({
      currentGameweek: currentGameweek.id,
      remainingChips: ['wildcard', 'freehit', 'banchboost', 'triplecaptain']
    });
    setShowDemo(true);
  };

  const chipIcons: Record<string, any> = {
    'wildcard': Shield,
    'freehit': Zap,
    'banchboost': Users,
    'triplecaptain': Sparkles,
  };

  const chipDescriptions: Record<string, string> = {
    'wildcard': 'Make unlimited free transfers for a single Gameweek',
    'freehit': 'Make unlimited transfers for one Gameweek, then team reverts',
    'banchboost': 'Points are scored by all 15 players',
    'triplecaptain': 'Your captain scores 3x points instead of 2x',
  };

  if (loadingGameweeks) {
    return <LoadingScreen message="Loading gameweek data..." />;
  }

  if (gameweeksError) {
    return <ErrorState message="Failed to load data" onRetry={refetchGameweeks} />;
  }

  return (
    <div className="space-y-8" data-testid="page-chips">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Chip Advisor</h1>
        <p className="text-muted-foreground mt-2">
          Strategic recommendations for when to use your FPL chips for maximum impact.
        </p>
      </div>

      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Chip Strategy</p>
            <p className="text-sm text-muted-foreground mt-1">
              Each chip can only be used once per season. Plan carefully to maximize returns during
              double gameweeks and blank gameweeks.
            </p>
          </div>
        </CardContent>
      </Card>

      {!showDemo && !chipStrategy.data && (
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <h3 className="font-semibold text-lg">Get AI Chip Strategy</h3>
            <p className="text-muted-foreground">
              Let AI analyse upcoming fixtures and gameweeks to recommend the optimal timing for your chips.
            </p>
            <Button onClick={handleGetStrategy} disabled={chipStrategy.isPending}>
              {chipStrategy.isPending ? "Analysing..." : "Get Recommendations"}
            </Button>
          </CardContent>
        </Card>
      )}

      {chipStrategy.isPending && <LoadingScreen message="Analysing chip strategy..." />}

      {chipStrategy.error && (
        <ErrorState 
          message="Failed to get chip strategy. Please try again." 
          onRetry={handleGetStrategy} 
        />
      )}

      {chipStrategy.data && Array.isArray(chipStrategy.data) && (
        <div className="grid gap-6">
          {chipStrategy.data.map((chip, i) => {
            const Icon = chipIcons[chip.chip_name] || Shield;
            const chipName = chip.chip_name === 'benchboost' ? 'Bench Boost' : 
                           chip.chip_name === 'triplecaptain' ? 'Triple Captain' :
                           chip.chip_name === 'freehit' ? 'Free Hit' : 'Wildcard';
            
            return (
              <Card key={i} className="hover-elevate" data-testid={`card-chip-${i}`}>
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-xl">{chipName}</h3>
                            <Badge
                              variant="default"
                              className="capitalize"
                              data-testid={`badge-status-${i}`}
                            >
                              Available
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {chipDescriptions[chip.chip_name] || 'Strategic chip usage'}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Recommended GW</p>
                          <p className="text-3xl font-bold font-mono text-primary" data-testid={`text-gw-${i}`}>
                            {chip.recommended_gameweek}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-3 rounded-md bg-muted/50 border">
                          <p className="text-xs text-muted-foreground">Expected Value</p>
                          <p className="font-semibold font-mono">{chip.expected_value} pts</p>
                        </div>
                        <div className="p-3 rounded-md bg-muted/50 border">
                          <p className="text-xs text-muted-foreground">Confidence</p>
                          <p className="font-semibold font-mono">{chip.confidence}%</p>
                        </div>
                        <div className="p-3 rounded-md bg-muted/50 border">
                          <p className="text-xs text-muted-foreground">Uses Left</p>
                          <p className="font-semibold font-mono">1</p>
                        </div>
                      </div>

                      <div className="p-3 rounded-md bg-card border">
                        <p className="text-sm font-medium mb-1">AI Reasoning</p>
                        <p className="text-sm text-muted-foreground">{chip.reasoning}</p>
                      </div>

                      <div className="flex gap-3">
                        <Button className="flex-1" variant="outline" data-testid={`button-details-${i}`} disabled>
                          View Details
                        </Button>
                        <Button
                          className="flex-1"
                          disabled
                          data-testid={`button-activate-${i}`}
                        >
                          Activate for GW{chip.recommended_gameweek}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {chipStrategy.data && !Array.isArray(chipStrategy.data) && (
        <ErrorState 
          message={(chipStrategy.data as any).error || "Failed to get chip strategy"} 
          onRetry={() => handleGetStrategy()} 
        />
      )}
    </div>
  );
}
