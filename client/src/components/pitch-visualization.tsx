import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, X } from "lucide-react";
import { cn, getPlayerShirtUrl } from "@/lib/utils";
import { type FPLPlayer } from "@shared/schema";
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent, closestCenter } from "@dnd-kit/core";
import { useState } from "react";

export interface PitchSlot {
  player: FPLPlayer | null;
  position: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  teamCode?: number;
}

interface PitchVisualizationProps {
  formation: string;
  slots: PitchSlot[];
  benchSlots: PitchSlot[];
  onPlayerSwap?: (fromPosition: number, toPosition: number) => void;
  onCaptainAssign?: (position: number, isCaptain: boolean) => void;
  onPlayerClick?: (position: number) => void;
  onPlayerRemove?: (position: number) => void;
  onError?: (title: string, description: string) => void;
  className?: string;
}

interface DraggablePlayerSlotProps {
  slot: PitchSlot;
  onRemove?: (position: number) => void;
}

interface DroppableSlotProps {
  slot: PitchSlot;
  isValidDrop: boolean;
  isDragActive: boolean;
  onClick?: (position: number) => void;
  onRemove?: (position: number) => void;
}

function DraggablePlayerSlot({ slot, onRemove }: DraggablePlayerSlotProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `player-${slot.position}`,
    data: {
      type: 'player',
      position: slot.position,
      player: slot.player,
      elementType: slot.player?.element_type,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  if (!slot.player) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "relative group cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
      data-testid={`draggable-player-${slot.position}`}
    >
      <div className="relative flex flex-col items-center gap-1 hover-elevate active-elevate-2 rounded-lg p-2 -m-2">
        <div className="relative">
          <Avatar className="h-14 w-14 border-2 border-background ring-2 ring-primary/50">
            <AvatarImage 
              src={slot.teamCode ? getPlayerShirtUrl(slot.teamCode, 110) : undefined}
              alt={`${slot.player.web_name} shirt`}
            />
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
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(slot.position);
            }}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            data-testid={`button-remove-${slot.position}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function DroppableSlot({ slot, isValidDrop, isDragActive, onClick, onRemove }: DroppableSlotProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${slot.position}`,
    data: {
      type: 'slot',
      position: slot.position,
      elementType: getElementTypeForPosition(slot.position),
      accepts: getElementTypeForPosition(slot.position),
    },
  });

  const hasPlayer = slot.player !== null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative",
        isDragActive && !hasPlayer && "transition-all duration-200"
      )}
      data-testid={`slot-position-${slot.position}`}
    >
      {hasPlayer ? (
        <DraggablePlayerSlot slot={slot} onRemove={onRemove} />
      ) : (
        <button
          onClick={() => onClick?.(slot.position)}
          className={cn(
            "h-14 w-14 rounded-full border-2 border-dashed transition-all duration-200 flex items-center justify-center group",
            isDragActive && isValidDrop && isOver && "border-primary bg-primary/20 scale-110",
            isDragActive && isValidDrop && !isOver && "border-primary/50 bg-primary/5",
            isDragActive && !isValidDrop && "border-muted-foreground/10 bg-muted/5",
            !isDragActive && "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
          )}
          data-testid={`button-add-${slot.position}`}
        >
          <Plus className={cn(
            "h-6 w-6 transition-colors",
            isDragActive && isValidDrop && isOver && "text-primary",
            isDragActive && isValidDrop && !isOver && "text-primary/70",
            isDragActive && !isValidDrop && "text-muted-foreground/30",
            !isDragActive && "text-muted-foreground group-hover:text-primary"
          )} />
        </button>
      )}
    </div>
  );
}

