import type { FPLPlayer } from "@shared/schema";
import { fplApi } from "./fpl-api";

interface RawGameweekPlan {
  id: number;
  userId: number;
  gameweek: number;
  transfers: Array<{
    player_out_id: number;
    player_in_id: number;
    expected_points_gain: number;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
    cost_impact: number;
  }>;
  captainId: number | null;
  viceCaptainId: number | null;
  chipToPlay: string | null;
  formation: string;
  predictedPoints: number;
  confidence: number;
  aiReasoning: string;
  status: string;
  appliedAt: Date | null;
  createdAt: Date;
  originalTeamSnapshot: any;
  pointsDelta: number | null;
  analysisCompletedAt: Date | null;
  recommendationsChanged: boolean | null;
  changeReasoning: string | null;
}

interface HydratedGameweekPlan extends Omit<RawGameweekPlan, 'transfers' | 'captainId' | 'viceCaptainId'> {
  transfers: Array<{
    player_out_id: number;
    player_out_name: string;
    player_in_id: number;
    player_in_name: string;
    expected_points_gain: number;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
    cost_impact: number;
  }>;
  captainId: number | null;
  captainName?: string;
  viceCaptainId: number | null;
  viceCaptainName?: string;
  freeTransfers: number;
  transfersCost: number;
}

export class GameweekPlanHydrator {
  private playerCache: Map<number, FPLPlayer> | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private async getPlayerMap(): Promise<Map<number, FPLPlayer>> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.playerCache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.playerCache;
    }

    // Fetch fresh data
    const players = await fplApi.getPlayers();
    this.playerCache = new Map(players.map(p => [p.id, p]));
    this.cacheTimestamp = now;
    
    return this.playerCache;
  }

  async hydratePlan(rawPlan: RawGameweekPlan): Promise<HydratedGameweekPlan> {
    const playerMap = await this.getPlayerMap();

    // Enrich transfers with player names
    const enrichedTransfers = rawPlan.transfers.map(transfer => ({
      player_out_id: transfer.player_out_id,
      player_out_name: playerMap.get(transfer.player_out_id)?.web_name || `Player ${transfer.player_out_id}`,
      player_in_id: transfer.player_in_id,
      player_in_name: playerMap.get(transfer.player_in_id)?.web_name || `Player ${transfer.player_in_id}`,
      expected_points_gain: transfer.expected_points_gain,
      reasoning: transfer.reasoning,
      priority: transfer.priority,
      cost_impact: transfer.cost_impact,
    }));

    // Calculate free transfers and transfer cost
    const numTransfers = rawPlan.transfers.length;
    
    // Note: We should persist freeTransfers in the database in the future
    // For now, assume 1 free transfer per week (this is a simplification)
    const freeTransfers = 1;
    const transfersCost = Math.max(0, (numTransfers - freeTransfers) * 4);

    return {
      ...rawPlan,
      transfers: enrichedTransfers,
      captainName: rawPlan.captainId ? playerMap.get(rawPlan.captainId)?.web_name : undefined,
      viceCaptainName: rawPlan.viceCaptainId ? playerMap.get(rawPlan.viceCaptainId)?.web_name : undefined,
      freeTransfers,
      transfersCost,
    };
  }

  async hydratePlans(rawPlans: RawGameweekPlan[]): Promise<HydratedGameweekPlan[]> {
    return Promise.all(rawPlans.map(plan => this.hydratePlan(plan)));
  }
}

export const gameweekPlanHydrator = new GameweekPlanHydrator();
