import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Save, RefreshCw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import type { UserSettings } from "@shared/schema";

export default function Settings() {
  const { toast } = useToast();
  const userId = 1;

  const { data: settings, isLoading, error, refetch } = useQuery<UserSettings>({
    queryKey: ["/api/settings", userId],
    staleTime: 60 * 1000,
  });

  const [managerId, setManagerId] = useState("");
  const [primaryLeagueId, setPrimaryLeagueId] = useState("");
  const [riskTolerance, setRiskTolerance] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [formation, setFormation] = useState("4-4-2");

  useEffect(() => {
    if (settings) {
      setManagerId(settings.manager_id?.toString() || "");
      setPrimaryLeagueId(settings.primary_league_id?.toString() || "");
      setRiskTolerance(settings.risk_tolerance || "balanced");
      setFormation(settings.preferred_formation || "4-4-2");
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async (newSettings: UserSettings) => {
      return apiRequest("POST", `/api/settings/${userId}`, newSettings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings", userId] });
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const syncTeam = useMutation({
    mutationFn: async (manId: string) => {
      return apiRequest("POST", `/api/manager/sync/${manId}`, {});
    },
    onSuccess: (data: any) => {
      toast({
        title: "Team synced successfully",
        description: `Synced ${data.playerCount} players, Team Value: £${(data.teamValue / 10).toFixed(1)}m, Free Transfers: ${data.freeTransfers}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/settings", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/manager", parseInt(managerId), "status"] });
      queryClient.invalidateQueries({ queryKey: [`/api/manager/${managerId}/status`] });
    },
    onError: (error: any) => {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync team. Please check your Manager ID and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    const newSettings: UserSettings = {
      manager_id: managerId ? parseInt(managerId) : null,
      primary_league_id: primaryLeagueId ? parseInt(primaryLeagueId) : null,
      risk_tolerance: riskTolerance,
      preferred_formation: formation,
      auto_captain: false,
      notifications_enabled: false,
    };
    saveSettings.mutate(newSettings);
  };

  const handleSyncTeam = () => {
    if (!managerId) {
      toast({
        title: "Manager ID required",
        description: "Please enter your Manager ID before syncing.",
        variant: "destructive",
      });
      return;
    }
    syncTeam.mutate(managerId);
  };

  if (isLoading) {
    return <LoadingScreen message="Loading settings..." />;
  }

  if (error) {
    return <ErrorState message="Failed to load settings" onRetry={refetch} />;
  }

  const isConnected = settings?.manager_id !== null && settings?.manager_id !== undefined;

  return (
    <div className="space-y-8" data-testid="page-settings">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your FPL account and app preferences.
        </p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              FPL Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manager-id">Manager ID</Label>
              <div className="flex gap-2">
                <Input
                  id="manager-id"
                  placeholder="Enter your FPL Manager ID"
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  data-testid="input-manager-id"
                  className="flex-1"
                />
                <Button
                  onClick={handleSyncTeam}
                  disabled={!managerId || syncTeam.isPending}
                  data-testid="button-sync-team"
                  variant="outline"
                >
                  <RefreshCw className={`h-4 w-4 ${syncTeam.isPending ? 'animate-spin' : ''}`} />
                  {syncTeam.isPending ? 'Syncing...' : 'Sync Team'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Find your Manager ID in the FPL website URL when viewing your team
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary-league-id">Primary League ID (Optional)</Label>
              <Input
                id="primary-league-id"
                placeholder="Enter your mini-league ID"
                value={primaryLeagueId}
                onChange={(e) => setPrimaryLeagueId(e.target.value)}
                data-testid="input-primary-league-id"
              />
              <p className="text-xs text-muted-foreground">
                Enter your mini-league ID to see competitor analysis and projected league standings in Gameweek Planner
              </p>
            </div>

            <div className="space-y-2">
              <Label>Account Status</Label>
              <div className="flex items-center gap-2">
                <Badge 
                  variant={isConnected ? "default" : "outline"} 
                  data-testid="badge-status"
                >
                  {isConnected ? `Connected (ID: ${settings?.manager_id})` : "Not Connected"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              AI Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="risk-tolerance">Risk Tolerance</Label>
              <Select value={riskTolerance} onValueChange={(value: any) => setRiskTolerance(value)}>
                <SelectTrigger id="risk-tolerance" data-testid="select-risk-tolerance">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative - Safe picks, minimal risks</SelectItem>
                  <SelectItem value="balanced">Balanced - Mix of safe and differential picks</SelectItem>
                  <SelectItem value="aggressive">Aggressive - High-risk, high-reward strategy</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Affects AI recommendations for transfers, captain picks, and chip timing
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="formation">Preferred Formation</Label>
              <Select value={formation} onValueChange={setFormation}>
                <SelectTrigger id="formation" data-testid="select-formation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3-4-3">3-4-3</SelectItem>
                  <SelectItem value="3-5-2">3-5-2</SelectItem>
                  <SelectItem value="4-3-3">4-3-3</SelectItem>
                  <SelectItem value="4-4-2">4-4-2</SelectItem>
                  <SelectItem value="4-5-1">4-5-1</SelectItem>
                  <SelectItem value="5-3-2">5-3-2</SelectItem>
                  <SelectItem value="5-4-1">5-4-1</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Your default formation preference for AI team recommendations
              </p>
            </div>

            <Button 
              onClick={handleSave} 
              className="w-full" 
              disabled={saveSettings.isPending}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveSettings.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
