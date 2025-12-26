import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { PitchVisualization } from "@/components/pitch-visualization";
import { PlayerSearchPanel } from "@/components/player-search-panel";
import { PredictionPanel } from "@/components/prediction-panel";
import { Badge } from "@/components/ui/badge";
import { Save, Undo, Shield, ArrowRightLeft, RefreshCw, FlaskConical, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useFPLPlayers, useFPLTeams, useFPLPositions, useFPLGameweeks } from "@/hooks/use-fpl-data";
import { useAnalyzeTeam } from "@/hooks/use-ai-predictions";
import { LoadingScreen } from "@/components/loading-screen";
import { ErrorState } from "@/components/error-state";
import type { FPLPlayer, UserSettings, UserTeam, Transfer, GameweekPlan } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TeamSlot {
  player: FPLPlayer | null;
  position: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  teamCode?: number;
}

export default function TeamModeller() {
  const { toast } = useToast();
  const userId = 1; // Hardcoded for now
  const [formation, setFormation] = useState("4-4-2");
  const [slots, setSlots] = useState<TeamSlot[]>(
    Array.from({ length: 15 }, (_, i) => ({
      player: null,
      position: i + 1,
      isCaptain: false,
      isViceCaptain: false,
      teamCode: undefined,
    }))
  );
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [savedTeam, setSavedTeam] = useState<UserTeam | null>(null);
  const [aiPrediction, setAiPrediction] = useState<{ insights: string[]; predicted_points: number; confidence: number } | null>(null);
  const [whatIfResult, setWhatIfResult] = useState<GameweekPlan | null>(null);
  const hasAttemptedAutoSync = useRef(false);

  const { data: players, isLoading: loadingPlayers, error: playersError, refetch: refetchPlayers } = useFPLPlayers();
  const { data: teams, isLoading: loadingTeams, error: teamsError, refetch: refetchTeams } = useFPLTeams();
  const { data: positions, isLoading: loadingPositions, error: positionsError, refetch: refetchPositions } = useFPLPositions();
  const { data: gameweeks, isLoading: loadingGameweeks } = useFPLGameweeks();
  
  const { data: settings } = useQuery<UserSettings>({
    queryKey: ["/api/settings", userId],
    staleTime: 60 * 1000,
  });

  const { data: managerStatus } = useQuery<{
    success: boolean;
    teamValue: number;
    freeTransfers: number;
    playerCount: number;
    captainId: number | null;
    viceCaptainId: number | null;
    gameweek: number;
    formation: string;
    lastSyncTime: string;
  }>({
    queryKey: ["/api/manager", settings?.manager_id, "status"],
    enabled: !!settings?.manager_id,
    retry: false,
  });

  const planningGameweek = gameweeks?.find((gw: any) => gw.is_next) 
    || gameweeks?.find((gw: any) => gw.is_current);
  const planningGameweekId = planningGameweek?.id || 1;
  
  const { data: savedTeamData, isLoading: loadingSavedTeam, isFetched: savedTeamFetched } = useQuery<UserTeam>({
    queryKey: [`/api/teams/${userId}?gameweek=${planningGameweekId}`],
    enabled: !!planningGameweekId,
  });

  const syncManagerTeamMutation = useMutation({
    mutationFn: async (managerId: number) => {
      return apiRequest<{
        success: boolean;
        dataIsStale?: boolean;
        staleReason?: string;
        planningGameweek?: number;
        gameweek: number;
      }>("POST", `/api/manager/sync/${managerId}`, {});
    },
    onSuccess: (data) => {
      // Must match exact query key format used in useQuery to invalidate cache properly
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${userId}?gameweek=${planningGameweekId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/manager/${settings?.manager_id}/status`] });
      
      if (data.dataIsStale) {
        toast({
          title: "Team synced with limitations",
          description: data.staleReason || "Your latest transfers may not be visible yet. Use 'Show all players' toggle to manually add new players.",
          variant: "destructive",
          duration: 10000,
        });
      } else {
        toast({
          title: "Team synced successfully",
          description: "Your FPL team has been loaded from your manager account",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to sync team",
        description: error.message || "Could not load your FPL team",
        variant: "destructive",
      });
    },
  });

  const { data: transfers } = useQuery<Transfer[]>({
    queryKey: [`/api/transfers/${userId}?gameweek=${planningGameweekId}`],
    enabled: !!planningGameweekId,
  });
  
  const analyzeMutation = useAnalyzeTeam();
  
  // Update AI prediction from mutation result
  useEffect(() => {
    if (analyzeMutation.data) {
      console.log('[FRONTEND] Setting AI prediction:', analyzeMutation.data);
      setAiPrediction(analyzeMutation.data);
    }
  }, [analyzeMutation.data]);

  const isLoading = loadingPlayers || loadingTeams || loadingPositions;
  const error = playersError || teamsError || positionsError;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectedPlayers = slots.filter(s => s.player !== null).map(s => s.player!);
  const teamValue = selectedPlayers.reduce((sum, p) => sum + p.now_cost / 10, 0);
  const budgetRemaining = 100.0 - teamValue;
  const playingCount = slots.slice(0, 11).filter(s => s.player !== null).length;

  const saveTeamMutation = useMutation({
    mutationFn: async () => {
      const teamData = {
        userId,
        gameweek: planningGameweekId,
        players: slots.map(s => ({
          player_id: s.player?.id || null,
          position: s.position,
          is_captain: s.isCaptain,
          is_vice_captain: s.isViceCaptain,
        })),
        formation,
        teamValue: Math.round(teamValue * 10),
        bank: Math.round(budgetRemaining * 10),
        transfersMade: 0,
      };
      
      return apiRequest<UserTeam>("POST", "/api/teams", teamData);
    },
    onSuccess: (data) => {
      setSavedTeam(data);
      // Must match exact query key format used in useQuery to invalidate cache properly
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${userId}?gameweek=${planningGameweekId}`] });
      toast({
        title: "Team saved successfully",
        description: "Your team has been saved for gameweek " + planningGameweekId,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to save team",
        description: error.message || "An error occurred while saving your team",
        variant: "destructive",
      });
    },
  });

  const applyTransfersMutation = useMutation({
    mutationFn: async () => {
      if (!savedTeamData) {
        throw new Error("No saved team found. Please save your team first.");
      }

      const currentPlayerIds = slots
        .map(s => s.player?.id)
        .filter((id): id is number => typeof id === 'number')
        .sort();
      const savedPlayerIds = savedTeamData.players
        .map((p: any) => p.player_id)
        .filter((id): id is number => typeof id === 'number')
        .sort();

      const playersOut = savedPlayerIds.filter((id: number) => !currentPlayerIds.includes(id));
      const playersIn = currentPlayerIds.filter((id: number) => !savedPlayerIds.includes(id));

      const transferCount = Math.max(playersIn.length, playersOut.length);
      const freeTransfers = managerStatus?.freeTransfers || 1;

      // Save each transfer with correct individual cost
      // First freeTransfers transfers are free (cost=0), remaining cost 4 points each
      const transferPromises = playersIn.map((playerInId, idx) => {
        const playerOutId = playersOut[idx];
        if (!playerInId || !playerOutId) return null;
        
        const transferCost = idx < freeTransfers ? 0 : 4;
        
        return apiRequest("POST", "/api/transfers", {
          userId,
          gameweek: planningGameweekId,
          playerInId,
          playerOutId,
          cost: transferCost,
        });
      }).filter(Boolean);

      await Promise.all(transferPromises);

      // Update the team with new transfersMade count
      const teamData = {
        userId,
        gameweek: planningGameweekId,
        players: slots.map(s => ({
          player_id: s.player?.id || null,
          position: s.position,
          is_captain: s.isCaptain,
          is_vice_captain: s.isViceCaptain,
        })),
        formation,
        teamValue: Math.round(teamValue * 10),
        bank: Math.round(budgetRemaining * 10),
        transfersMade: transferCount,
      };
      
      return apiRequest<UserTeam>("POST", "/api/teams", teamData);
    },
    onSuccess: (data) => {
      setSavedTeam(data);
      // Must match exact query key format used in useQuery to invalidate cache properly
      queryClient.invalidateQueries({ queryKey: [`/api/teams/${userId}?gameweek=${planningGameweekId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/transfers", userId] });
      setShowTransferDialog(false);
      toast({
        title: "Transfers applied successfully",
        description: "Your transfers have been saved",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to apply transfers",
        description: error.message || "An error occurred while applying transfers",
        variant: "destructive",
      });
    },
  });

  // Calculate transfer information
  const calculateTransferInfo = () => {
    if (!savedTeamData) {
      return { transferCount: 0, transferCost: 0, freeTransfers: 1 };
    }

    const currentPlayerIds = slots
      .map(s => s.player?.id)
      .filter((id): id is number => typeof id === 'number')
      .sort();
    const savedPlayerIds = savedTeamData.players
      .map((p: any) => p.player_id)
      .filter((id): id is number => typeof id === 'number')
      .sort();

    const playersOut = savedPlayerIds.filter((id: number) => !currentPlayerIds.includes(id));
    const playersIn = currentPlayerIds.filter((id: number) => !savedPlayerIds.includes(id));

    const transferCount = Math.max(playersIn.length, playersOut.length);
    const freeTransfers = managerStatus?.freeTransfers || 1;
    const transferCost = Math.max(0, transferCount - freeTransfers) * 4;

    return { transferCount, transferCost, freeTransfers };
  };

  const transferInfo = calculateTransferInfo();

  const whatIfAnalysisMutation = useMutation({
    mutationFn: async () => {
      // Check for empty slots first (incomplete squad)
      const emptySlots = slots.filter(s => s.player === null);
      if (emptySlots.length > 0) {
        const emptyPositions = emptySlots.map(s => s.position).join(', ');
        throw new Error(`Your squad is incomplete. Please fill all 15 positions before analyzing. Empty positions: ${emptyPositions}`);
      }

      const customLineup = slots.map(s => ({
        player_id: s.player!.id,
        position: s.position,
        is_captain: s.isCaptain,
        is_vice_captain: s.isViceCaptain,
      }));

      return apiRequest<GameweekPlan>(
        "POST",
        `/api/automation/analyze/${userId}?gameweek=${planningGameweekId}`,
        { customLineup }
      );
    },
    onSuccess: async (data) => {
      setWhatIfResult(data);
      
      // Auto-save the current lineup so it persists when navigating away
      // This ensures the what-if lineup becomes the active team
      try {
        const teamData = {
          userId,
          gameweek: planningGameweekId,
          players: slots.map(s => ({
            player_id: s.player?.id || null,
            position: s.position,
            is_captain: s.isCaptain,
            is_vice_captain: s.isViceCaptain,
          })),
          formation,
          teamValue: Math.round(teamValue * 10),
          bank: Math.round(budgetRemaining * 10),
          transfersMade: 0,
        };
        const savedData = await apiRequest<UserTeam>("POST", "/api/teams", teamData);
        setSavedTeam(savedData);
        console.log('[Team Modeller] Auto-saved lineup after what-if analysis');
      } catch (err) {
        console.error('[Team Modeller] Failed to auto-save lineup:', err);
      }
      
      toast({
        title: "What-If Analysis Complete",
        description: `Predicted ${data.predictedPoints} points for this lineup`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Analysis failed",
        description: error.message || "Could not complete the what-if analysis",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    const playingPlayers = slots.slice(0, 11).map(s => s.player).filter(Boolean) as FPLPlayer[];
    const captainSlot = slots.find(s => s.isCaptain);
    const viceCaptainSlot = slots.find(s => s.isViceCaptain);
    
    if (playingPlayers.length >= 11 && !analyzeMutation.isPending) {
      timeoutRef.current = setTimeout(() => {
        analyzeMutation.mutate({ 
          players: playingPlayers, 
          formation,
          captainId: captainSlot?.player?.id || null,
          viceCaptainId: viceCaptainSlot?.player?.id || null,
        });
      }, 400);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [slots, formation]);

  // Auto-sync team from FPL Manager ID ONLY on first visit when no saved team exists
  // This prevents overwriting user's saved changes when returning to the page
  // IMPORTANT: Wait for savedTeamData query to complete before deciding to sync
  useEffect(() => {
    if (
      settings?.manager_id &&
      savedTeamFetched &&           // Wait for query to complete
      !savedTeamData &&             // Only sync if no team exists in database
      planningGameweekId &&
      !syncManagerTeamMutation.isPending &&
      !hasAttemptedAutoSync.current
    ) {
      console.log('[Team Modeller] No saved team found, auto-syncing from FPL...');
      hasAttemptedAutoSync.current = true;
      syncManagerTeamMutation.mutate(settings.manager_id);
    } else if (savedTeamData) {
      console.log('[Team Modeller] Saved team found, skipping auto-sync');
      hasAttemptedAutoSync.current = true; // Mark as attempted so we don't sync later
    }
  }, [settings?.manager_id, savedTeamData, savedTeamFetched, planningGameweekId]);

  // Load saved team when data is available
  useEffect(() => {
    if (savedTeamData && players) {
      const playerMap = new Map((players as FPLPlayer[]).map(p => [p.id, p]));
      
      const loadedSlots = savedTeamData.players.map((slotData: any) => {
        const player = slotData.player_id ? playerMap.get(slotData.player_id) || null : null;
        return {
          player,
          position: slotData.position,
          isCaptain: slotData.is_captain,
          isViceCaptain: slotData.is_vice_captain,
          teamCode: player?.team_code,
        };
      });

      if (loadedSlots.length === 15) {
        setSlots(loadedSlots);
        setSavedTeam(savedTeamData);
      }
    }
  }, [savedTeamData, players]);

  const handlePlayerSwap = (fromPosition: number, toPosition: number) => {
    setSlots(prev => {
      const newSlots = [...prev];
      const fromSlot = newSlots.find(s => s.position === fromPosition);
      const toSlot = newSlots.find(s => s.position === toPosition);
      
      if (!fromSlot || !toSlot) return prev;

      // Validate GK constraint
      const fromPlayer = fromSlot.player;
      const toPlayer = toSlot.player;

      if (!fromPlayer) return prev;

      // Check if we're moving the only GK to bench
      if (fromPlayer.element_type === 1 && toPosition > 11) {
        const gkCount = slots.slice(0, 11).filter(s => s.player?.element_type === 1).length;
        if (gkCount === 1) {
          toast({
            title: "Invalid move",
            description: "You must have at least 1 goalkeeper in your starting XI",
            variant: "destructive",
          });
          return prev;
        }
      }

      // Swap players
      const tempPlayer = fromSlot.player;
      const tempCaptain = fromSlot.isCaptain;
      const tempVice = fromSlot.isViceCaptain;

      fromSlot.player = toSlot.player;
      fromSlot.isCaptain = toSlot.isCaptain;
      fromSlot.isViceCaptain = toSlot.isViceCaptain;

      toSlot.player = tempPlayer;
      toSlot.isCaptain = tempCaptain;
      toSlot.isViceCaptain = tempVice;

      // Clear captain/vice-captain if moved to bench
      if (fromPosition <= 11 && toPosition > 11) {
        toSlot.isCaptain = false;
        toSlot.isViceCaptain = false;
      }
      if (toPosition <= 11 && fromPosition > 11) {
        fromSlot.isCaptain = false;
        fromSlot.isViceCaptain = false;
      }

      return newSlots;
    });

    toast({
      title: "Players swapped",
      description: `Position ${fromPosition} and ${toPosition} swapped successfully`,
    });
  };

  const handleCaptainAssign = (position: number, isCaptain: boolean) => {
    setSlots(prev => {
      const newSlots = prev.map(s => {
        if (isCaptain) {
          // Remove captain from all other slots, assign to this one
          if (s.position === position) {
            return { ...s, isCaptain: true, isViceCaptain: false };
          }
          return { ...s, isCaptain: false };
        } else {
          // Remove vice-captain from all other slots, assign to this one
          if (s.position === position) {
            return { ...s, isViceCaptain: true, isCaptain: false };
          }
          return { ...s, isViceCaptain: false };
        }
      });
      return newSlots;
    });

    toast({
      title: isCaptain ? "Captain assigned" : "Vice-captain assigned",
      description: `Position ${position} is now your ${isCaptain ? 'captain' : 'vice-captain'}`,
    });
  };

  const handlePlayerSelect = (player: FPLPlayer) => {
    if (selectedSlot === null) {
      toast({
        title: "No slot selected",
        description: "Please click on an empty slot to add a player",
        variant: "destructive",
      });
      return;
    }

    if (slots.some(s => s.player?.id === player.id)) {
      toast({
        title: "Player already selected",
        description: `${player.web_name} is already in your team`,
        variant: "destructive",
      });
      return;
    }

    if (player.now_cost / 10 > budgetRemaining) {
      toast({
        title: "Insufficient budget",
        description: `${player.web_name} costs £${(player.now_cost / 10).toFixed(1)}m but you only have £${budgetRemaining.toFixed(1)}m`,
        variant: "destructive",
      });
      return;
    }

    // Validate position compatibility
    const targetSlot = slots.find(s => s.position === selectedSlot);
    if (targetSlot) {
      // Position 1 must be GK
      if (selectedSlot === 1 && player.element_type !== 1) {
        toast({
          title: "Invalid position",
          description: "Position 1 must be a goalkeeper",
          variant: "destructive",
        });
        return;
      }

      // GK can only go to position 1
      if (player.element_type === 1 && selectedSlot !== 1) {
        toast({
          title: "Invalid position",
          description: "Goalkeepers can only be placed in position 1",
          variant: "destructive",
        });
        return;
      }
    }

    setSlots(prev => prev.map(s => 
      s.position === selectedSlot ? { ...s, player, teamCode: player.team_code } : s
    ));
    setSelectedSlot(null);

    toast({
      title: "Player added",
      description: `${player.web_name} added to your team`,
    });
  };

  const handleSlotClick = (position: number) => {
    const slot = slots.find(s => s.position === position);
    
    // If there's already a selected empty slot and we click on a slot with a player,
    // move that player to the selected empty slot (tap-to-move flow)
    if (selectedSlot !== null && slot?.player) {
      const targetSlot = slots.find(s => s.position === selectedSlot);
      
      // Only allow if target is empty
      if (targetSlot && !targetSlot.player) {
        // Validate GK constraints
        if (selectedSlot === 1 && slot.player.element_type !== 1) {
          toast({
            title: "Invalid move",
            description: "Only goalkeepers can be placed in position 1",
            variant: "destructive",
          });
          setSelectedSlot(null);
          return;
        }
        if (slot.player.element_type === 1 && selectedSlot !== 1) {
          toast({
            title: "Invalid move",
            description: "Goalkeepers can only be placed in position 1",
            variant: "destructive",
          });
          setSelectedSlot(null);
          return;
        }
        
        // Move the player to the selected slot
        setSlots(prev => prev.map(s => {
          if (s.position === selectedSlot) {
            // Target slot gets the player
            return { ...s, player: slot.player, teamCode: slot.player?.team_code };
          }
          if (s.position === position) {
            // Source slot becomes empty
            return { ...s, player: null, isCaptain: false, isViceCaptain: false, teamCode: undefined };
          }
          return s;
        }));
        
        toast({
          title: "Player moved",
          description: `${slot.player.web_name} moved to position ${selectedSlot <= 11 ? 'starting XI' : 'bench'}`,
        });
        setSelectedSlot(null);
        return;
      }
    }
    
    if (slot?.player) {
      // Clicking on a player without a selected slot - just select this slot for potential swap
      // Or if we want to remove, user can use X button
      // For now, let's select this slot as source for moving
      if (selectedSlot === null) {
        // No slot selected - select this player's slot as source
        setSelectedSlot(position);
        toast({
          title: "Player selected",
          description: `Tap an empty slot to move ${slot.player.web_name} there, or tap another player to swap`,
        });
      } else {
        // A slot was already selected - swap the players
        const sourceSlot = slots.find(s => s.position === selectedSlot);
        if (sourceSlot?.player) {
          handlePlayerSwap(selectedSlot, position);
        }
        setSelectedSlot(null);
      }
    } else {
      // Clicking on empty slot
      if (selectedSlot !== null) {
        // If there was a selected slot with a player, move that player here
        const sourceSlot = slots.find(s => s.position === selectedSlot);
        if (sourceSlot?.player) {
          // Validate GK constraints
          if (position === 1 && sourceSlot.player.element_type !== 1) {
            toast({
              title: "Invalid move",
              description: "Only goalkeepers can be placed in position 1",
              variant: "destructive",
            });
            setSelectedSlot(null);
            return;
          }
          if (sourceSlot.player.element_type === 1 && position !== 1) {
            toast({
              title: "Invalid move",
              description: "Goalkeepers can only be placed in position 1",
              variant: "destructive",
            });
            setSelectedSlot(null);
            return;
          }
          
          setSlots(prev => prev.map(s => {
            if (s.position === position) {
              return { ...s, player: sourceSlot.player, teamCode: sourceSlot.player?.team_code };
            }
            if (s.position === selectedSlot) {
              return { ...s, player: null, isCaptain: false, isViceCaptain: false, teamCode: undefined };
            }
            return s;
          }));
          
          toast({
            title: "Player moved",
            description: `${sourceSlot.player.web_name} moved to position ${position <= 11 ? 'starting XI' : 'bench'}`,
          });
          setSelectedSlot(null);
        } else {
          // Source was empty too, just select this new empty slot
          setSelectedSlot(position);
        }
      } else {
        // No slot was selected, select this empty slot
        setSelectedSlot(position);
      }
    }
  };

  const handlePlayerRemove = (position: number) => {
    const slot = slots.find(s => s.position === position);
    if (!slot?.player) return;

    setSlots(prev => prev.map(s => 
      s.position === position ? { ...s, player: null, isCaptain: false, isViceCaptain: false, teamCode: undefined } : s
    ));
    
    toast({
      title: "Player removed",
      description: `${slot.player.web_name} removed from your team`,
    });
  };

  const handleReset = () => {
    setSlots(Array.from({ length: 15 }, (_, i) => ({
      player: null,
      position: i + 1,
      isCaptain: false,
      isViceCaptain: false,
      teamCode: undefined,
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

  const startingXI = slots.slice(0, 11);
  const bench = slots.slice(11, 15);

  return (
    <div className="space-y-6" data-testid="page-team-modeller">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Team Modeller</h1>
        <p className="text-muted-foreground mt-2">
          Build and optimise your squad with drag-and-drop and real-time AI predictions.
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
          {settings?.manager_id && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => syncManagerTeamMutation.mutate(settings.manager_id!)} 
              disabled={syncManagerTeamMutation.isPending}
              data-testid="button-sync-fpl"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncManagerTeamMutation.isPending ? 'animate-spin' : ''}`} />
              {syncManagerTeamMutation.isPending ? "Syncing..." : "Reset to FPL Team"}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleReset} data-testid="button-reset">
            <Undo className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => whatIfAnalysisMutation.mutate()} 
            disabled={playingCount < 11 || whatIfAnalysisMutation.isPending}
            data-testid="button-what-if-analysis"
          >
            {whatIfAnalysisMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FlaskConical className="h-4 w-4 mr-2" />
            )}
            {whatIfAnalysisMutation.isPending ? "Analyzing..." : "Re-analyze with this lineup"}
          </Button>
          {savedTeamData && transferInfo.transferCount > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowTransferDialog(true)} 
              data-testid="button-apply-transfers"
            >
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Apply Transfers ({transferInfo.transferCount})
            </Button>
          )}
          <Button 
            size="sm" 
            onClick={() => saveTeamMutation.mutate()} 
            disabled={playingCount < 11 || saveTeamMutation.isPending}
            data-testid="button-save-team"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveTeamMutation.isPending ? "Saving..." : "Save Team"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <PitchVisualization
            formation={formation}
            slots={startingXI}
            benchSlots={bench}
            onPlayerSwap={handlePlayerSwap}
            onCaptainAssign={handleCaptainAssign}
            onPlayerClick={handleSlotClick}
            onPlayerRemove={handlePlayerRemove}
            onError={(title, description) => {
              toast({
                title,
                description,
                variant: "destructive",
              });
            }}
            selectedPosition={selectedSlot}
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

          {savedTeamData && transferInfo.transferCount > 0 && (
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Transfer Summary</h3>
                <Badge variant={transferInfo.transferCost > 0 ? "destructive" : "secondary"}>
                  {transferInfo.transferCost > 0 ? `-${transferInfo.transferCost} pts` : 'Free'}
                </Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Transfers made:</span>
                  <span className="font-medium">{transferInfo.transferCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Free transfers:</span>
                  <span className="font-medium">{transferInfo.freeTransfers}</span>
                </div>
                {transferInfo.transferCost > 0 && (
                  <div className="flex justify-between pt-2 border-t">
                    <span className="text-muted-foreground">Extra transfers:</span>
                    <span className="font-medium">{transferInfo.transferCount - transferInfo.freeTransfers}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {whatIfAnalysisMutation.isPending && (
            <Card className="border-2 border-dashed border-primary/50 bg-primary/5">
              <CardContent className="py-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-lg font-medium">Running What-If Analysis...</p>
                <p className="text-sm text-muted-foreground mt-2">
                  This may take 30-60 seconds. Analyzing your custom lineup with AI.
                </p>
              </CardContent>
            </Card>
          )}

          {whatIfResult && !whatIfAnalysisMutation.isPending && (
            <Card className="border-2 border-purple-500/50 bg-purple-500/5" data-testid="what-if-results">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FlaskConical className="h-5 w-5 text-purple-500" />
                    <CardTitle className="text-lg">What-If Analysis Results</CardTitle>
                  </div>
                  <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                    Hypothetical Scenario
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm text-muted-foreground">Predicted Points</p>
                    <p className="text-3xl font-bold text-purple-600" data-testid="what-if-points">
                      {whatIfResult.predictedPoints}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-card">
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className="text-3xl font-bold" data-testid="what-if-confidence">
                      {whatIfResult.confidence}%
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-card">
                  <h4 className="font-semibold mb-2">AI Reasoning</h4>
                  <ScrollArea className="h-[200px]">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {whatIfResult.aiReasoning}
                    </p>
                  </ScrollArea>
                </div>

                {whatIfResult.transfers && whatIfResult.transfers.length > 0 && (
                  <div className="p-4 rounded-lg border bg-card">
                    <h4 className="font-semibold mb-3">Transfer Recommendations</h4>
                    <div className="space-y-3">
                      {whatIfResult.transfers.map((transfer, idx) => {
                        const playerOut = players?.find((p: FPLPlayer) => p.id === transfer.player_out_id);
                        const playerIn = players?.find((p: FPLPlayer) => p.id === transfer.player_in_id);
                        return (
                          <div key={idx} className="flex flex-col gap-1 text-sm p-3 rounded bg-muted/50">
                            <div className="flex items-center gap-2">
                              <Badge variant={transfer.priority === 'high' ? 'destructive' : transfer.priority === 'medium' ? 'default' : 'secondary'}>
                                {transfer.priority}
                              </Badge>
                              <span className="text-red-600">{playerOut?.web_name || `ID:${transfer.player_out_id}`}</span>
                              <ArrowRightLeft className="h-3 w-3" />
                              <span className="text-green-600">{playerIn?.web_name || `ID:${transfer.player_in_id}`}</span>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <span className="text-xs text-muted-foreground">
                                {transfer.expected_points_gain_timeframe || '6 gameweeks'} gain
                              </span>
                              <span className="text-green-600 font-semibold">
                                +{transfer.expected_points_gain.toFixed(1)} pts
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-3 p-2 rounded bg-blue-500/10 border border-blue-500/20">
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        <strong>Note:</strong> Transfer gains are calculated over 6 gameweeks to account for fixture swings, 
                        player availability, and form trends. A transfer may not change this week's predicted points 
                        if both players are benched, but provides value over time.
                      </p>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center">
                  This is a hypothetical analysis of your custom lineup and is not saved as a plan.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          {/* Hide standard AI Prediction when what-if result is active to avoid confusion */}
          {!whatIfResult && (
            <PredictionPanel
              predictedPoints={aiPrediction?.predicted_points || 0}
              confidence={aiPrediction?.confidence || 0}
              insights={aiPrediction?.insights || []}
              isLoading={analyzeMutation.isPending}
              hasData={!!aiPrediction}
              isStreaming={analyzeMutation.isPending}
              streamingContent=""
              label="Current Team"
            />
          )}

          <PlayerSearchPanel
            players={players || []}
            teams={teams || []}
            positions={positions || []}
            onPlayerSelect={handlePlayerSelect}
            budgetRemaining={budgetRemaining}
          />
        </div>
      </div>

      <AlertDialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <AlertDialogContent data-testid="dialog-transfer-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Transfers</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3 mt-2">
                <p>You are about to apply {transferInfo.transferCount} transfer{transferInfo.transferCount > 1 ? 's' : ''}.</p>
                <div className="p-3 rounded-lg border bg-muted/50">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Free transfers available:</span>
                      <span className="font-semibold">{transferInfo.freeTransfers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transfers made:</span>
                      <span className="font-semibold">{transferInfo.transferCount}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span>Point deduction:</span>
                      <span className="font-semibold text-destructive">
                        {transferInfo.transferCost > 0 ? `-${transferInfo.transferCost}` : '0'}
                      </span>
                    </div>
                  </div>
                </div>
                {transferInfo.transferCost > 0 && (
                  <p className="text-sm text-muted-foreground">
                    You will lose {transferInfo.transferCost} points for making {transferInfo.transferCount - transferInfo.freeTransfers} extra transfer{transferInfo.transferCount - transferInfo.freeTransfers > 1 ? 's' : ''}.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-transfers">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => applyTransfersMutation.mutate()} 
              disabled={applyTransfersMutation.isPending}
              data-testid="button-confirm-transfers"
            >
              {applyTransfersMutation.isPending ? "Applying..." : "Confirm Transfers"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
