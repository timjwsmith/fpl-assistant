import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, X } from "lucide-react";
import { cn, getPlayerShirtUrl } from "@/lib/utils";
import { type FPLPlayer } from "@shared/schema";
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent, DragStartEvent, DragCancelEvent, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors } from "@dnd-kit/core";
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
  selectedPosition?: number | null;
}

interface DraggablePlayerSlotProps {
  slot: PitchSlot;
  onRemove?: (position: number) => void;
  onClick?: (position: number) => void;
  onCaptainClick?: (position: number) => void;
  captainMode?: 'captain' | 'vice-captain' | null;
  isStartingXI?: boolean;
}

interface DroppableSlotProps {
  slot: PitchSlot;
  isValidDrop: boolean;
  isDragActive: boolean;
  onClick?: (position: number) => void;
  onRemove?: (position: number) => void;
  onCaptainClick?: (position: number) => void;
  isSelected?: boolean;
  captainMode?: 'captain' | 'vice-captain' | null;
  isStartingXI?: boolean;
}

function DraggablePlayerSlot({ slot, onRemove, onClick, onCaptainClick, captainMode, isStartingXI }: DraggablePlayerSlotProps) {
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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(slot.position);
  };

  const inCaptainMode = captainMode != null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(inCaptainMode ? {} : { ...listeners, ...attributes })}
      onClick={handleClick}
      className={cn(
        "relative group",
        inCaptainMode ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50"
      )}
      data-testid={`draggable-player-${slot.position}`}
    >
      <div className={cn(
        "relative flex flex-col items-center gap-1 hover-elevate active-elevate-2 rounded-lg p-2 -m-2",
        inCaptainMode && "ring-2 ring-primary/40 ring-offset-1 rounded-lg"
      )}>
        <div className="relative w-fit">
          <Avatar className="h-14 w-14 border-2 border-background ring-2 ring-primary/50">
            <AvatarImage 
              src={getPlayerShirtUrl(slot.player.team_code, 110)}
              alt={`${slot.player.web_name} shirt`}
            />
            <AvatarFallback className="text-xs font-semibold bg-primary/20">
              {slot.player.web_name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {slot.isCaptain && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (isStartingXI && onCaptainClick) onCaptainClick(slot.position);
              }}
              title="Click to change captain"
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 rounded-md bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold z-10 shadow-lg",
                isStartingXI && "hover:scale-110 transition-transform cursor-pointer"
              )}
            >
              C
            </button>
          )}
          {slot.isViceCaptain && (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (isStartingXI && onCaptainClick) onCaptainClick(slot.position);
              }}
              title="Click to change vice-captain"
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 rounded-md bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold z-10 shadow-lg",
                isStartingXI && "hover:scale-110 transition-transform cursor-pointer"
              )}
            >
              V
            </button>
          )}
        </div>
        <div className="text-center mt-0.5">
          <p className="text-xs font-semibold text-foreground max-w-[80px] truncate">
            {slot.player.web_name}
          </p>
          {slot.player.ep_next ? (
            <p className="text-xs font-mono font-semibold text-primary/90">
              {Math.round(parseFloat(slot.player.ep_next))} pts
            </p>
          ) : (
            <p className="text-xs text-muted-foreground font-mono">
              £{(slot.player.now_cost / 10).toFixed(1)}m
            </p>
          )}
        </div>
        {onRemove && !inCaptainMode && (
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (window.confirm(`Remove ${slot.player?.web_name} from your team?`)) {
                onRemove(slot.position);
              }
            }}
            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground items-center justify-center z-20 shadow-md opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex"
            data-testid={`button-remove-${slot.position}`}
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

function DroppableSlot({ slot, isValidDrop, isDragActive, onClick, onRemove, onCaptainClick, isSelected, captainMode, isStartingXI }: DroppableSlotProps) {
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
  const inCaptainMode = captainMode != null;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative",
        isDragActive && !hasPlayer && "transition-all duration-200",
        isSelected && hasPlayer && !inCaptainMode && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg"
      )}
      data-testid={`slot-position-${slot.position}`}
    >
      {hasPlayer ? (
        <div 
          className={cn(
            "cursor-pointer",
            isSelected && !inCaptainMode && "animate-pulse"
          )}
        >
          <DraggablePlayerSlot 
            slot={slot} 
            onRemove={onRemove} 
            onClick={onClick}
            onCaptainClick={onCaptainClick}
            captainMode={captainMode}
            isStartingXI={isStartingXI}
          />
        </div>
      ) : (
        <button
          onClick={() => onClick?.(slot.position)}
          className={cn(
            "h-14 w-14 rounded-full border-2 border-dashed transition-all duration-200 flex items-center justify-center group",
            isDragActive && isValidDrop && isOver && "border-primary bg-primary/20 scale-110",
            isDragActive && isValidDrop && !isOver && "border-primary/50 bg-primary/5",
            isDragActive && !isValidDrop && "border-muted-foreground/10 bg-muted/5",
            isSelected && "border-primary bg-primary/20 scale-110 border-solid",
            !isDragActive && !isSelected && "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
          )}
          data-testid={`button-add-${slot.position}`}
        >
          <Plus className={cn(
            "h-6 w-6 transition-colors",
            isDragActive && isValidDrop && isOver && "text-primary",
            isDragActive && isValidDrop && !isOver && "text-primary/70",
            isDragActive && !isValidDrop && "text-muted-foreground/30",
            isSelected && "text-primary",
            !isDragActive && !isSelected && "text-muted-foreground group-hover:text-primary"
          )} />
        </button>
      )}
    </div>
  );
}

