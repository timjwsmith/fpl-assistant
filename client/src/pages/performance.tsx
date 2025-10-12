import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "wouter";

export default function Performance() {
  // Demo data - in a real app this would come from manager history
  const comparisons = [
    { gameweek: 7, actual: 68, predicted: 72, difference: -4 },
    { gameweek: 6, actual: 54, predicted: 58, difference: -4 },
    { gameweek: 5, actual: 82, predicted: 76, difference: 6 },
    { gameweek: 4, actual: 61, predicted: 64, difference: -3 },
    { gameweek: 3, actual: 78, predicted: 71, difference: 7 },
  ];

  const accuracy = 92;
  const hasData = false; // Placeholder feature - not yet implemented

  return (
    <div className="space-y-8" data-testid="page-performance">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Performance Analysis</h1>
          <p className="text-muted-foreground mt-2">
            Track how AI predictions compare to actual performance.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">Coming Soon</Badge>
      </div>

      {!hasData ? (
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
                <Button>Connect FPL Account</Button>
              </Link>
              <Link href="/team-modeller">
                <Button variant="outline">Build a Team</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Prediction Accuracy</p>
                    <p className="text-2xl font-bold font-mono" data-testid="text-accuracy">{accuracy}%</p>
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
                    <p className="text-sm text-muted-foreground">Avg. Outperformance</p>
                    <p className="text-2xl font-bold font-mono text-chart-2" data-testid="text-outperform">+1.2</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-chart-4/10">
                    <TrendingDown className="h-6 w-6 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Biggest Miss</p>
                    <p className="text-2xl font-bold font-mono" data-testid="text-miss">-4</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="gameweek" className="w-full">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="gameweek" data-testid="tab-gameweek">
                By Gameweek
              </TabsTrigger>
              <TabsTrigger value="recommendations" data-testid="tab-recommendations">
                Recommendation Impact
              </TabsTrigger>
            </TabsList>

            <TabsContent value="gameweek" className="space-y-4 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Predicted vs Actual Points</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {comparisons.map((comp, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover-elevate"
                        data-testid={`comparison-${i}`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center min-w-[60px]">
                            <p className="text-xs text-muted-foreground">GW</p>
                            <p className="font-semibold text-lg font-mono">{comp.gameweek}</p>
                          </div>

                          <div className="grid grid-cols-2 gap-6">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Predicted</p>
                              <p className="font-bold font-mono text-lg">{comp.predicted}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Actual</p>
                              <p className="font-bold font-mono text-lg">{comp.actual}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {comp.difference > 0 ? (
                            <>
                              <Badge variant="outline" className="border-chart-2/50 text-chart-2 bg-chart-2/10">
                                <TrendingUp className="h-3 w-3 mr-1" />
                                +{comp.difference}
                              </Badge>
                            </>
                          ) : (
                            <>
                              <Badge variant="outline" className="border-destructive/50 text-destructive bg-destructive/10">
                                <TrendingDown className="h-3 w-3 mr-1" />
                                {comp.difference}
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-2">Insights</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• AI predictions were most accurate in GW5 (within 1 point)</li>
                    <li>• Biggest underestimation was in GW5 (+7 points)</li>
                    <li>• Average prediction error: 4.8 points per gameweek</li>
                    <li>• Recommendations followed in GW5 led to highest returns</li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations" className="space-y-4 mt-6">
              <div className="text-center py-12 text-muted-foreground">
                <p>Recommendation impact analysis</p>
                <p className="text-sm mt-1">Track which AI suggestions delivered the best results</p>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
