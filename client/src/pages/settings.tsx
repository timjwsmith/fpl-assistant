import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Settings as SettingsIcon, Save, RefreshCw, Lock, Unlock, Loader2, AlertCircle, Info } from "lucide-react";
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

interface FPLAuthStatus {
  authenticated: boolean;
  cookieExpiry: string | null;
  daysUntilExpiry: number | null;
  expiryWarning: boolean;
}

export default function Settings() {
  const { toast } = useToast();
  const userId = 1;

  const { data: settings, isLoading, error, refetch } = useQuery<UserSettings>({
    queryKey: [`/api/settings/${userId}`],
    staleTime: 60 * 1000,
  });

  const [managerId, setManagerId] = useState("");
  const [primaryLeagueId, setPrimaryLeagueId] = useState("");
  const [riskTolerance, setRiskTolerance] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [fplEmail, setFplEmail] = useState("");
  const [fplPassword, setFplPassword] = useState("");
  const [fplCookies, setFplCookies] = useState("");

  useEffect(() => {
    if (settings) {
      setManagerId(settings.manager_id?.toString() || "");
      setPrimaryLeagueId(settings.primary_league_id?.toString() || "");
      setRiskTolerance(settings.risk_tolerance || "balanced");
    }
  }, [settings]);

  const { data: authStatus, refetch: refetchAuthStatus } = useQuery<FPLAuthStatus>({
    queryKey: [`/api/fpl-auth/status/${userId}`],
    staleTime: 30 * 1000,
  });

  const saveSettings = useMutation({
    mutationFn: async (newSettings: UserSettings) => {
      return apiRequest(`/api/settings/${userId}`, {
        method: "POST",
        body: JSON.stringify(newSettings),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/settings/${userId}`] });
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
      return apiRequest(`/api/manager/sync/${manId}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: "Team synced successfully",
        description: `Synced ${data.playerCount} players, Team Value: £${(data.teamValue / 10).toFixed(1)}m, Free Transfers: ${data.freeTransfers}`,
      });
      queryClient.invalidateQueries({ queryKey: [`/api/settings/${userId}`] });
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

  const emailPasswordLoginMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/fpl-auth/login", {
        method: "POST",
        body: JSON.stringify({
          userId,
          email: fplEmail,
          password: fplPassword,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/fpl-auth/status/${userId}`] });
      refetchAuthStatus();
      setFplEmail("");
      setFplPassword("");
      toast({
        title: "Login successful",
        description: "Successfully authenticated with FPL!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Failed to authenticate with FPL. This may be due to security restrictions.",
        variant: "destructive",
      });
    },
  });

  const cookieLoginMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/fpl-auth/login-with-cookies", {
        method: "POST",
        body: JSON.stringify({
          userId,
          cookies: fplCookies,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/fpl-auth/status/${userId}`] });
      refetchAuthStatus();
      setFplCookies("");
      toast({
        title: "Authentication successful",
        description: "Successfully authenticated with FPL using cookies.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Authentication failed",
        description: error.message || "Failed to authenticate with provided cookies.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/fpl-auth/logout/${userId}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/fpl-auth/status/${userId}`] });
      refetchAuthStatus();
      setFplEmail("");
      setFplPassword("");
      setFplCookies("");
      toast({
        title: "Logged out",
        description: "Your FPL credentials have been removed.",
      });
    },
  });

  const handleSave = () => {
    const newSettings: UserSettings = {
      manager_id: managerId ? parseInt(managerId) : null,
      primary_league_id: primaryLeagueId ? parseInt(primaryLeagueId) : null,
      risk_tolerance: riskTolerance,
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
    <div className="space-y-6 md:space-y-8" data-testid="page-settings">
      <div>
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm md:text-base text-muted-foreground mt-2">
          Manage your FPL account and app preferences.
        </p>
      </div>

      <div className="grid gap-4 md:gap-6 max-w-2xl">
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
              <div className="flex flex-col sm:flex-row gap-2">
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
                  className="touch-target w-full sm:w-auto"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${syncTeam.isPending ? 'animate-spin' : ''}`} />
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

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                The AI automatically determines the optimal formation for your squad based on player quality, fixtures, and form.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={handleSave} 
              className="w-full touch-target" 
              disabled={saveSettings.isPending}
              data-testid="button-save"
            >
              <Save className="h-4 w-4 mr-2" />
              {saveSettings.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {authStatus?.authenticated ? <Unlock className="h-5 w-5 text-green-500" /> : <Lock className="h-5 w-5" />}
              FPL Authentication
            </CardTitle>
            <CardDescription>
              Optional: Authenticate to fetch your current team automatically
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Note:</strong> Your current team can be fetched publicly using your Manager ID without authentication. 
                Authentication is only needed for advanced features like automatic team syncing.
              </AlertDescription>
            </Alert>

            {authStatus?.authenticated ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-green-500/20 p-2 rounded-lg">
                      <Unlock className="h-5 w-5 text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-green-300">Authenticated</p>
                      <p className="text-sm text-muted-foreground">
                        {authStatus.daysUntilExpiry !== null && authStatus.daysUntilExpiry > 0
                          ? `Expires in ${authStatus.daysUntilExpiry} days`
                          : "Active session"}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => logoutMutation.mutate()}
                    variant="outline"
                    size="sm"
                    disabled={logoutMutation.isPending}
                  >
                    Logout
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Login with Email & Password</h4>
                  <div className="space-y-2">
                    <Label htmlFor="fpl-email">FPL Email</Label>
                    <Input
                      id="fpl-email"
                      type="email"
                      placeholder="your@email.com"
                      value={fplEmail}
                      onChange={(e) => setFplEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fpl-password">FPL Password</Label>
                    <Input
                      id="fpl-password"
                      type="password"
                      placeholder="••••••••"
                      value={fplPassword}
                      onChange={(e) => setFplPassword(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => emailPasswordLoginMutation.mutate()}
                    disabled={emailPasswordLoginMutation.isPending || !fplEmail || !fplPassword}
                    className="w-full"
                  >
                    {emailPasswordLoginMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Login with Email & Password
                      </>
                    )}
                  </Button>
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Known Issue:</strong> FPL uses Datadome bot protection which may block automated logins. 
                      If login fails, use the "Sync Team" button with your Manager ID instead - it works without authentication.
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-sm">Login with Session Cookies</h4>
                  <div className="space-y-2">
                    <Label htmlFor="fpl-cookies">FPL Session Cookies</Label>
                    <Textarea
                      id="fpl-cookies"
                      placeholder="Paste your cookies here (sessionid, csrftoken, pl_profile)"
                      value={fplCookies}
                      onChange={(e) => setFplCookies(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      Extract cookies from your browser's developer tools while logged into FPL
                    </p>
                  </div>
                  <Button
                    onClick={() => cookieLoginMutation.mutate()}
                    disabled={cookieLoginMutation.isPending || !fplCookies}
                    className="w-full"
                    variant="outline"
                  >
                    {cookieLoginMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Authenticating...
                      </>
                    ) : (
                      <>
                        <Lock className="h-4 w-4 mr-2" />
                        Login with Cookies
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