function getElementTypeForPosition(position: number): number {
  if (position === 1) return 1;
  if (position >= 2 && position <= 6) return 2;
  if (position >= 7 && position <= 11) return 0;
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
  selectedPosition,
}: PitchVisualizationProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draggedPlayer, setDraggedPlayer] = useState<FPLPlayer | null>(null);
  const [captainMode, setCaptainMode] = useState<'captain' | 'vice-captain' | null>(null);

  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 10,
    },
  });
  
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  });
  
  const sensors = useSensors(pointerSensor, touchSensor);

  const [def, mid, fwd] = formation.split('-').map(Number);
  
  const gk = slots.find(s => s.position === 1);
  const defenders = slots.filter(s => s.position >= 2 && s.position < 2 + def);
  const midfielders = slots.filter(s => s.position >= 2 + def && s.position < 2 + def + mid);
  const forwards = slots.filter(s => s.position >= 2 + def + mid && s.position <= 11);

  const captainSlot = slots.find(s => s.isCaptain);
  const viceCaptainSlot = slots.find(s => s.isViceCaptain);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setCaptainMode(null);
    
    if (event.active.data.current?.type === 'player') {
      const player = event.active.data.current.player;
      const position = event.active.data.current.position;
      console.log(`[DnD] Drag START: ${player?.web_name || 'unknown'} from position ${position}`);
      setDraggedPlayer(player);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log(`[DnD] Drag END: active=${active?.id}, over=${over?.id || 'null'}`);
    
    setActiveId(null);
    setDraggedPlayer(null);

    if (!over) {
      console.log(`[DnD] No drop target - drag cancelled or dropped outside valid area`);
      return;
    }

    if (active.data.current?.type === 'badge') {
      const badgeType = active.data.current.badgeType;
      const badgeLabel = badgeType === 'captain' ? 'Captain' : 'Vice-captain';
      
      if (over.data.current?.type === 'slot') {
        const targetPosition = over.data.current.position;
        const allSlots = [...slots, ...benchSlots];
        const targetSlot = allSlots.find(s => s.position === targetPosition);
        
        if (!targetSlot?.player) {
          onError?.('Cannot assign ' + badgeLabel.toLowerCase(), 'Please drop the badge on a player, not an empty slot');
          return;
        }
        
        if (targetSlot.position > 11) {
          onError?.('Cannot assign ' + badgeLabel.toLowerCase(), badgeLabel + ' can only be assigned to players in your starting XI');
          return;
        }
        
        onCaptainAssign?.(targetPosition, badgeType === 'captain');
      }
      return;
    }

    if (active.data.current?.type === 'player' && over.data.current?.type === 'slot') {
      const fromPosition = active.data.current.position;
      const toPosition = over.data.current.position;
      
      if (fromPosition === toPosition) return;

      const draggedElementType = active.data.current.elementType;
      const allSlots = [...slots, ...benchSlots];
      const targetSlot = allSlots.find(s => s.position === toPosition);
      const targetElementType = targetSlot?.player?.element_type;
      
      console.log(`[DnD] Swap attempt: pos ${fromPosition} (type ${draggedElementType}) -> pos ${toPosition} (type ${targetElementType})`);

      if (toPosition === 1 && draggedElementType !== 1) {
        console.log(`[DnD] Blocked: non-GK cannot go to position 1`);
        return;
      }
      
      if (draggedElementType === 1 && toPosition !== 1) {
        if (targetElementType === 1) {
          console.log(`[DnD] Allowing GK-to-GK swap`);
        } else {
          console.log(`[DnD] Blocked: GK cannot go to non-GK position ${toPosition}`);
          return;
        }
      }

      console.log(`[DnD] Executing swap`);
      onPlayerSwap?.(fromPosition, toPosition);
    }
  };

  const handleDragCancel = (event: DragCancelEvent) => {
    console.log(`[DnD] Drag CANCELLED: ${event.active?.id}`);
    setActiveId(null);
    setDraggedPlayer(null);
  };

  const isValidDrop = (slotPosition: number): boolean => {
    if (!draggedPlayer) return true;
    
    const draggedElementType = draggedPlayer.element_type;
    
    if (slotPosition === 1) return draggedElementType === 1;
    
    if (draggedElementType === 1) {
      if (slotPosition === 1) return true;
      const allSlots = [...slots, ...benchSlots];
      const targetSlot = allSlots.find(s => s.position === slotPosition);
      return targetSlot?.player?.element_type === 1;
    }
    
    return true;
  };

  const isDragActive = activeId !== null && activeId.startsWith('player-');

  // Handle slot click: if in captain mode, assign captain; otherwise normal click
  const handleSlotClick = (position: number) => {
    if (captainMode !== null) {
      const allSlots = [...slots, ...benchSlots];
      const targetSlot = allSlots.find(s => s.position === position);
      if (!targetSlot?.player) {
        setCaptainMode(null);
        return;
      }
      if (position > 11) {
        onError?.('Cannot assign', captainMode === 'captain' ? 'Captain' : 'Vice-captain' + ' can only be assigned to players in your starting XI');
        setCaptainMode(null);
        return;
      }
      onCaptainAssign?.(position, captainMode === 'captain');
      setCaptainMode(null);
      return;
    }
    onPlayerClick?.(position);
  };

  // Clicking C/V badge on existing captain/vice-captain starts re-assignment mode
  const handleCaptainBadgeClick = (position: number) => {
    const slot = slots.find(s => s.position === position);
    if (!slot) return;
    if (slot.isCaptain) {
      setCaptainMode('captain');
    } else if (slot.isViceCaptain) {
      setCaptainMode('vice-captain');
    }
  };

  const toggleCaptainMode = (mode: 'captain' | 'vice-captain') => {
    setCaptainMode(prev => prev === mode ? null : mode);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={() => toggleCaptainMode('captain')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
              captainMode === 'captain'
                ? "bg-primary text-primary-foreground border-primary shadow-md ring-2 ring-primary/40"
                : "bg-card border-border hover:border-primary/50 hover:bg-primary/5"
            )}
            data-testid="button-assign-captain"
          >
            <span className={cn(
              "h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold",
              captainMode === 'captain' ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
            )}>C</span>
            {captainMode === 'captain' ? 'Click a player to assign captain' : (
              captainSlot ? `Captain: ${captainSlot.player?.web_name}` : 'Assign Captain'
            )}
          </button>

          <button
            onClick={() => toggleCaptainMode('vice-captain')}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all",
              captainMode === 'vice-captain'
                ? "bg-secondary text-secondary-foreground border-secondary shadow-md ring-2 ring-secondary/40"
                : "bg-card border-border hover:border-secondary/50 hover:bg-secondary/5"
            )}
            data-testid="button-assign-vice"
          >
            <span className={cn(
              "h-6 w-6 rounded-md flex items-center justify-center text-xs font-bold",
              captainMode === 'vice-captain' ? "bg-secondary-foreground text-secondary" : "bg-secondary text-secondary-foreground"
            )}>V</span>
            {captainMode === 'vice-captain' ? 'Click a player to assign vice-captain' : (
              viceCaptainSlot ? `Vice: ${viceCaptainSlot.player?.web_name}` : 'Assign Vice'
            )}
          </button>

          {captainMode && (
            <button
              onClick={() => setCaptainMode(null)}
              className="px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-all"
            >
              Cancel
            </button>
          )}
        </div>

        <Card 
          className={cn(
            "relative overflow-hidden bg-gradient-to-b from-emerald-950/20 to-emerald-900/10",
            captainMode && "ring-2 ring-primary/20",
            className
          )}
          data-testid="pitch-visualization"
          onClick={captainMode ? () => setCaptainMode(null) : undefined}
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
                  onClick={handleSlotClick}
                  onRemove={onPlayerRemove}
                  onCaptainClick={handleCaptainBadgeClick}
                  isSelected={selectedPosition === gk.position}
                  captainMode={captainMode}
                  isStartingXI={true}
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
                  onClick={handleSlotClick}
                  onRemove={onPlayerRemove}
                  onCaptainClick={handleCaptainBadgeClick}
                  isSelected={selectedPosition === slot.position}
                  captainMode={captainMode}
                  isStartingXI={true}
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
                  onClick={handleSlotClick}
                  onRemove={onPlayerRemove}
                  onCaptainClick={handleCaptainBadgeClick}
                  isSelected={selectedPosition === slot.position}
                  captainMode={captainMode}
                  isStartingXI={true}
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
                  onClick={handleSlotClick}
                  onRemove={onPlayerRemove}
                  onCaptainClick={handleCaptainBadgeClick}
                  isSelected={selectedPosition === slot.position}
                  captainMode={captainMode}
                  isStartingXI={true}
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
                onClick={captainMode ? () => {
                  onError?.('Cannot assign captain to bench', 'Captain and vice-captain must be in your starting XI');
                  setCaptainMode(null);
                } : onPlayerClick}
                onRemove={onPlayerRemove}
                isSelected={selectedPosition === slot.position}
                captainMode={captainMode}
                isStartingXI={false}
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
                {draggedPlayer.ep_next ? (
                  <p className="text-xs font-mono font-semibold text-primary/90">
                    {Math.round(parseFloat(draggedPlayer.ep_next))} pts
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground font-mono">
                    £{(draggedPlayer.now_cost / 10).toFixed(1)}m
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
