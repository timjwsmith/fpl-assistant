import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Settings as SettingsIcon, Save, RefreshCw, Lock, Unlock, Loader2, Zap } from "lucide-react";
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
import { useLocation } from "wouter";
import type { UserSettings } from "@shared/schema";

interface FPLAuthStatus {
  authenticated: boolean;
}

interface AutomationSettings {
  autoSyncEnabled: boolean;
  autoApplyTransfers: boolean;
  autoApplyCaptain: boolean;
  autoApplyChips: boolean;
  maxTransferHit: number;
  notificationEnabled: boolean;
}

interface GameweekPlan {
  id: number;
  gameweek: number;
}

export default function Settings() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const userId = 1;

  const { data: settings, isLoading, error, refetch } = useQuery<UserSettings>({
    queryKey: ["/api/settings", userId],
    staleTime: 60 * 1000,
  });

  const [managerId, setManagerId] = useState("");
  const [riskTolerance, setRiskTolerance] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [formation, setFormation] = useState("4-4-2");

  const [fplEmail, setFplEmail] = useState("");
  const [fplPassword, setFplPassword] = useState("");
  const [fplCookies, setFplCookies] = useState("");

  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoApplyTransfers, setAutoApplyTransfers] = useState(false);
  const [autoApplyCaptain, setAutoApplyCaptain] = useState(false);
  const [autoApplyChips, setAutoApplyChips] = useState(false);
  const [maxTransferHit, setMaxTransferHit] = useState(8);
  const [notificationEnabled, setNotificationEnabled] = useState(true);

  useEffect(() => {
    if (settings) {
      setManagerId(settings.manager_id?.toString() || "");
      setRiskTolerance(settings.risk_tolerance || "balanced");
      setFormation(settings.preferred_formation || "4-4-2");
    }
  }, [settings]);

  const { data: authStatus, refetch: refetchAuthStatus } = useQuery<FPLAuthStatus>({
    queryKey: ["/api/fpl-auth/status", userId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/fpl-auth/status/${userId}`) as FPLAuthStatus;
      return response;
    },
    staleTime: 30 * 1000,
  });

  const { data: automationSettings, refetch: refetchAutomationSettings } = useQuery<AutomationSettings>({
    queryKey: ["/api/automation/settings", userId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/automation/settings/${userId}`) as AutomationSettings;
      return response;
    },
    enabled: authStatus?.authenticated === true,
    staleTime: 60 * 1000,
  });

  useEffect(() => {
    if (automationSettings) {
      setAutoSyncEnabled(automationSettings.autoSyncEnabled || false);
      setAutoApplyTransfers(automationSettings.autoApplyTransfers || false);
      setAutoApplyCaptain(automationSettings.autoApplyCaptain || false);
      setAutoApplyChips(automationSettings.autoApplyChips || false);
      setMaxTransferHit(automationSettings.maxTransferHit || 8);
      setNotificationEnabled(automationSettings.notificationEnabled ?? true);
    }
  }, [automationSettings]);

  const loginMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/fpl-auth/login", {
        userId,
        email: fplEmail,
        password: fplPassword,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fpl-auth/status", userId] });
      refetchAuthStatus();
      setFplPassword("");
      toast({
        title: "Login successful",
        description: "You are now authenticated with FPL.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Failed to authenticate with FPL. Please check your credentials.",
        variant: "destructive",
      });
    },
  });

  const cookieLoginMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/fpl-auth/login-with-cookies", {
        userId,
        cookies: fplCookies,
        email: fplEmail || undefined,
        password: fplPassword || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fpl-auth/status", userId] });
      refetchAuthStatus();
      setFplCookies("");
      setFplPassword("");
      toast({
        title: "Login successful",
        description: "You are now authenticated with FPL using cookies.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Login failed",
        description: error.message || "Failed to authenticate with FPL. Please check your cookies.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/fpl-auth/logout/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fpl-auth/status", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/automation/settings", userId] });
      refetchAuthStatus();
      setFplEmail("");
      setFplPassword("");
      setFplCookies("");
      toast({
        title: "Logged out",
        description: "Your FPL credentials have been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Logout failed",
        description: error.message || "Failed to logout.",
        variant: "destructive",
      });
    },
  });

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

  const saveAutomationSettings = useMutation({
    mutationFn: async (settings: Partial<AutomationSettings>) => {
      return apiRequest("POST", `/api/automation/settings/${userId}`, settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/automation/settings", userId] });
      toast({
        title: "Automation settings saved",
        description: "Your automation preferences have been updated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save automation settings.",
        variant: "destructive",
      });
    },
  });

  const analyzeGameweek = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/automation/analyze/${userId}`) as Promise<GameweekPlan>;
    },
    onSuccess: (data: GameweekPlan) => {
      toast({
        title: "Gameweek plan generated",
        description: "Your AI-powered gameweek plan is ready to view.",
      });
      setLocation("/gameweek-planner");
    },
    onError: (error: any) => {
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to generate gameweek plan. Please try again.",
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

  const handleFPLLogin = () => {
    if (!fplEmail || !fplPassword) {
      toast({
        title: "Missing credentials",
        description: "Please enter both email and password.",
        variant: "destructive",
      });
      return;
    }
    loginMutation.mutate();
  };

  const handleCookieLogin = () => {
    if (!fplCookies) {
      toast({
        title: "Missing cookies",
        description: "Please paste your FPL session cookies.",
        variant: "destructive",
      });
      return;
    }
    cookieLoginMutation.mutate();
  };

  const handleSaveAutomationSettings = () => {
    const settings: Partial<AutomationSettings> = {
      autoSyncEnabled,
      autoApplyTransfers,
      autoApplyCaptain,
      autoApplyChips,
      maxTransferHit,
      notificationEnabled,
    };
    saveAutomationSettings.mutate(settings);
  };

  if (isLoading) {
    return <LoadingScreen message="Loading settings..." />;
  }

  if (error) {
    return <ErrorState message="Failed to load settings" onRetry={refetch} />;
  }

  const isConnected = settings?.manager_id !== null && settings?.manager_id !== undefined;
  const isFPLAuthenticated = authStatus?.authenticated === true;

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
              {isFPLAuthenticated ? <Unlock className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              Automation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-3">FPL Login</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Required for automation features
                </p>
              </div>

              {!isFPLAuthenticated ? (
                <Tabs defaultValue="credentials" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="credentials">Email/Password</TabsTrigger>
                    <TabsTrigger value="cookies">Cookie Authentication</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="credentials" className="space-y-4 mt-4">
                    <div className="space-y-4 bg-green-500/10 border border-green-500/20 p-4 rounded-lg mb-4">
                      <div className="flex items-start gap-3">
                        <div className="bg-green-500/20 p-2 rounded-lg">
                          <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-green-300 mb-2">✅ Full Automation Available</p>
                          <p className="text-sm text-muted-foreground">
                            Remote browser service is configured! This works on iOS, Android, and all devices. Just enter your FPL credentials below.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fpl-email">Email</Label>
                      <Input
                        id="fpl-email"
                        type="email"
                        placeholder="your@email.com"
                        value={fplEmail}
                        onChange={(e) => setFplEmail(e.target.value)}
                        data-testid="input-fpl-email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fpl-password">Password</Label>
                      <Input
                        id="fpl-password"
                        type="password"
                        placeholder="••••••••"
                        value={fplPassword}
                        onChange={(e) => setFplPassword(e.target.value)}
                        data-testid="input-fpl-password"
                      />
                    </div>

                    <Button
                      onClick={handleFPLLogin}
                      disabled={loginMutation.isPending}
                      className="w-full"
                      data-testid="button-fpl-login"
                    >
                      {loginMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Logging in via remote browser...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Login to FPL (Automated)
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Credentials encrypted & stored securely. Login runs on secure remote browser.
                    </p>
                  </TabsContent>
                  
                  <TabsContent value="cookies" className="space-y-4 mt-4">
                    <div className="space-y-4 bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                      <div className="flex items-start gap-3">
                        <div className="bg-blue-500/20 p-2 rounded-lg">
                          <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm text-blue-300 mb-2">ℹ️ Manual Cookie Method (Alternative)</p>
                          <p className="text-sm text-muted-foreground">
                            <strong>Recommended:</strong> Use the "Email/Password" tab for automated login. This manual method is only for advanced users who already have cookies from browser DevTools.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fpl-cookies">Paste FPL Session Cookies</Label>
                      <Textarea
                        id="fpl-cookies"
                        placeholder="sessionid=abc123; csrftoken=def456; pl_profile=ghi789"
                        value={fplCookies}
                        onChange={(e) => setFplCookies(e.target.value)}
                        data-testid="input-fpl-cookies"
                        className="font-mono text-xs min-h-[100px]"
                      />
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>Required cookies: <code className="bg-muted px-1 py-0.5 rounded">sessionid</code>, <code className="bg-muted px-1 py-0.5 rounded">csrftoken</code>, <code className="bg-muted px-1 py-0.5 rounded">pl_profile</code></p>
                        <p>Format: <code className="bg-muted px-1 py-0.5 rounded">cookie1=value1; cookie2=value2; cookie3=value3</code></p>
                      </div>
                    </div>

                    <div className="space-y-4 border-t pt-4">
                      <p className="text-sm font-medium">Optional: Enable auto-refresh</p>
                      <p className="text-sm text-muted-foreground">
                        Provide email/password to automatically refresh expired cookies
                      </p>
                      
                      <div className="space-y-2">
                        <Label htmlFor="fpl-email-cookie">Email (Optional)</Label>
                        <Input
                          id="fpl-email-cookie"
                          type="email"
                          placeholder="your@email.com"
                          value={fplEmail}
                          onChange={(e) => setFplEmail(e.target.value)}
                          data-testid="input-fpl-email-cookie"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="fpl-password-cookie">Password (Optional)</Label>
                        <Input
                          id="fpl-password-cookie"
                          type="password"
                          placeholder="••••••••"
                          value={fplPassword}
                          onChange={(e) => setFplPassword(e.target.value)}
                          data-testid="input-fpl-password-cookie"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleCookieLogin}
                      disabled={cookieLoginMutation.isPending}
                      className="w-full"
                      data-testid="button-cookie-login"
                    >
                      {cookieLoginMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Logging in...
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          Login with Cookies
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      Your FPL cookies are encrypted and stored securely
                    </p>
                  </TabsContent>
                </Tabs>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Authentication Status</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="flex items-center gap-1">
                          <Unlock className="h-3 w-3" />
                          Connected
                        </Badge>
                      </div>
                    </div>
                    <Button
                      onClick={() => logoutMutation.mutate()}
                      disabled={logoutMutation.isPending}
                      variant="outline"
                      size="sm"
                      data-testid="button-fpl-logout"
                    >
                      {logoutMutation.isPending ? "Logging out..." : "Logout"}
                    </Button>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <div>
                      <h3 className="font-medium mb-3">Automation Settings</h3>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-sync">Enable Auto-Sync</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically sync your team data
                        </p>
                      </div>
                      <Switch
                        id="auto-sync"
                        checked={autoSyncEnabled}
                        onCheckedChange={setAutoSyncEnabled}
                        data-testid="switch-auto-sync"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-transfers">Auto-Apply Transfers</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically apply recommended transfers
                        </p>
                      </div>
                      <Switch
                        id="auto-transfers"
                        checked={autoApplyTransfers}
                        onCheckedChange={setAutoApplyTransfers}
                        data-testid="switch-auto-transfers"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-captain">Auto-Apply Captain Selection</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically select captain based on AI
                        </p>
                      </div>
                      <Switch
                        id="auto-captain"
                        checked={autoApplyCaptain}
                        onCheckedChange={setAutoApplyCaptain}
                        data-testid="switch-auto-captain"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="auto-chips">Auto-Apply Chips</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically play chips when optimal
                        </p>
                      </div>
                      <Switch
                        id="auto-chips"
                        checked={autoApplyChips}
                        onCheckedChange={setAutoApplyChips}
                        data-testid="switch-auto-chips"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max-transfer-hit">Max Transfer Hit (points)</Label>
                      <Input
                        id="max-transfer-hit"
                        type="number"
                        min="0"
                        max="16"
                        value={maxTransferHit}
                        onChange={(e) => setMaxTransferHit(parseInt(e.target.value) || 8)}
                        data-testid="input-max-transfer-hit"
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum points hit allowed for transfers (default: 8)
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="notifications">Enable Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified about automation actions
                        </p>
                      </div>
                      <Switch
                        id="notifications"
                        checked={notificationEnabled}
                        onCheckedChange={setNotificationEnabled}
                        data-testid="switch-notifications"
                      />
                    </div>

                    <Button
                      onClick={handleSaveAutomationSettings}
                      disabled={saveAutomationSettings.isPending}
                      className="w-full"
                      data-testid="button-save-automation"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saveAutomationSettings.isPending ? "Saving..." : "Save Automation Settings"}
                    </Button>
                  </div>

                  <div className="border-t pt-4 space-y-4">
                    <div>
                      <h3 className="font-medium mb-3">Quick Actions</h3>
                    </div>

                    <Button
                      onClick={() => analyzeGameweek.mutate()}
                      disabled={analyzeGameweek.isPending}
                      className="w-full"
                      variant="default"
                      data-testid="button-generate-plan"
                    >
                      {analyzeGameweek.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Zap className="h-4 w-4 mr-2" />
                          Generate Gameweek Plan
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="risk">Risk Tolerance</Label>
              <Select value={riskTolerance} onValueChange={(v: any) => setRiskTolerance(v)}>
                <SelectTrigger id="risk" data-testid="select-risk">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservative">Conservative</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="aggressive">Aggressive</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Affects differential player recommendations and chip timing
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Transfer Deadline Reminders</p>
                <p className="text-sm text-muted-foreground">
                  Get notified 1 hour before deadline
                </p>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Price Change Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Alert when players in your team change price
                </p>
              </div>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>

        <Button 
          className="w-full" 
          onClick={handleSave} 
          disabled={saveSettings.isPending}
          data-testid="button-save-settings"
        >
          <Save className="h-4 w-4 mr-2" />
          {saveSettings.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}
