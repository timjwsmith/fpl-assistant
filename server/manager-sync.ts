import { fplApi } from "./fpl-api";
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
}

export class ManagerSyncService {
  async syncManagerTeam(managerId: number, userId: number): Promise<SyncResult> {
    try {
      const currentGameweek = await fplApi.getCurrentGameweek();
      const nextGameweek = await fplApi.getNextGameweek();
      
      // Use next gameweek if current is finished, otherwise use current
      const targetGameweek = currentGameweek && !currentGameweek.finished 
        ? currentGameweek 
        : nextGameweek;
      
      if (!targetGameweek) {
        throw new Error("Unable to determine current gameweek");
      }

      const managerDetails = await fplApi.getManagerDetails(managerId);
      
      // Try to fetch picks for target gameweek, fall back to current if not available
      let picks;
      let actualGameweek = targetGameweek;
      
      try {
        picks = await fplApi.getManagerPicks(managerId, targetGameweek.id);
      } catch (error) {
        // If next gameweek picks aren't available yet (e.g., GW hasn't started),
        // fall back to current gameweek
        if (currentGameweek && targetGameweek.id !== currentGameweek.id) {
          console.log(`Picks not available for GW${targetGameweek.id}, falling back to GW${currentGameweek.id}`);
          picks = await fplApi.getManagerPicks(managerId, currentGameweek.id);
          actualGameweek = currentGameweek;
        } else {
          throw error;
        }
      }
      const allPlayers = await fplApi.getPlayers();

      const players = picks.picks.map(pick => ({
        player_id: pick.element,
        position: pick.position,
        is_captain: pick.is_captain,
        is_vice_captain: pick.is_vice_captain,
      }));

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
