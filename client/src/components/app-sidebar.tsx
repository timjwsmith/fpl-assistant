import { Home, Users, Repeat, Calendar, Settings, BarChart3, Trophy } from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const mainItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    testId: "link-dashboard",
  },
  {
    title: "Team Modeller",
    url: "/team-modeller",
    icon: Users,
    testId: "link-team-modeller",
  },
  {
    title: "Transfers",
    url: "/transfers",
    icon: Repeat,
    testId: "link-transfers",
  },
  {
    title: "Fixtures",
    url: "/fixtures",
    icon: Calendar,
    testId: "link-fixtures",
  },
  {
    title: "Gameweek Planner",
    url: "/gameweek-planner",
    icon: Calendar,
    testId: "link-gameweek-planner",
  },
  {
    title: "AI Impact",
    url: "/ai-impact",
    icon: BarChart3,
    testId: "link-ai-impact",
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  return (
    <Sidebar data-testid="sidebar-app">
      <SidebarHeader className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gradient-to-br from-amber-500 to-yellow-600">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">FPL Assistant</h2>
            <p className="text-xs text-muted-foreground">AI-Powered</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={location === item.url}>
                    <Link href={item.url} data-testid={item.testId}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-6 pt-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={location === "/settings"}>
              <Link href="/settings" data-testid="link-settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
