import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PitchVisualization } from "@/components/pitch-visualization";
import { PlayerSearchPanel } from "@/components/player-search-panel";
import { PredictionPanel } from "@/components/prediction-panel";
import { Badge } from "@/components/ui/badge";
import { Save, Undo, Shield } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFPLPlayers, useFPLTeams, useFPLPositions } from "@/hooks/use-fpl-data";
import { useAnalyzeTeam } from "@/hooks/use-ai-predictions";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";
import type { FPLPlayer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface TeamSlot {
  player: FPLPlayer | null;
  position: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

export default function TeamModeller() {
  const { toast } = useToast();
  const [formation, setFormation] = useState("4-4-2");
  const [slots, setSlots] = useState<TeamSlot[]>(
    Array.from({ length: 15 }, (_, i) => ({
      player: null,
      position: i + 1,
      isCaptain: false,
      isViceCaptain: false,
    }))
  );
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const { data: players, isLoading: loadingPlayers, error: playersError, refetch: refetchPlayers } = useFPLPlayers();
  const { data: teams, isLoading: loadingTeams, error: teamsError, refetch: refetchTeams } = useFPLTeams();
  const { data: positions, isLoading: loadingPositions, error: positionsError, refetch: refetchPositions } = useFPLPositions();
  
  const analyzeTeam = useAnalyzeTeam();

  const isLoading = loadingPlayers || loadingTeams || loadingPositions;
  const error = playersError || teamsError || positionsError;

  // Ref to store debounce timeout
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate budget and team stats
  const selectedPlayers = slots.filter(s => s.player !== null).map(s => s.player!);
  const teamValue = selectedPlayers.reduce((sum, p) => sum + p.now_cost / 10, 0);
  const budgetRemaining = 100.0 - teamValue;
  const playingCount = slots.slice(0, 11).filter(s => s.player !== null).length;

  // Analyze team when squad composition or formation changes (with debouncing)
  useEffect(() => {
    // Clear any pending timeout to implement debouncing
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const playingPlayers = slots.slice(0, 11).map(s => s.player).filter(Boolean) as FPLPlayer[];
    
    if (playingPlayers.length >= 11) {
      // Debounce the API call by 400ms to avoid excessive requests during rapid changes
      timeoutRef.current = setTimeout(() => {
        analyzeTeam.mutate({ players: playingPlayers, formation });
      }, 400);
    }

    // Cleanup function to clear timeout on unmount or when dependencies change
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [slots, formation, analyzeTeam]);

  const handlePlayerSelect = (player: FPLPlayer) => {
    if (selectedSlot === null) {
      toast({
        title: "No slot selected",
        description: "Please click on an empty slot to add a player",
        variant: "destructive",
      });
      return;
    }

    // Check if player already selected
    if (slots.some(s => s.player?.id === player.id)) {
      toast({
        title: "Player already selected",
        description: `${player.web_name} is already in your team`,
        variant: "destructive",
      });
      return;
    }

    // Check budget
    if (player.now_cost / 10 > budgetRemaining) {
      toast({
        title: "Insufficient budget",
        description: `${player.web_name} costs £${(player.now_cost / 10).toFixed(1)}m but you only have £${budgetRemaining.toFixed(1)}m`,
        variant: "destructive",
      });
      return;
    }

    // Add player to slot
    setSlots(prev => prev.map(s => 
      s.position === selectedSlot ? { ...s, player } : s
    ));
    setSelectedSlot(null);

    toast({
      title: "Player added",
      description: `${player.web_name} added to your team`,
    });
  };

  const handleSlotClick = (position: number) => {
    const slot = slots.find(s => s.position === position);
    
    if (slot?.player) {
      // Remove player
      setSlots(prev => prev.map(s => 
        s.position === position ? { ...s, player: null, isCaptain: false, isViceCaptain: false } : s
      ));
      toast({
        title: "Player removed",
        description: `${slot.player.web_name} removed from your team`,
      });
    } else {
      // Select slot for adding player
      setSelectedSlot(position);
    }
  };

  const handleReset = () => {
    setSlots(Array.from({ length: 15 }, (_, i) => ({
      player: null,
      position: i + 1,
      isCaptain: false,
      isViceCaptain: false,
    })));
    setSelectedSlot(null);
    toast({
      title: "Team reset",
      description: "All players have been removed",
    });
  };

  if (isLoading) {
    return <LoadingScreen message="Loading player data..." />;
  }

  if (error) {
    return <ErrorState 
      message="Failed to load player data. Please try again." 
      onRetry={() => {
        refetchPlayers();
        refetchTeams();
        refetchPositions();
      }}
    />;
  }

  return (
    <div className="space-y-6" data-testid="page-team-modeller">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Team Modeller</h1>
        <p className="text-muted-foreground mt-2">
          Build and optimize your squad with real-time AI predictions.
        </p>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">Formation</span>
        </div>
        <Select value={formation} onValueChange={setFormation}>
          <SelectTrigger className="w-[140px]" data-testid="select-formation">
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

        {selectedSlot && (
          <Badge variant="outline" className="ml-2">
            Click a player to add to position {selectedSlot}
          </Badge>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-reset">
            <Undo className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button size="sm" data-testid="button-save-team" disabled>
            <Save className="h-4 w-4 mr-2" />
            Save Team
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PitchVisualization
            formation={formation}
            slots={slots}
            onPlayerClick={handleSlotClick}
          />

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground">Team Value</p>
              <p className="text-2xl font-bold font-mono" data-testid="text-team-value">
                £{teamValue.toFixed(1)}m
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground">In Bank</p>
              <p className="text-2xl font-bold font-mono" data-testid="text-bank">
                £{budgetRemaining.toFixed(1)}m
              </p>
            </div>
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-sm text-muted-foreground">Players</p>
              <p className="text-2xl font-bold font-mono" data-testid="text-players">
                {playingCount}/11
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <PredictionPanel
            currentPoints={selectedPlayers.reduce((sum, p) => sum + p.total_points, 0)}
            predictedPoints={analyzeTeam.data?.predicted_points || 0}
            confidence={analyzeTeam.data?.confidence || 0}
            insights={
              analyzeTeam.data?.insights || 
              (selectedPlayers.length === 0 
                ? ["Select players to see AI predictions", "Build your team to get insights"]
                : analyzeTeam.isPending
                  ? ["Analyzing your team..."]
                  : ["Select 11 players to get AI predictions"])
            }
          />

          <PlayerSearchPanel
            players={players || []}
            teams={teams || []}
            positions={positions || []}
            onPlayerSelect={handlePlayerSelect}
            budgetRemaining={budgetRemaining}
          />
        </div>
      </div>
    </div>
  );
}
