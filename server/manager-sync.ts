import { fplApi } from "./fpl-api";
import { fplAuth } from "./fpl-auth";
import { storage } from "./storage";
import type { InsertUserTeam, FPLPick, FPLPlayer } from "@shared/schema";

interface SyncResult {
  success: boolean;
  teamValue: number;
  freeTransfers: number;
  playerCount: number;
  captainId: number | null;
  viceCaptainId: number | null;
  gameweek: number;
  formation: string;
  lastSyncTime: string;
  error?: string;
  usedAuthenticatedEndpoint?: boolean;
  dataIsStale?: boolean;
  staleReason?: string;
  planningGameweek?: number;
}

export class ManagerSyncService {
  async syncManagerTeam(managerId: number, userId: number): Promise<SyncResult> {
    try {
      const currentGameweek = await fplApi.getCurrentGameweek();
      const nextGameweek = await fplApi.getNextGameweek();
      
      if (!currentGameweek && !nextGameweek) {
        throw new Error("Unable to determine current gameweek");
      }

      const managerDetails = await fplApi.getManagerDetails(managerId);
      const planningGameweek = nextGameweek || currentGameweek!;
      
      // PRIORITY 1: Try authenticated my-team endpoint to get user's DRAFT lineup
      // This captures pending lineup changes (e.g., Virgil moved to bench for GW14)
      let usedAuthenticatedEndpoint = false;
      let myTeamPicks: Array<{
        element: number;
        position: number;
        selling_price: number;
        multiplier: number;
        purchase_price: number;
        is_captain: boolean;
        is_vice_captain: boolean;
      }> | null = null;
      let myTeamBank: number | null = null;
      let myTeamValue: number | null = null;
      
      try {
        const isAuthenticated = await fplAuth.isAuthenticated(userId);
        if (isAuthenticated) {
          console.log(`[Manager Sync] User ${userId} is authenticated, fetching draft lineup from my-team endpoint...`);
          const sessionCookies = await fplAuth.getSessionCookies(userId);
          const myTeamData = await fplApi.getMyTeam(managerId, sessionCookies);
          myTeamPicks = myTeamData.picks;
          myTeamBank = myTeamData.transfers.bank;
          myTeamValue = myTeamData.transfers.value;
          usedAuthenticatedEndpoint = true;
          console.log(`[Manager Sync] ✅ Successfully fetched draft lineup with ${myTeamPicks.length} players`);
          
          // Log Virgil's position if present
          const virgil = myTeamPicks.find(p => p.element === 373);
          if (virgil) {
            console.log(`[Manager Sync] Virgil (373) position in draft lineup: ${virgil.position} (${virgil.position <= 11 ? 'STARTING' : 'BENCH'})`);
          }
        }
      } catch (authError) {
        console.log(`[Manager Sync] Authenticated endpoint not available: ${authError instanceof Error ? authError.message : 'Unknown error'}`);
      }
      
      // PRIORITY 2: Try next gameweek picks endpoint (if no authenticated data)
      let picks;
      let actualGameweek;
      let dataIsStale = false;
      let staleReason = '';
      
      if (myTeamPicks) {
        // Use authenticated my-team data - it has the current draft lineup
        console.log(`[Manager Sync] Using authenticated draft lineup for GW${planningGameweek.id}`);
        actualGameweek = planningGameweek;
        // Create a picks-like structure from myTeamPicks
        picks = {
          picks: myTeamPicks.map(p => ({
            element: p.element,
            position: p.position,
            multiplier: p.multiplier,
            is_captain: p.is_captain,
            is_vice_captain: p.is_vice_captain,
            purchase_price: p.purchase_price,
            selling_price: p.selling_price,
          })),
          entry_history: {
            value: myTeamValue || 0,
            bank: myTeamBank || 0,
            event_transfers: 0,
          },
        };
      } else if (nextGameweek) {
        try {
          console.log(`[Manager Sync] Attempting to fetch picks for GW${nextGameweek.id} (upcoming)...`);
          picks = await fplApi.getManagerPicks(managerId, nextGameweek.id);
          actualGameweek = nextGameweek;
          console.log(`[Manager Sync] ✅ Successfully fetched GW${nextGameweek.id} picks`);
        } catch (error) {
          // Next gameweek picks not available yet - fall back to current gameweek
          if (currentGameweek) {
            console.log(`[Manager Sync] GW${nextGameweek.id} picks not available, falling back to GW${currentGameweek.id}`);
            picks = await fplApi.getManagerPicks(managerId, currentGameweek.id);
            actualGameweek = currentGameweek;
            dataIsStale = true;
            staleReason = `Cannot see GW${nextGameweek.id} transfers until deadline passes. Showing your GW${currentGameweek.id} locked team. Use "Show all players" toggle to manually add new transfers.`;
          } else {
            throw error;
          }
        }
      } else if (currentGameweek) {
        console.log(`[Manager Sync] No next gameweek, fetching current GW${currentGameweek.id} picks`);
        picks = await fplApi.getManagerPicks(managerId, currentGameweek.id);
        actualGameweek = currentGameweek;
      } else {
        throw new Error("Unable to determine gameweek for sync");
      }
      const allPlayers = await fplApi.getPlayers();

      // Log first pick to verify FPL API returns price data
      if (picks.picks.length > 0) {
        console.log('[Manager Sync] Sample FPL pick data:', JSON.stringify(picks.picks[0], null, 2));
      }

      const players = picks.picks.map(pick => {
        const playerData = allPlayers.find(p => p.id === pick.element);
        
        // Validate price data exists
        if (!pick.purchase_price || !pick.selling_price) {
          console.warn(`[Manager Sync] Missing price data for player ${pick.element}:`, {
            purchase_price: pick.purchase_price,
            selling_price: pick.selling_price,
          });
        }
        
        return {
          player_id: pick.element,
          position: pick.position,
          is_captain: pick.is_captain,
          is_vice_captain: pick.is_vice_captain,
          purchase_price: pick.purchase_price,
          selling_price: pick.selling_price,
          now_cost: playerData?.now_cost,
        };
      });

      const formation = this.calculateFormation(picks.picks, allPlayers);
      
      const teamValue = picks.entry_history.value;
      const bank = picks.entry_history.bank;
      const transfersMade = picks.entry_history.event_transfers;
      const lastDeadlineBank = managerDetails.last_deadline_bank;

      const freeTransfers = this.calculateFreeTransfers(
        actualGameweek.id,
        lastDeadlineBank,
        transfersMade
      );

      const teamData: InsertUserTeam = {
        userId,
        gameweek: actualGameweek.id,
        players,
        formation,
        teamValue,
        bank,
        transfersMade,
        lastDeadlineBank,
      };

      // Save team for the actual gameweek we fetched picks from
      await storage.saveTeam(teamData);

      // ALSO save to planning gameweek (is_next) so Team Modeller can display it
      // Team Modeller queries for planning GW, not current GW
      if (nextGameweek && nextGameweek.id !== actualGameweek.id) {
        const planningTeamData: InsertUserTeam = {
          ...teamData,
          gameweek: nextGameweek.id,
        };
        await storage.saveTeam(planningTeamData);
      }

      const captainPick = picks.picks.find(p => p.is_captain);
      const viceCaptainPick = picks.picks.find(p => p.is_vice_captain);

      return {
        success: true,
        teamValue,
        freeTransfers,
        playerCount: players.length,
        captainId: captainPick?.element || null,
        viceCaptainId: viceCaptainPick?.element || null,
        gameweek: actualGameweek.id,
        formation,
        lastSyncTime: new Date().toISOString(),
        usedAuthenticatedEndpoint,
        dataIsStale,
        staleReason: dataIsStale ? staleReason : undefined,
        planningGameweek: planningGameweek.id,
      };
    } catch (error) {
      console.error("Error syncing manager team:", error);
      return {
        success: false,
        teamValue: 0,
        freeTransfers: 0,
        playerCount: 0,
        captainId: null,
        viceCaptainId: null,
        gameweek: 0,
        formation: "0-0-0",
        lastSyncTime: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error occurred",
        usedAuthenticatedEndpoint: false,
      };
    }
  }

