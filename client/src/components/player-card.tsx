import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, TrendingDown, Minus, AlertCircle, AlertTriangle } from "lucide-react";
import { type FPLPlayer } from "@shared/schema";
import { cn, getPlayerShirtUrl } from "@/lib/utils";

interface PlayerCardProps {
  player: FPLPlayer;
  teamName?: string;
  teamCode?: number;
  positionName?: string;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
  showStats?: boolean;
  className?: string;
}

export function PlayerCard({
  player,
  teamName,
  teamCode,
  positionName,
  onClick,
  selected = false,
  disabled = false,
  showStats = true,
  className,
}: PlayerCardProps) {
  const price = (player.now_cost / 10).toFixed(1);
  const formValue = parseFloat(player.form);
  
  const getFormIcon = () => {
    if (formValue >= 5) return <TrendingUp className="h-3 w-3 text-chart-2" />;
    if (formValue <= 2) return <TrendingDown className="h-3 w-3 text-destructive" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const getStatusBadge = () => {
    if (player.status === 'i') return <Badge variant="destructive" className="text-xs">Injured</Badge>;
    if (player.status === 'd') return <Badge variant="outline" className="text-xs border-destructive/50 text-destructive">Doubtful</Badge>;
    if (player.status === 'u') return <Badge variant="outline" className="text-xs">Unavailable</Badge>;
    if (player.status === 's') return <Badge variant="destructive" className="text-xs">Suspended</Badge>;
    return null;
  };

  const getDisciplinaryBadge = () => {
    const yellows = player.yellow_cards || 0;
    const reds = player.red_cards || 0;
    
    // Don't show disciplinary badge if already showing suspension status badge
    // (getStatusBadge handles player.status === 's')
    if (player.status === 's') {
      return null;
    }
    
    // RED CARD BADGES - HIGHEST PRIORITY (before yellow cards)
    // 2+ red cards: High risk temperament issues
    if (reds >= 2) {
      return (
        <Badge variant="destructive" className="text-xs flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          {reds} Red Cards - High Risk
        </Badge>
      );
    }
    
    // 1 red card: Flag temperament concerns
    if (reds === 1) {
      return (
        <Badge variant="outline" className="text-xs border-red-500 text-red-600 dark:text-red-400 flex items-center gap-1">
          1 Red Card
        </Badge>
      );
    }
    
    // YELLOW CARD BADGES - Show after red cards
    // Yellow card warnings based on Premier League suspension thresholds (5, 10, 15)
    // Critical: 1 yellow away from ban
    if (yellows === 4 || yellows === 9 || yellows === 14) {
      return (
        <Badge variant="outline" className="text-xs border-amber-600 bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Next yellow = BAN
        </Badge>
      );
    }
    
    // At a threshold: Show critical risk but NOT "SUSPENDED" (status badge handles that)
    if (yellows === 5 || yellows === 10 || yellows === 15) {
      return (
        <Badge variant="outline" className="text-xs border-amber-600/70 text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {yellows} YC - At threshold
        </Badge>
      );
    }
    
    // Show for 3+ yellows (moderate risk approaching thresholds)
    if (yellows >= 3) {
      return (
        <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center gap-1">
          {yellows} Yellow Cards
        </Badge>
      );
    }
    
    return null;
  };

  return (
    <Card
      className={cn(
        "p-4 hover-elevate active-elevate-2 cursor-pointer transition-all",
        selected && "ring-2 ring-primary",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={disabled ? undefined : onClick}
      data-testid={`card-player-${player.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <Avatar className="h-12 w-12 border-2 border-border">
            <AvatarImage 
              src={teamCode ? getPlayerShirtUrl(teamCode, 110) : undefined} 
              alt={`${player.web_name} shirt`}
            />
            <AvatarFallback className="text-xs font-semibold">
              {player.web_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate" data-testid={`text-player-name-${player.id}`}>
                  {player.web_name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  {teamName} • {positionName}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="font-mono font-semibold text-sm" data-testid={`text-price-${player.id}`}>
                  £{price}m
                </span>
                {getFormIcon()}
              </div>
            </div>
            
            {showStats && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Pts</p>
                  <p className="font-semibold text-sm" data-testid={`text-points-${player.id}`}>{player.total_points}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Form</p>
                  <p className="font-semibold text-sm">{player.form}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Own</p>
                  <p className="font-semibold text-sm">{parseFloat(player.selected_by_percent).toFixed(1)}%</p>
                </div>
              </div>
            )}

            <div className="mt-2 flex items-center gap-2 flex-wrap">
              {getStatusBadge()}
              {getDisciplinaryBadge()}
              {player.news && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  <span className="truncate max-w-[200px]">{player.news}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
