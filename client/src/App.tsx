import { Switch, Route } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Trophy } from "lucide-react";

import Dashboard from "@/pages/dashboard";
import TeamModeller from "@/pages/team-modeller";
import Transfers from "@/pages/transfers";
import Fixtures from "@/pages/fixtures";
import Settings from "@/pages/settings";
import GameweekPlanner from "@/pages/gameweek-planner";
import AIImpact from "@/pages/ai-impact";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/team-modeller" component={TeamModeller} />
      <Route path="/transfers" component={Transfers} />
      <Route path="/fixtures" component={Fixtures} />
      <Route path="/gameweek-planner" component={GameweekPlanner} />
      <Route path="/ai-impact" component={AIImpact} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  } as React.CSSProperties;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <SidebarProvider style={style}>
            <div className="flex h-screen w-full">
              <div className="hidden md:flex">
                <AppSidebar />
              </div>
              <div className="flex flex-col flex-1 overflow-hidden">
                <header className="flex items-center justify-between p-3 md:p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 safe-top">
                  <div className="hidden md:block">
                    <SidebarTrigger data-testid="button-sidebar-toggle" className="hover-elevate active-elevate-2" />
                  </div>
                  <div className="flex md:hidden items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-yellow-600">
                      <Trophy className="h-5 w-5 text-white" />
                    </div>
                    <h1 className="text-lg font-semibold">FPL Assistant</h1>
                  </div>
                  <ThemeToggle />
                </header>
                <main className="flex-1 overflow-auto pb-0 md:pb-0">
                  <div className="container max-w-7xl mx-auto p-4 md:p-8 pb-20 md:pb-8">
                    <Router />
                  </div>
                </main>
              </div>
            </div>
            <MobileNav />
          </SidebarProvider>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
