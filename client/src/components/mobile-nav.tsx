import { Home, Users, Repeat, Calendar, BarChart3, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: Home,
    testId: "mobile-nav-dashboard",
  },
  {
    title: "Team",
    url: "/team-modeller",
    icon: Users,
    testId: "mobile-nav-team",
  },
  {
    title: "Transfers",
    url: "/transfers",
    icon: Repeat,
    testId: "mobile-nav-transfers",
  },
  {
    title: "Planner",
    url: "/gameweek-planner",
    icon: Calendar,
    testId: "mobile-nav-planner",
  },
  {
    title: "AI Impact",
    url: "/ai-impact",
    icon: BarChart3,
    testId: "mobile-nav-ai-impact",
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
    testId: "mobile-nav-settings",
  },
];

export function MobileNav() {
  const [location] = useLocation();

  return (
    <nav 
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-bottom"
      data-testid="mobile-nav"
    >
      <div className="grid grid-cols-6 h-16">
        {navItems.map((item) => {
          const isActive = location === item.url;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.url}
              href={item.url}
              data-testid={item.testId}
              className={cn(
                "flex flex-col items-center justify-center gap-1 touch-target hover-elevate active-elevate-2 transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
