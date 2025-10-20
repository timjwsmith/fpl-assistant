import { useState } from "react";
import { Calendar, TrendingUp, TrendingDown, ArrowRight, CheckCircle, XCircle, AlertCircle, Zap, Sparkles, Users, Shield, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFPLPlayers, useFPLTeams, useFPLGameweeks } from "@/hooks/use-fpl-data";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { GameweekPlan, ChangeHistory, FPLPlayer, FPLTeam, FPLGameweek, UserSettings } from "@shared/schema";

interface PlanData extends GameweekPlan {
  freeTransfers?: number;
  transfersCost?: number;
  lineup?: Array<{
    player_id: number;
    position: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
  strategicInsights?: string[];
}

interface LeagueAnalysis {
  userRank: number;
  gapToFirst: number;
  averageLeaguePoints: number;
  leadersAnalysis?: any[];
  commonPicks?: any[];
  differentials?: any[];
  strategicInsights?: string[];
}

interface LeagueProjection {
  gameweek: number;
  leagueId: number;
  standings: any[];
  insights?: string[];
  winStrategy?: string[];
}

export default function GameweekPlanner() {
  const userId = 1;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState(false);

  const { data: gameweeks, isLoading: loadingGameweeks } = useFPLGameweeks();
  const { data: players, isLoading: loadingPlayers } = useFPLPlayers();
  const { data: teams, isLoading: loadingTeams } = useFPLTeams();

  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings", userId],
    staleTime: 60 * 1000,
  });

  const { data: fplAuthStatus } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/fpl-auth/status", userId],
  });

  const currentGameweek = (gameweeks as FPLGameweek[] | undefined)?.find((gw: FPLGameweek) => gw.is_current) || (gameweeks as FPLGameweek[] | undefined)?.[0];

  const { data: leagueAnalysis } = useQuery<LeagueAnalysis>({
    queryKey: ["/api/league-analysis", userId, currentGameweek?.id],
    queryFn: async () => {
      const url = `/api/league-analysis/${userId}?gameweek=${currentGameweek?.id}`;
      return apiRequest("GET", url);
    },
    enabled: !!currentGameweek?.id && !!settings?.primary_league_id,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: leagueProjection, isLoading: loadingProjection } = useQuery<LeagueProjection>({
    queryKey: ["/api/league-projection", userId, currentGameweek?.id],
    queryFn: async () => {
      const url = `/api/league-projection/${userId}?gameweek=${currentGameweek?.id}`;
      return apiRequest("GET", url);
    },
    enabled: !!currentGameweek?.id && !!settings?.primary_league_id,
    retry: false,
    staleTime: 30 * 60 * 1000,
  });

  const { data: plan, isLoading: loadingPlan, error: planError, refetch: refetchPlan } = useQuery<PlanData>({
    queryKey: ["/api/automation/plan", userId, currentGameweek?.id],
    queryFn: async () => {
      const url = `/api/automation/plan/${userId}?gameweek=${currentGameweek?.id}`;
      return apiRequest("GET", url);
    },
    enabled: !!currentGameweek?.id,
    retry: false,
    staleTime: 30 * 1000,
  });

  const { data: history, isLoading: loadingHistory } = useQuery<ChangeHistory[]>({
    queryKey: ["/api/automation/history", userId],
  });

  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/automation/analyze/${userId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/plan", userId] });
      toast({
        title: "Plan Generated",
        description: "Your gameweek plan has been generated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const buildAroundPlayerMutation = useMutation({
    mutationFn: async () => {
      const haaland = (players as FPLPlayer[] | undefined)?.find(
        p => p.web_name === "Haaland" || p.web_name === "Håland"
      );
      if (!haaland) {
        throw new Error("Could not find Haaland in player database");
      }
      return apiRequest("POST", `/api/automation/analyze/${userId}?targetPlayerId=${haaland.id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/plan", userId] });
      toast({
        title: "Team Plan Generated",
        description: "Multi-transfer plan to build around your target player has been generated.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate team plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const applyPlanMutation = useMutation({
    mutationFn: async () => {
      if (!plan?.id) {
        throw new Error("No plan available to apply");
      }
      return apiRequest("POST", `/api/automation/apply/${userId}`, {
        gameweekPlanId: plan.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/plan", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/automation/history", userId] });
      setShowApplyDialog(false);
      toast({
        title: "Plan Applied",
        description: "Changes have been applied to your FPL account.",
      });
    },
    onError: (error: Error) => {
      setShowApplyDialog(false);
      toast({
        title: "Application Failed",
        description: error.message || "Failed to apply plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: 'previewed' | 'rejected') => {
      return apiRequest("PATCH", `/api/automation/plan/${plan?.id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/plan", userId] });
    },
  });

  const syncTeamMutation = useMutation({
    mutationFn: async () => {
      if (!settings?.manager_id) throw new Error("Manager ID not found");
      return apiRequest("POST", `/api/manager/sync/${settings.manager_id}`, {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/manager/${settings?.manager_id}/status`] });
      queryClient.invalidateQueries({ queryKey: ["/api/automation/plan", userId] });
      toast({
        title: "Sync Complete",
        description: `Synced ${data.playerCount} players from FPL`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message || "Could not sync from FPL",
        variant: "destructive",
      });
    },
  });

  const isLoading = loadingGameweeks || loadingPlayers || loadingTeams || loadingPlan;

  if (isLoading) {
    return <LoadingScreen message="Loading gameweek planner..." />;
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 70) return "text-chart-2";
    if (confidence >= 40) return "text-yellow-500";
    return "text-destructive";
  };

  const getConfidenceBadgeVariant = (confidence: number): "default" | "secondary" | "destructive" => {
    if (confidence > 70) return "default";
    if (confidence >= 40) return "secondary";
    return "destructive";
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    if (priority === 'high') return "default";
    if (priority === 'medium') return "secondary";
    return "outline";
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "secondary", label: "Pending" },
      previewed: { variant: "outline", label: "Previewed" },
      applied: { variant: "default", label: "Applied" },
      rejected: { variant: "destructive", label: "Rejected" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const positionNames = ['', 'GK', 'DEF', 'MID', 'FWD'];

  const getPlayerById = (playerId: number | null | undefined): FPLPlayer | undefined => {
    if (!playerId || !players) return undefined;
    return (players as FPLPlayer[]).find(p => p.id === playerId);
  };

  const getTeamById = (teamId: number | undefined): FPLTeam | undefined => {
    if (!teamId || !teams) return undefined;
    return (teams as FPLTeam[]).find(t => t.id === teamId);
  };

  return (
    <div className="space-y-8" data-testid="page-gameweek-planner">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Gameweek Planner</h1>
          <p className="text-muted-foreground mt-2">
            AI-powered gameweek analysis and recommendations
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentGameweek && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Current Gameweek</p>
              <p className="text-2xl font-bold">GW {currentGameweek.id}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button
              onClick={() => syncTeamMutation.mutate()}
              disabled={syncTeamMutation.isPending || !settings?.manager_id}
              variant="outline"
              data-testid="button-sync-team"
            >
              {syncTeamMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Latest Team
                </>
              )}
            </Button>
            <Button
              onClick={() => buildAroundPlayerMutation.mutate()}
              disabled={buildAroundPlayerMutation.isPending || !settings?.manager_id || !players}
              variant="outline"
              data-testid="button-build-around-player"
            >
              {buildAroundPlayerMutation.isPending ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-spin" />
                  Building Plan...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Build Around Player
                </>
              )}
            </Button>
            <Button
              onClick={() => generatePlanMutation.mutate()}
              disabled={generatePlanMutation.isPending || !settings?.manager_id}
              data-testid="button-generate-plan"
            >
              {generatePlanMutation.isPending ? (
                <>
                  <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Plan
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {!settings?.manager_id && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please set your FPL Manager ID in settings to generate gameweek plans.
          </AlertDescription>
        </Alert>
      )}

      {planError && !plan && (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <Calendar className="h-16 w-16 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-semibold text-lg mb-2">No Plan Available</h3>
              <p className="text-muted-foreground">
                Generate your first gameweek plan to get AI-powered recommendations
              </p>
            </div>
            <Button
              onClick={() => generatePlanMutation.mutate()}
              disabled={generatePlanMutation.isPending || !settings?.manager_id}
              variant="outline"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {plan && (
        <>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold">Plan Overview</h2>
            {getStatusBadge(plan.status)}
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Predicted Points</p>
                  <TrendingUp className="h-4 w-4 text-chart-2" />
                </div>
                <p className="text-4xl font-bold font-mono">{plan.predictedPoints}</p>
                <p className="text-xs text-muted-foreground mt-2">GW {plan.gameweek}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">Confidence</p>
                  <Shield className={`h-4 w-4 ${getConfidenceColor(plan.confidence)}`} />
                </div>
                <p className={`text-4xl font-bold font-mono ${getConfidenceColor(plan.confidence)}`}>
                  {plan.confidence}%
                </p>
                <Badge variant={getConfidenceBadgeVariant(plan.confidence)} className="mt-2">
                  {plan.confidence > 70 ? 'High' : plan.confidence >= 40 ? 'Medium' : 'Low'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Free Transfers</p>
                <p className="text-4xl font-bold font-mono">{plan.freeTransfers || 1}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Cost: {plan.transfersCost || 0} pts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground mb-2">Chip Recommendation</p>
                {plan.chipToPlay ? (
                  <>
                    <Badge variant="default" className="text-sm capitalize">
                      {plan.chipToPlay.replace(/([A-Z])/g, ' $1').trim()}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-2">Recommended</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">None</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Reasoning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Collapsible open={expandedReasoning} onOpenChange={setExpandedReasoning}>
                <CollapsibleContent className="space-y-2">
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {plan.aiReasoning}
                  </p>
                </CollapsibleContent>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="mt-2">
                    {expandedReasoning ? 'Show Less' : 'Show More'}
                  </Button>
                </CollapsibleTrigger>
              </Collapsible>
            </CardContent>
          </Card>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Transfer Recommendations</h2>
            {plan.transfers && plan.transfers.length > 0 ? (
              <div className="space-y-4">
                {plan.transfers.map((transfer, i) => {
                  const playerOut = getPlayerById(transfer.player_out_id);
                  const playerIn = getPlayerById(transfer.player_in_id);
                  const teamOut = getTeamById(playerOut?.team);
                  const teamIn = getTeamById(playerIn?.team);

                  return (
                    <Card key={i} className="hover-elevate" data-testid={`transfer-${i}`}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-4">
                          <Badge variant={getPriorityColor(transfer.priority)} className="capitalize">
                            {transfer.priority} Priority
                          </Badge>
                          <div className="flex items-center gap-2 text-sm font-semibold text-chart-2">
                            <TrendingUp className="h-4 w-4" />
                            +{transfer.expected_points_gain.toFixed(1)} pts
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
                                <div className="flex items-center gap-2 mt-1">
                                  {teamOut?.code && (
                                    <img 
                                      src={`https://resources.premierleague.com/premierleague/badges/t${teamOut.code}.png`}
                                      alt={teamOut.short_name}
                                      className="h-4 w-4 object-contain"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    {teamOut?.short_name} • {positionNames[playerOut?.element_type || 0]}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    £{((playerOut?.now_cost || 0) / 10).toFixed(1)}m
                                  </Badge>
                                </div>
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
                                <div className="flex items-center gap-2 mt-1">
                                  {teamIn?.code && (
                                    <img 
                                      src={`https://resources.premierleague.com/premierleague/badges/t${teamIn.code}.png`}
                                      alt={teamIn.short_name}
                                      className="h-4 w-4 object-contain"
                                      onError={(e) => {
                                        e.currentTarget.style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <p className="text-xs text-muted-foreground">
                                    {teamIn?.short_name} • {positionNames[playerIn?.element_type || 0]}
                                  </p>
                                  <Badge variant="outline" className="text-xs">
                                    £{((playerIn?.now_cost || 0) / 10).toFixed(1)}m
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-muted-foreground">{transfer.reasoning}</p>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-chart-2 mb-3" />
                  <p className="text-muted-foreground">No transfers recommended for this gameweek</p>
                </CardContent>
              </Card>
            )}
          </div>

          {(plan.captainId || plan.viceCaptainId) && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Captain Selection</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {plan.captainId && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-primary" />
                        Captain
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const captain = getPlayerById(plan.captainId);
                        const captainTeam = getTeamById(captain?.team);
                        return (
                          <div className="flex items-center gap-3">
                            <Avatar className="h-16 w-16 border-2 border-primary">
                              <AvatarImage src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${captain?.photo?.replace('.jpg', '.png')}`} />
                              <AvatarFallback className="font-semibold">
                                {captain?.web_name.substring(0, 2).toUpperCase() || '??'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-semibold text-lg">{captain?.web_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">
                                {captainTeam?.short_name} • {positionNames[captain?.element_type || 0]}
                              </p>
                              <Badge variant="outline" className="mt-1">
                                {captain?.selected_by_percent}% owned
                              </Badge>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}

                {plan.viceCaptainId && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Shield className="h-5 w-5 text-muted-foreground" />
                        Vice-Captain
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {(() => {
                        const viceCaptain = getPlayerById(plan.viceCaptainId);
                        const viceCaptainTeam = getTeamById(viceCaptain?.team);
                        return (
                          <div className="flex items-center gap-3">
                            <Avatar className="h-16 w-16 border-2 border-muted">
                              <AvatarImage src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${viceCaptain?.photo?.replace('.jpg', '.png')}`} />
                              <AvatarFallback className="font-semibold">
                                {viceCaptain?.web_name.substring(0, 2).toUpperCase() || '??'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-semibold text-lg">{viceCaptain?.web_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">
                                {viceCaptainTeam?.short_name} • {positionNames[viceCaptain?.element_type || 0]}
                              </p>
                              <Badge variant="outline" className="mt-1">
                                {viceCaptain?.selected_by_percent}% owned
                              </Badge>
                            </div>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {plan.formation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Formation & Lineup
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    {plan.formation}
                  </Badge>
                </div>
                {plan.lineup && plan.lineup.length > 0 ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-semibold mb-2">Starting XI</p>
                      <div className="grid gap-2 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                        {plan.lineup.filter(p => p.position <= 11).map((pick, idx) => {
                          const player = getPlayerById(pick.player_id);
                          const team = getTeamById(player?.team);
                          return (
                            <div key={idx} className="p-2 rounded-md border bg-card flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${player?.photo?.replace('.jpg', '.png')}`} />
                                <AvatarFallback className="text-xs">
                                  {player?.web_name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{player?.web_name}</p>
                                <p className="text-xs text-muted-foreground">{team?.short_name}</p>
                              </div>
                              {pick.is_captain && <Badge className="text-xs">C</Badge>}
                              {pick.is_vice_captain && <Badge variant="outline" className="text-xs">VC</Badge>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-semibold mb-2">Bench</p>
                      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
                        {plan.lineup.filter(p => p.position > 11).map((pick, idx) => {
                          const player = getPlayerById(pick.player_id);
                          const team = getTeamById(player?.team);
                          return (
                            <div key={idx} className="p-2 rounded-md border bg-muted/50 flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${player?.photo?.replace('.jpg', '.png')}`} />
                                <AvatarFallback className="text-xs">
                                  {player?.web_name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{player?.web_name}</p>
                                <p className="text-xs text-muted-foreground">{team?.short_name}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    Lineup details not available
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {plan.strategicInsights && plan.strategicInsights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Strategic Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.strategicInsights.map((insight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-chart-2 mt-0.5 flex-shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>How to Use This Plan</CardTitle>
              <CardDescription>
                Follow these steps to apply AI recommendations to your FPL team
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Alert className="bg-primary/5 border-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <AlertDescription className="text-sm">
                    <p className="font-medium mb-2">📋 Recommended Workflow:</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                      <li>Review the AI recommendations above</li>
                      <li>Open the <a href="https://fantasy.premierleague.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">FPL website/app</a> and apply changes manually</li>
                      <li>Click "Sync from FPL" below to update this app with your changes</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="default"
                    onClick={() => syncTeamMutation.mutate()}
                    disabled={!settings?.manager_id || syncTeamMutation.isPending}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${syncTeamMutation.isPending ? 'animate-spin' : ''}`} />
                    {syncTeamMutation.isPending ? 'Syncing...' : 'Sync from FPL'}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate('previewed')}
                    disabled={plan.status === 'previewed' || plan.status === 'applied' || updateStatusMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Reviewed
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => updateStatusMutation.mutate('rejected')}
                    disabled={plan.status === 'rejected' || plan.status === 'applied' || updateStatusMutation.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject Plan
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-start gap-2 mb-3">
                  <Zap className="h-4 w-4 text-yellow-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Auto-Apply (Optional - Limited)</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      If you've set up FPL authentication in Settings, you can try automatic application. Note: FPL's security may block this.
                    </p>
                  </div>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => setShowApplyDialog(true)}
                  disabled={
                    plan.status === 'applied' ||
                    !fplAuthStatus?.authenticated ||
                    applyPlanMutation.isPending
                  }
                  data-testid="button-apply-plan"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Try Auto-Apply
                </Button>
                {!fplAuthStatus?.authenticated && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ⚙️ Set up FPL authentication in Settings to enable this feature
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {leagueAnalysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              League Competitive Analysis
            </CardTitle>
            <CardDescription>
              Insights from your league's top performers to help you climb the rankings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Your Position</p>
                <p className="text-3xl font-bold">#{leagueAnalysis.userRank}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">Gap to 1st</p>
                <p className="text-3xl font-bold">{leagueAnalysis.gapToFirst} pts</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-1">League Avg</p>
                <p className="text-3xl font-bold">{leagueAnalysis.averageLeaguePoints} pts</p>
              </div>
            </div>

            {leagueAnalysis.commonPicks && leagueAnalysis.commonPicks.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-chart-2" />
                  Essential Picks (Top Managers)
                </h4>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {leagueAnalysis.commonPicks.map((pick: any, idx: number) => {
                    const player = getPlayerById(pick.playerId);
                    const team = getTeamById(player?.team);
                    return (
                      <div key={idx} className="p-3 rounded-md border bg-card flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-chart-2/30">
                          <AvatarImage src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${player?.photo?.replace('.jpg', '.png')}`} />
                          <AvatarFallback className="text-xs">
                            {player?.web_name.substring(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{player?.web_name || pick.playerName}</p>
                          <p className="text-xs text-muted-foreground">{team?.short_name}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {pick.count}/{leagueAnalysis.leadersAnalysis?.length || 5} leaders
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {leagueAnalysis.differentials && leagueAnalysis.differentials.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  Differential Opportunities
                </h4>
                <div className="space-y-2">
                  {leagueAnalysis.differentials.map((diff: any, idx: number) => {
                    const player = getPlayerById(diff.playerId);
                    const team = getTeamById(player?.team);
                    return (
                      <div key={idx} className="p-3 rounded-md border bg-card flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${player?.photo?.replace('.jpg', '.png')}`} />
                          <AvatarFallback className="text-xs">
                            {player?.web_name.substring(0, 2).toUpperCase() || '??'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{player?.web_name || diff.playerName}</p>
                          <p className="text-xs text-muted-foreground mb-1">{team?.short_name}</p>
                          <p className="text-xs text-muted-foreground">{diff.reason}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {leagueAnalysis.strategicInsights && leagueAnalysis.strategicInsights.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  League Strategy Insights
                </h4>
                <ul className="space-y-2">
                  {leagueAnalysis.strategicInsights.map((insight: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                      <span>{insight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {leagueProjection && leagueProjection.standings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Projected League Standings
            </CardTitle>
            <CardDescription>
              Predicted positions after Gameweek {leagueProjection.gameweek} based on expected points
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {leagueProjection.insights && leagueProjection.insights.length > 0 && (
              <div className="space-y-2">
                {leagueProjection.insights.map((insight: string, idx: number) => (
                  <Alert key={idx} className="bg-primary/5 border-primary/20">
                    <AlertDescription className="text-sm flex items-start gap-2">
                      <div className="mt-0.5">{insight.charAt(0)}</div>
                      <span>{insight.slice(1)}</span>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            )}

            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left text-xs font-medium">Rank</th>
                      <th className="px-3 py-2 text-left text-xs font-medium">Manager</th>
                      <th className="px-3 py-2 text-right text-xs font-medium">Current</th>
                      <th className="px-3 py-2 text-right text-xs font-medium">GW Pred</th>
                      <th className="px-3 py-2 text-right text-xs font-medium">Projected</th>
                      <th className="px-3 py-2 text-center text-xs font-medium">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leagueProjection.standings.map((standing: any) => (
                      <tr 
                        key={standing.managerId} 
                        className={`border-b ${standing.isUser ? 'bg-primary/10 font-medium' : ''}`}
                      >
                        <td className="px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className={standing.isUser ? 'text-primary font-bold' : ''}>
                              #{standing.projectedRank}
                            </span>
                            {standing.projectedRank === 1 && <span className="text-yellow-500">🏆</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm">
                          <div>
                            <p className={`truncate max-w-[150px] ${standing.isUser ? 'text-primary font-semibold' : ''}`}>
                              {standing.teamName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                              {standing.managerName}
                            </p>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          <div>
                            <p>{standing.currentPoints}</p>
                            <p className="text-xs text-muted-foreground">#{standing.currentRank}</p>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-sm text-right">
                          <Badge variant="outline" className="font-mono">
                            {standing.predictedGWPoints}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-sm text-right font-medium">
                          {standing.projectedPoints}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {standing.rankChange > 0 ? (
                            <Badge variant="default" className="bg-chart-2 text-white gap-1">
                              <TrendingUp className="h-3 w-3" />
                              {standing.rankChange}
                            </Badge>
                          ) : standing.rankChange < 0 ? (
                            <Badge variant="destructive" className="gap-1">
                              <TrendingDown className="h-3 w-3" />
                              {Math.abs(standing.rankChange)}
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <ArrowRight className="h-3 w-3" />
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {leagueProjection.winStrategy && leagueProjection.winStrategy.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Win Strategy
                </h4>
                <div className="space-y-2">
                  {leagueProjection.winStrategy.map((strategy: string, idx: number) => (
                    <div key={idx} className="p-3 rounded-md border bg-muted/50 flex items-start gap-2 text-sm">
                      <div className="mt-0.5">{strategy.charAt(0)}</div>
                      <span>{strategy.slice(1)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {history && history.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">Change History</h2>
          <div className="space-y-3">
            {history.map((change) => (
              <Card key={change.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {change.appliedSuccessfully ? (
                        <CheckCircle className="h-5 w-5 text-chart-2 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="capitalize">
                            {change.changeType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            GW {change.gameweek}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(change.createdAt).toLocaleString()}
                        </p>
                        {change.errorMessage && (
                          <p className="text-sm text-destructive mt-1">{change.errorMessage}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant={change.appliedSuccessfully ? "default" : "destructive"}>
                      {change.appliedSuccessfully ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <AlertDialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Gameweek Plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will apply all recommended changes to your FPL account, including transfers,
              captain selection, and chip usage. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => applyPlanMutation.mutate()}
              disabled={applyPlanMutation.isPending}
            >
              {applyPlanMutation.isPending ? 'Applying...' : 'Apply Changes'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
