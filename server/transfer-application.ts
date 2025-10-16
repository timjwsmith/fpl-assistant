import { storage } from './storage';
import { fplAuth } from './fpl-auth';
import { fplApi } from './fpl-api';
import type { TransferRecommendation } from '@shared/schema';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

interface ApplicationResult {
  success: boolean;
  transfersApplied: boolean;
  captainSet: boolean;
  chipPlayed: boolean;
  errors: string[];
  details: {
    transfersCount?: number;
    captainId?: number;
    viceCaptainId?: number;
    chipType?: string;
  };
}

interface TransferPayload {
  element_in: number;
  element_out: number;
  purchase_price: number;
  selling_price: number;
}

interface TransfersRequest {
  chip: string | null;
  transfers: TransferPayload[];
}

interface TeamPickPayload {
  picks: Array<{
    element: number;
    position: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
  chip?: string | null;
}

class TransferApplicationService {
  async applyGameweekPlan(userId: number, gameweekPlanId: number): Promise<ApplicationResult> {
    console.log(`[Transfer Application] Starting application for user ${userId}, plan ${gameweekPlanId}`);
    
    const result: ApplicationResult = {
      success: false,
      transfersApplied: false,
      captainSet: false,
      chipPlayed: false,
      errors: [],
      details: {},
    };

    try {
      const plan = await storage.getGameweekPlanById(gameweekPlanId);
      
      if (!plan) {
        result.errors.push('Gameweek plan not found');
        return result;
      }

      if (plan.userId !== userId) {
        result.errors.push('Unauthorized: Plan belongs to different user');
        return result;
      }

      if (plan.status === 'applied') {
        result.errors.push('Plan has already been applied');
        return result;
      }

      if (plan.status !== 'pending' && plan.status !== 'previewed') {
        result.errors.push(`Cannot apply plan with status: ${plan.status}`);
        return result;
      }

      const isAuthenticated = await fplAuth.isAuthenticated(userId);
      if (!isAuthenticated) {
        result.errors.push('User is not authenticated with FPL. Please login first.');
        return result;
      }

      const userSettings = await storage.getUserSettings(userId);
      if (!userSettings || !userSettings.manager_id) {
        result.errors.push('Manager ID not found in user settings. Please configure your settings.');
        return result;
      }

      const managerId = userSettings.manager_id;

      await this.validatePlan(plan, managerId);

      if (plan.transfers && Array.isArray(plan.transfers) && plan.transfers.length > 0) {
        const transferSuccess = await this.makeTransfers(
          userId, 
          plan.transfers, 
          plan.gameweek,
          managerId,
          plan.chipToPlay === 'wildcard' || plan.chipToPlay === 'freehit' ? plan.chipToPlay : null
        );
        result.transfersApplied = transferSuccess;
        result.details.transfersCount = plan.transfers.length;
        
        if (!transferSuccess) {
          result.errors.push('Failed to apply transfers');
        }
      } else {
        result.transfersApplied = true;
      }

      if (plan.captainId && plan.viceCaptainId) {
        const captainSuccess = await this.setCaptain(
          userId,
          plan.captainId,
          plan.viceCaptainId,
          plan.gameweek,
          managerId
        );
        result.captainSet = captainSuccess;
        result.details.captainId = plan.captainId;
        result.details.viceCaptainId = plan.viceCaptainId;
        
        if (!captainSuccess) {
          result.errors.push('Failed to set captain');
        }
      } else {
        result.captainSet = true;
      }

      if (plan.chipToPlay && plan.chipToPlay !== 'wildcard' && plan.chipToPlay !== 'freehit') {
        const chipSuccess = await this.playChip(
          userId,
          plan.chipToPlay,
          plan.gameweek,
          managerId
        );
        result.chipPlayed = chipSuccess;
        result.details.chipType = plan.chipToPlay;
        
        if (!chipSuccess) {
          result.errors.push(`Failed to play chip: ${plan.chipToPlay}`);
        }
      } else {
        result.chipPlayed = true;
      }

      if (result.transfersApplied && result.captainSet && result.chipPlayed) {
        await storage.updateGameweekPlanStatus(gameweekPlanId, 'applied');
        result.success = true;
        console.log(`[Transfer Application] ✓ Successfully applied plan ${gameweekPlanId}`);
      } else {
        console.error(`[Transfer Application] ✗ Partial failure for plan ${gameweekPlanId}`, result.errors);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Transfer Application] ✗ Error applying plan ${gameweekPlanId}:`, error);
      result.errors.push(errorMessage);
      
      await storage.saveChangeHistory({
        userId,
        gameweek: 0,
        changeType: 'transfer',
        changeData: { error: errorMessage },
        appliedSuccessfully: false,
        errorMessage,
      });
    }

    return result;
  }

  async makeTransfers(
    userId: number, 
    transfers: TransferRecommendation[], 
    gameweek: number,
    managerId?: number,
    chipToUse?: string | null
  ): Promise<boolean> {
    console.log(`[Transfer Application] Making ${transfers.length} transfers for user ${userId}, gameweek ${gameweek}`);
    
    try {
      const userSettings = await storage.getUserSettings(userId);
      const teamId = managerId || userSettings?.manager_id;
      
      if (!teamId) {
        throw new Error('Manager ID not found');
      }

      const sessionCookies = await fplAuth.getSessionCookies(userId);
      const csrfToken = await fplAuth.getCsrfToken(userId);

      const players = await fplApi.getPlayers();
      
      const transferPayloads: TransferPayload[] = transfers.map(transfer => {
        const playerIn = players.find(p => p.id === transfer.player_in_id);
        const playerOut = players.find(p => p.id === transfer.player_out_id);
        
        if (!playerIn || !playerOut) {
          throw new Error(`Player not found: in=${transfer.player_in_id}, out=${transfer.player_out_id}`);
        }

        return {
          element_in: transfer.player_in_id,
          element_out: transfer.player_out_id,
          purchase_price: playerIn.now_cost,
          selling_price: playerOut.now_cost,
        };
      });

      const requestBody: TransfersRequest = {
        chip: chipToUse || null,
        transfers: transferPayloads,
      };

      console.log(`[Transfer Application] Sending transfer request to FPL API for team ${teamId}`);
      
      const response = await fetch(`${FPL_BASE_URL}/entry/${teamId}/transfers/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Cookie': sessionCookies,
          'X-CSRFToken': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://fantasy.premierleague.com/',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `FPL API error: ${response.status} ${response.statusText}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail || errorJson.error) {
            errorMessage = errorJson.detail || errorJson.error;
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        console.error(`[Transfer Application] ✗ Transfer request failed:`, errorMessage);
        
        await storage.saveChangeHistory({
          userId,
          gameweek,
          changeType: 'transfer',
          changeData: { transfers, response: errorText },
          appliedSuccessfully: false,
          errorMessage,
        });

        if (response.status === 401) {
          console.log(`[Transfer Application] Session expired, attempting refresh...`);
          await fplAuth.refreshSession(userId);
        }

        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log(`[Transfer Application] ✓ Transfers applied successfully`);

      await storage.saveChangeHistory({
        userId,
        gameweek,
        changeType: 'transfer',
        changeData: { 
          transfers,
          response: responseData,
          chip: chipToUse,
        },
        appliedSuccessfully: true,
        errorMessage: null,
      });

      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Transfer Application] ✗ Error making transfers:`, error);
      
      await storage.saveChangeHistory({
        userId,
        gameweek,
        changeType: 'transfer',
        changeData: { transfers, error: errorMessage },
        appliedSuccessfully: false,
        errorMessage,
      });

      return false;
    }
  }

  async setCaptain(
    userId: number,
    captainId: number,
    viceCaptainId: number,
    gameweek: number,
    managerId?: number
  ): Promise<boolean> {
    console.log(`[Transfer Application] Setting captain ${captainId} and vice-captain ${viceCaptainId} for user ${userId}`);
    
    try {
      const userSettings = await storage.getUserSettings(userId);
      const teamId = managerId || userSettings?.manager_id;
      
      if (!teamId) {
        throw new Error('Manager ID not found');
      }

      const sessionCookies = await fplAuth.getSessionCookies(userId);
      const csrfToken = await fplAuth.getCsrfToken(userId);

      const currentPicks = await fplApi.getManagerPicks(teamId, gameweek);
      
      const updatedPicks = currentPicks.picks.map(pick => ({
        element: pick.element,
        position: pick.position,
        is_captain: pick.element === captainId,
        is_vice_captain: pick.element === viceCaptainId,
      }));

      const requestBody: TeamPickPayload = {
        picks: updatedPicks,
      };

      console.log(`[Transfer Application] Sending captain update to FPL API for team ${teamId}`);

      const response = await fetch(`${FPL_BASE_URL}/my-team/${teamId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Cookie': sessionCookies,
          'X-CSRFToken': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://fantasy.premierleague.com/',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `FPL API error: ${response.status} ${response.statusText}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail || errorJson.error) {
            errorMessage = errorJson.detail || errorJson.error;
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        console.error(`[Transfer Application] ✗ Captain update failed:`, errorMessage);
        
        await storage.saveChangeHistory({
          userId,
          gameweek,
          changeType: 'captain',
          changeData: { captainId, viceCaptainId, response: errorText },
          appliedSuccessfully: false,
          errorMessage,
        });

        if (response.status === 401) {
          console.log(`[Transfer Application] Session expired, attempting refresh...`);
          await fplAuth.refreshSession(userId);
        }

        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log(`[Transfer Application] ✓ Captain set successfully`);

      await storage.saveChangeHistory({
        userId,
        gameweek,
        changeType: 'captain',
        changeData: { 
          captainId,
          viceCaptainId,
          response: responseData,
        },
        appliedSuccessfully: true,
        errorMessage: null,
      });

      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Transfer Application] ✗ Error setting captain:`, error);
      
      await storage.saveChangeHistory({
        userId,
        gameweek,
        changeType: 'captain',
        changeData: { captainId, viceCaptainId, error: errorMessage },
        appliedSuccessfully: false,
        errorMessage,
      });

      return false;
    }
  }

  async playChip(
    userId: number,
    chipType: string,
    gameweek: number,
    managerId?: number
  ): Promise<boolean> {
    console.log(`[Transfer Application] Playing chip ${chipType} for user ${userId}, gameweek ${gameweek}`);
    
    try {
      const userSettings = await storage.getUserSettings(userId);
      const teamId = managerId || userSettings?.manager_id;
      
      if (!teamId) {
        throw new Error('Manager ID not found');
      }

      const chipMap: { [key: string]: string } = {
        'wildcard': 'wildcard',
        'freehit': 'freehit',
        'benchboost': 'bboost',
        'triplecaptain': '3xc',
      };

      const fplChipName = chipMap[chipType] || chipType;

      const sessionCookies = await fplAuth.getSessionCookies(userId);
      const csrfToken = await fplAuth.getCsrfToken(userId);

      const currentPicks = await fplApi.getManagerPicks(teamId, gameweek);

      const requestBody: TeamPickPayload = {
        picks: currentPicks.picks.map(pick => ({
          element: pick.element,
          position: pick.position,
          is_captain: pick.is_captain,
          is_vice_captain: pick.is_vice_captain,
        })),
        chip: fplChipName,
      };

      console.log(`[Transfer Application] Sending chip activation to FPL API for team ${teamId}`);

      const response = await fetch(`${FPL_BASE_URL}/my-team/${teamId}/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'Cookie': sessionCookies,
          'X-CSRFToken': csrfToken,
          'X-Requested-With': 'XMLHttpRequest',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://fantasy.premierleague.com/',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `FPL API error: ${response.status} ${response.statusText}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.detail || errorJson.error) {
            errorMessage = errorJson.detail || errorJson.error;
          }
        } catch {
          errorMessage += ` - ${errorText}`;
        }

