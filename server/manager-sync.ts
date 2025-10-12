import { fplApi } from "./fpl-api";
import { storage } from "./storage";
import type { InsertUserTeam } from "@shared/schema";

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
      
      if (!currentGameweek) {
        throw new Error("Unable to determine current gameweek");
      }

      const managerDetails = await fplApi.getManagerDetails(managerId);
      const picks = await fplApi.getManagerPicks(managerId, currentGameweek.id);
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
        currentGameweek.id,
        lastDeadlineBank,
        transfersMade
      );

      const teamData: InsertUserTeam = {
        userId,
        gameweek: currentGameweek.id,
        players,
        formation,
        teamValue,
        bank,
        transfersMade,
        lastDeadlineBank,
      };

      await storage.saveTeam(teamData);

      const captainPick = picks.picks.find(p => p.is_captain);
      const viceCaptainPick = picks.picks.find(p => p.is_vice_captain);

      return {
        success: true,
        teamValue,
        freeTransfers,
        playerCount: players.length,
        captainId: captainPick?.element || null,
        viceCaptainId: viceCaptainPick?.element || null,
        gameweek: currentGameweek.id,
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
      
      if (!currentGameweek) {
        return null;
      }

      const team = await storage.getTeam(userId, currentGameweek.id);
      
      if (!team) {
        return null;
      }

      const freeTransfers = this.calculateFreeTransfers(
        currentGameweek.id,
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
        lastSyncTime: team.createdAt.toISOString(),
      };
    } catch (error) {
      console.error("Error getting manager status:", error);
      return null;
    }
  }

  private calculateFormation(picks: any[], allPlayers: any[]): string {
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