  async getManagerStatus(managerId: number, userId: number): Promise<SyncResult | null> {
    try {
      const currentGameweek = await fplApi.getCurrentGameweek();
      const nextGameweek = await fplApi.getNextGameweek();
      
      // Use next gameweek if current is finished, otherwise use current
      const targetGameweek = currentGameweek && !currentGameweek.finished 
        ? currentGameweek 
        : nextGameweek;
      
      if (!targetGameweek) {
        return null;
      }

      // Try to get team for target gameweek, fall back to current if not found
      let team = await storage.getTeam(userId, targetGameweek.id);
      
      if (!team && currentGameweek && targetGameweek.id !== currentGameweek.id) {
        team = await storage.getTeam(userId, currentGameweek.id);
      }
      
      if (!team) {
        return null;
      }

      const freeTransfers = this.calculateFreeTransfers(
        team.gameweek,
        team.lastDeadlineBank,
        team.transfersMade
      );

      const captainPlayer = team.players.find(p => p.is_captain);
      const viceCaptainPlayer = team.players.find(p => p.is_vice_captain);

      return {
        success: true,
        teamValue: team.teamValue,
        freeTransfers,
        playerCount: team.players.length,
        captainId: captainPlayer?.player_id || null,
        viceCaptainId: viceCaptainPlayer?.player_id || null,
        gameweek: team.gameweek,
        formation: team.formation,
        lastSyncTime: team.updatedAt.toISOString(),
      };
    } catch (error) {
      console.error("Error getting manager status:", error);
      return null;
    }
  }

  private calculateFormation(picks: FPLPick[], allPlayers: FPLPlayer[]): string {
    const startingPicks = picks.filter(p => p.position <= 11);
    
    const positionCounts = {
      def: 0,
      mid: 0,
      fwd: 0,
    };

    for (const pick of startingPicks) {
      const player = allPlayers.find(p => p.id === pick.element);
      if (!player) continue;

      switch (player.element_type) {
        case 2:
          positionCounts.def++;
          break;
        case 3:
          positionCounts.mid++;
          break;
        case 4:
          positionCounts.fwd++;
          break;
      }
    }

    return `${positionCounts.def}-${positionCounts.mid}-${positionCounts.fwd}`;
  }

  private calculateFreeTransfers(
    currentGameweek: number,
    lastDeadlineBank: number,
    eventTransfers: number
  ): number {
    // Gameweek 1 always starts with 1 free transfer
    if (currentGameweek === 1) {
      return 1;
    }

    // Free transfers logic:
    // - Every gameweek you get 1 free transfer
    // - Unused transfers bank (max 2 total)
    // - lastDeadlineBank = transfers carried over from previous gameweek
    // - eventTransfers = transfers already made this gameweek
    // Formula: freeTransfersAvailable = min(1 + banked, 2) - event_transfers
    
    const totalAvailable = Math.min(1 + lastDeadlineBank, 2);
    const freeTransfersAvailable = Math.max(0, totalAvailable - eventTransfers);

    return freeTransfersAvailable;
  }
}

export const managerSync = new ManagerSyncService();