        console.error(`[Transfer Application] ✗ Chip activation failed:`, errorMessage);
        
        await storage.saveChangeHistory({
          userId,
          gameweek,
          changeType: 'chip',
          changeData: { chipType, fplChipName, response: errorText },
          appliedSuccessfully: false,
          errorMessage,
        });

        if (response.status === 401) {
          console.log(`[Transfer Application] Session expired, attempting refresh...`);
          await fplAuth.refreshSession(userId);
        }

        throw new Error(errorMessage);
      }

      const responseData = await response.json();
      console.log(`[Transfer Application] ✓ Chip played successfully`);

      await storage.saveChangeHistory({
        userId,
        gameweek,
        changeType: 'chip',
        changeData: { 
          chipType,
          fplChipName,
          response: responseData,
        },
        appliedSuccessfully: true,
        errorMessage: null,
      });

      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Transfer Application] ✗ Error playing chip:`, error);
      
      await storage.saveChangeHistory({
        userId,
        gameweek,
        changeType: 'chip',
        changeData: { chipType, error: errorMessage },
        appliedSuccessfully: false,
        errorMessage,
      });

      return false;
    }
  }

  private async validatePlan(plan: any, managerId: number): Promise<void> {
    const players = await fplApi.getPlayers();
    const playerIds = new Set(players.map(p => p.id));

    if (plan.transfers && Array.isArray(plan.transfers)) {
      for (const transfer of plan.transfers) {
        if (!playerIds.has(transfer.player_in_id)) {
          throw new Error(`Player ${transfer.player_in_id} (player_in) not found in FPL database`);
        }
        if (!playerIds.has(transfer.player_out_id)) {
          throw new Error(`Player ${transfer.player_out_id} (player_out) not found in FPL database`);
        }
      }
    }

    if (plan.captainId && !playerIds.has(plan.captainId)) {
      throw new Error(`Captain ${plan.captainId} not found in FPL database`);
    }

    if (plan.viceCaptainId && !playerIds.has(plan.viceCaptainId)) {
      throw new Error(`Vice-captain ${plan.viceCaptainId} not found in FPL database`);
    }

    console.log(`[Transfer Application] ✓ Plan validation passed for manager ${managerId}`);
  }
}

export const transferApplication = new TransferApplicationService();