function DraggableBadge({ type, isActive }: { type: 'captain' | 'vice-captain'; isActive: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `badge-${type}`,
    data: {
      type: 'badge',
      badgeType: type,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
      data-testid={`draggable-badge-${type}`}
    >
      <Badge 
        className={cn(
          "h-10 w-10 flex items-center justify-center text-lg font-bold",
          type === 'captain' ? "bg-primary" : "bg-secondary",
          !isActive && "opacity-50"
        )}
      >
        {type === 'captain' ? 'C' : 'V'}
      </Badge>
    </div>
  );
}

function getElementTypeForPosition(position: number): number {
  // Position 1 is always GK
  if (position === 1) return 1;
  
  // Positions 2-6 could be DEF (2)
  if (position >= 2 && position <= 6) return 2;
  
  // Positions 7-11 could be MID (3) or FWD (4)
  // We'll be more permissive here and allow both
  if (position >= 7 && position <= 11) return 0; // 0 means accept any outfield
  
  // Bench positions accept any
  return 0;
}

export function PitchVisualization({
  formation,
  slots,
  benchSlots,
  onPlayerSwap,
  onCaptainAssign,
  onPlayerClick,
  onPlayerRemove,
  onError,
  className,
}: PitchVisualizationProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedPlayer, setDraggedPlayer] = useState<FPLPlayer | null>(null);

  const [def, mid, fwd] = formation.split('-').map(Number);
  
  const gk = slots.find(s => s.position === 1);
  const defenders = slots.filter(s => s.position >= 2 && s.position < 2 + def);
  const midfielders = slots.filter(s => s.position >= 2 + def && s.position < 2 + def + mid);
  const forwards = slots.filter(s => s.position >= 2 + def + mid && s.position <= 11);

  const hasCaptain = slots.some(s => s.isCaptain);
  const hasViceCaptain = slots.some(s => s.isViceCaptain);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    
    if (event.active.data.current?.type === 'player') {
      setDraggedPlayer(event.active.data.current.player);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveId(null);
    setDraggedPlayer(null);

    if (!over) return;

    // Handle badge drops (captain/vice-captain assignment)
    if (active.data.current?.type === 'badge') {
      const badgeType = active.data.current.badgeType;
      const badgeLabel = badgeType === 'captain' ? 'Captain' : 'Vice-captain';
      
      // Check if dropping on a slot
      if (over.data.current?.type === 'slot') {
        const targetPosition = over.data.current.position;
        const allSlots = [...slots, ...benchSlots];
        const targetSlot = allSlots.find(s => s.position === targetPosition);
        
        // Check if slot has a player
        if (!targetSlot?.player) {
          onError?.('Cannot assign ' + badgeLabel.toLowerCase(), 'Please drop the badge on a player, not an empty slot');
          return;
        }
        
        // Check if player is in starting XI (1-11)
        if (targetSlot.position > 11) {
          onError?.('Cannot assign ' + badgeLabel.toLowerCase(), badgeLabel + ' can only be assigned to players in your starting XI');
          return;
        }
        
        // Valid assignment
        onCaptainAssign?.(targetPosition, badgeType === 'captain');
      }
      return;
    }

    // Handle player swaps
    if (active.data.current?.type === 'player' && over.data.current?.type === 'slot') {
      const fromPosition = active.data.current.position;
      const toPosition = over.data.current.position;
      
      if (fromPosition === toPosition) return;

      // Validate position compatibility
      const draggedElementType = active.data.current.elementType;
      const targetAccepts = over.data.current.accepts;

      // Position 1 must be GK
      if (toPosition === 1 && draggedElementType !== 1) return;
      
      // GK can only go to position 1
      if (draggedElementType === 1 && toPosition !== 1) return;

      // For other positions, allow swaps
      onPlayerSwap?.(fromPosition, toPosition);
    }
  };

  const isValidDrop = (slotPosition: number): boolean => {
    if (!draggedPlayer) return true;
    
    const draggedElementType = draggedPlayer.element_type;
    
    // Position 1 must be GK
    if (slotPosition === 1) return draggedElementType === 1;
    
    // GK can only go to position 1
    if (draggedElementType === 1) return slotPosition === 1;
    
    // All other positions can swap freely
    return true;
  };

  const isDragActive = activeId !== null && activeId.startsWith('player-');

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Assign Captain:</span>
            <DraggableBadge type="captain" isActive={!hasCaptain} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Assign Vice:</span>
            <DraggableBadge type="vice-captain" isActive={!hasViceCaptain} />
          </div>
        </div>

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
              {gk && (
                <DroppableSlot 
                  slot={gk} 
                  isValidDrop={isValidDrop(gk.position)} 
                  isDragActive={isDragActive}
                  onClick={onPlayerClick}
                  onRemove={onPlayerRemove}
                />
              )}
            </div>

            <div className="flex justify-around gap-2">
              {defenders.map((slot) => (
                <DroppableSlot 
                  key={`def-${slot.position}`}
                  slot={slot} 
                  isValidDrop={isValidDrop(slot.position)} 
                  isDragActive={isDragActive}
                  onClick={onPlayerClick}
                  onRemove={onPlayerRemove}
                />
              ))}
            </div>

            <div className="flex justify-around gap-2">
              {midfielders.map((slot) => (
                <DroppableSlot 
                  key={`mid-${slot.position}`}
                  slot={slot} 
                  isValidDrop={isValidDrop(slot.position)} 
                  isDragActive={isDragActive}
                  onClick={onPlayerClick}
                  onRemove={onPlayerRemove}
                />
              ))}
            </div>

            <div className="flex justify-around gap-2">
              {forwards.map((slot) => (
                <DroppableSlot 
                  key={`fwd-${slot.position}`}
                  slot={slot} 
                  isValidDrop={isValidDrop(slot.position)} 
                  isDragActive={isDragActive}
                  onClick={onPlayerClick}
                  onRemove={onPlayerRemove}
                />
              ))}
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Bench</h3>
          <div className="flex gap-4 justify-start">
            {benchSlots.map((slot) => (
              <DroppableSlot 
                key={`bench-${slot.position}`}
                slot={slot} 
                isValidDrop={true}
                isDragActive={isDragActive}
                onClick={onPlayerClick}
                onRemove={onPlayerRemove}
              />
            ))}
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeId && draggedPlayer && (
          <div className="opacity-80">
            <div className="relative flex flex-col items-center gap-1 bg-card rounded-lg p-2 border-2 border-primary shadow-lg">
              <Avatar className="h-14 w-14 border-2 border-background ring-2 ring-primary/50">
                <AvatarImage src={`https://resources.premierleague.com/premierleague/photos/players/110x140/p${draggedPlayer.photo}`} />
                <AvatarFallback className="text-xs font-semibold bg-primary/20">
                  {draggedPlayer.web_name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-xs font-semibold text-foreground max-w-[80px] truncate">
                  {draggedPlayer.web_name}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  £{(draggedPlayer.now_cost / 10).toFixed(1)}m
                </p>
              </div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
