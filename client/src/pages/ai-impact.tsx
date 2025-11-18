import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";
import { useToast } from "@/hooks/use-toast";
import { useAIImpactSummary, useAnalyzeAllGameweeks } from "@/hooks/use-ai-impact";
import { useFPLPlayers } from "@/hooks/use-fpl-data";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MultiWeekPredictionTracker } from "@/components/MultiWeekPredictionTracker";

export default function AIImpact() {
  const userId = 1;
  const { toast } = useToast();
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const { data: summary, isLoading, error, refetch } = useAIImpactSummary(userId);
  const { data: players } = useFPLPlayers();
  const analyzeAllMutation = useAnalyzeAllGameweeks(userId);

  const handleAnalyzeAll = async () => {
    try {
      await analyzeAllMutation.mutateAsync();
      toast({
        title: "Analysis Complete",
        description: "AI impact analysis has been completed for all gameweeks.",
      });
    } catch (error) {
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze gameweeks. Please try again.",
        variant: "destructive",
      });
    }
  };

  const toggleRow = (planId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(planId)) {
      newExpanded.delete(planId);
    } else {
      newExpanded.add(planId);
    }
    setExpandedRows(newExpanded);
  };

  const getPlayerName = (playerId: number | null) => {
    if (!playerId || !players) return "Unknown";
    const player = players.find(p => p.id === playerId);
    return player?.web_name || `Player ${playerId}`;
  };

  const getImpactColor = (delta: number) => {
    if (delta > 0) return "text-green-500";
    if (delta < 0) return "text-red-500";
    return "text-gray-500";
  };

  const getImpactBadgeVariant = (delta: number): "default" | "destructive" | "secondary" => {
    if (delta > 0) return "default";
    if (delta < 0) return "destructive";
    return "secondary";
  };

  if (isLoading) {
    return <LoadingScreen message="Loading AI impact analysis..." />;
  }

  if (error) {
    return <ErrorState message="Failed to load AI impact data. Please try again." onRetry={refetch} />;
  }

  const hasData = summary && summary.totalGameweeksAnalyzed > 0;
  const winRate = hasData
    ? Math.round((summary.positiveImpactCount / summary.totalGameweeksAnalyzed) * 100)
    : 0;

  // Sort gameweeks newest first
  const sortedGameweeks = hasData
    ? [...summary.gameweekBreakdown].sort((a, b) => b.gameweek - a.gameweek)
    : [];

  return (
    <div className="space-y-8" data-testid="page-ai-impact">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">AI Impact Analysis</h1>
          <p className="text-muted-foreground mt-2">
            See how AI recommendations affected your gameweek scores
          </p>
        </div>
        <Button
          onClick={handleAnalyzeAll}
          disabled={analyzeAllMutation.isPending}
          className="gap-2"
        >
          {analyzeAllMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Analysing...
            </>
          ) : (
            <>
              <BarChart3 className="h-4 w-4" />
              Analyse All Gameweeks
            </>
          )}
        </Button>
      </div>

      {/* Empty State */}
      {!hasData && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Analysis Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              Click "Analyse All Gameweeks" to see how AI recommendations have impacted your scores
              for completed gameweeks.
            </p>
            <Button onClick={handleAnalyzeAll} disabled={analyzeAllMutation.isPending}>
              {analyzeAllMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Analysing...
                </>
              ) : (
                <>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Start Analysis
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {hasData && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Gameweeks Analysed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{summary.totalGameweeksAnalyzed}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Points Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getImpactColor(summary.totalPointsDelta)}`}>
                  {summary.totalPointsDelta >= 0 ? "+" : ""}
                  {summary.totalPointsDelta}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Average per Gameweek
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-3xl font-bold ${getImpactColor(summary.averagePointsDelta)}`}>
                  {summary.averagePointsDelta >= 0 ? "+" : ""}
                  {summary.averagePointsDelta.toFixed(1)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Win Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{winRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.positiveImpactCount} / {summary.totalGameweeksAnalyzed} positive
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gameweek Breakdown Table */}
          <Card>
            <CardHeader>
              <CardTitle>Gameweek Breakdown</CardTitle>
              <CardDescription>
                Detailed analysis of AI impact for each gameweek
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>GW</TableHead>
                    <TableHead className="text-right">With AI</TableHead>
                    <TableHead className="text-right">Without AI</TableHead>
                    <TableHead className="text-right">Impact</TableHead>
                    <TableHead>Captain Decision</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedGameweeks.map((gw) => {
                    const isExpanded = expandedRows.has(gw.planId);
                    const hasTransfers = gw.transfers && gw.transfers.length > 0;

                    return (
                      <Collapsible
                        key={gw.planId}
                        open={isExpanded}
                        onOpenChange={() => toggleRow(gw.planId)}
                        asChild
                      >
                        <>
                          <TableRow className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              {hasTransfers && (
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    {isExpanded ? (
                                      <ChevronUp className="h-4 w-4" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">GW{gw.gameweek}</TableCell>
                            <TableCell className="text-right font-semibold">
                              {gw.actualPointsWithAI}
                            </TableCell>
                            <TableCell className="text-right">{gw.actualPointsWithoutAI}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={getImpactBadgeVariant(gw.pointsDelta)}>
                                <span className="flex items-center gap-1">
                                  {gw.pointsDelta > 0 && <TrendingUp className="h-3 w-3" />}
                                  {gw.pointsDelta < 0 && <TrendingDown className="h-3 w-3" />}
                                  {gw.pointsDelta === 0 && <Minus className="h-3 w-3" />}
                                  {gw.pointsDelta >= 0 ? "+" : ""}
                                  {gw.pointsDelta}
                                </span>
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {gw.captainId ? getPlayerName(gw.captainId) : "N/A"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{gw.status}</Badge>
                            </TableCell>
                          </TableRow>
                          
                          {hasTransfers && (
                            <CollapsibleContent asChild>
                              <TableRow>
                                <TableCell colSpan={7} className="bg-muted/30 p-4">
                                  <div className="space-y-2">
                                    <h4 className="font-semibold text-sm mb-2">Transfers Made:</h4>
                                    {gw.transfers.map((transfer, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-center justify-between text-sm bg-background rounded p-2"
                                      >
                                        <span className="flex items-center gap-2">
                                          <span className="text-muted-foreground">Out:</span>
                                          <span className="font-medium">
                                            {getPlayerName(transfer.player_out_id)}
                                          </span>
                                          <span className="text-muted-foreground">→</span>
                                          <span className="text-muted-foreground">In:</span>
                                          <span className="font-medium">
                                            {getPlayerName(transfer.player_in_id)}
                                          </span>
                                        </span>
                                        <Badge variant="outline" className="text-xs">
                                          {transfer.priority}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            </CollapsibleContent>
                          )}
                        </>
                      </Collapsible>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Multi-Week Prediction Tracker */}
          <MultiWeekPredictionTracker userId={userId} />
        </>
      )}
    </div>
  );
}
