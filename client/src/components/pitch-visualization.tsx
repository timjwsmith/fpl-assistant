import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { type FPLPlayer } from "@shared/schema";

interface PitchSlot {
  player: FPLPlayer | null;
  position: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

interface PitchVisualizationProps {
  formation: string; // e.g., "4-4-2"
  slots: PitchSlot[];
  onPlayerClick?: (position: number) => void;
  onPlayerRemove?: (position: number) => void;
  className?: string;
}

export function PitchVisualization({
  formation,
  slots,
  onPlayerClick,
  onPlayerRemove,
  className,
}: PitchVisualizationProps) {
  const [def, mid, fwd] = formation.split('-').map(Number);
  
  const gk = slots.find(s => s.position === 1);
  const defenders = slots.filter(s => s.position >= 2 && s.position < 2 + def);
  const midfielders = slots.filter(s => s.position >= 2 + def && s.position < 2 + def + mid);
  const forwards = slots.filter(s => s.position >= 2 + def + mid && s.position <= 11);

  const PlayerSlot = ({ slot }: { slot: PitchSlot | undefined }) => {
    if (!slot) return null;

    const hasPlayer = slot.player !== null;

    return (
      <div
        className={cn(
          "relative group",
          hasPlayer && "cursor-pointer"
        )}
        onClick={() => hasPlayer && onPlayerClick?.(slot.position)}
        data-testid={`slot-position-${slot.position}`}
      >
        <div className={cn(
          "relative flex flex-col items-center gap-1",
          hasPlayer && "hover-elevate active-elevate-2 rounded-lg p-2 -m-2"
        )}>
          {hasPlayer ? (
            <>
              <div className="relative">
                <Avatar className="h-14 w-14 border-2 border-background ring-2 ring-primary/50">
                  <AvatarImage src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${slot.player.id}.png`} />
                  <AvatarFallback className="text-xs font-semibold bg-primary/20">
                    {slot.player.web_name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {slot.isCaptain && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-primary text-xs font-bold">
                    C
                  </Badge>
                )}
                {slot.isViceCaptain && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-secondary text-xs font-bold">
                    V
                  </Badge>
                )}
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold text-foreground max-w-[80px] truncate">
                  {slot.player.web_name}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  £{(slot.player.now_cost / 10).toFixed(1)}m
                </p>
              </div>
              {onPlayerRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlayerRemove(slot.position);
                  }}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                  data-testid={`button-remove-${slot.position}`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => onPlayerClick?.(slot.position)}
              className="h-14 w-14 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-colors flex items-center justify-center group"
              data-testid={`button-add-${slot.position}`}
            >
              <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden bg-gradient-to-b from-emerald-950/20 to-emerald-900/10",
        className
      )}
      data-testid="pitch-visualization"
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_49%,hsl(var(--border))_49%,hsl(var(--border))_51%,transparent_51%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-20 border-2 border-border rounded-b-full" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-20 border-2 border-border rounded-t-full" />
      </div>
      
      <div className="relative p-8 space-y-12">
        <div className="flex justify-center">
          <PlayerSlot slot={gk} />
        </div>

        <div className="flex justify-around">
          {defenders.map((slot, i) => (
            <PlayerSlot key={`def-${i}`} slot={slot} />
          ))}
        </div>

        <div className="flex justify-around">
          {midfielders.map((slot, i) => (
            <PlayerSlot key={`mid-${i}`} slot={slot} />
          ))}
        </div>

        <div className="flex justify-around">
          {forwards.map((slot, i) => (
            <PlayerSlot key={`fwd-${i}`} slot={slot} />
          ))}
        </div>
      </div>
    </Card>
  );
}
