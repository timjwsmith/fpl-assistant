import type { FPLPlayer } from "@shared/schema";

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
    accepted?: boolean;
  }>;
  lineupOptimizations: Array<{
    benched_player_id: number;
    benched_player_name: string;
    benched_player_position: string;
    benched_player_predicted_points: number;
    starting_player_id: number;
    starting_player_name: string;
    starting_player_position: string;
    starting_player_predicted_points: number;
    reasoning: string;
    accepted?: boolean;
  }> | null;
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

interface HydratedGameweekPlan extends Omit<RawGameweekPlan, 'transfers' | 'lineupOptimizations' | 'captainId' | 'viceCaptainId'> {
  transfers: Array<{
    player_out_id: number;
    player_out_name: string;
    player_in_id: number;
    player_in_name: string;
    expected_points_gain: number;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
    cost_impact: number;
    accepted: boolean;
  }>;
  lineupOptimizations: Array<{
    benched_player_id: number;
    benched_player_name: string;
    benched_player_position: string;
    benched_player_predicted_points: number;
    starting_player_id: number;
    starting_player_name: string;
    starting_player_position: string;
    starting_player_predicted_points: number;
    reasoning: string;
    accepted: boolean;
  }>;
  captainId: number | null;
  captainName?: string;
  viceCaptainId: number | null;
  viceCaptainName?: string;
  freeTransfers: number;
  transfersCost: number;
}

export class GameweekPlanHydrator {
  /**
   * Hydrate a gameweek plan with player names and calculated fields
   * @param rawPlan - The raw plan from database
   * @param players - Array of FPL players (from snapshot)
   */
  async hydratePlan(rawPlan: RawGameweekPlan, players: FPLPlayer[]): Promise<HydratedGameweekPlan> {
    const playerMap = new Map(players.map(p => [p.id, p]));

    // Enrich transfers with player names (market transfers only)
    // Add defensive default for 'accepted' field to handle legacy records
    const enrichedTransfers = rawPlan.transfers.map(transfer => ({
      player_out_id: transfer.player_out_id,
      player_out_name: playerMap.get(transfer.player_out_id)?.web_name || `Player ${transfer.player_out_id}`,
      player_in_id: transfer.player_in_id,
      player_in_name: playerMap.get(transfer.player_in_id)?.web_name || `Player ${transfer.player_in_id}`,
      expected_points_gain: transfer.expected_points_gain,
      reasoning: transfer.reasoning,
      priority: transfer.priority,
      cost_impact: transfer.cost_impact,
      accepted: transfer.accepted ?? true, // Defensive default for legacy records
    }));

    // Lineup optimizations are already enriched with names in the database
    // Add defensive default for 'accepted' field to handle legacy records
    const lineupOptimizations = (rawPlan.lineupOptimizations || []).map(lo => ({
      ...lo,
      accepted: lo.accepted ?? true, // Defensive default for legacy records
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
      lineupOptimizations,
      captainName: rawPlan.captainId ? playerMap.get(rawPlan.captainId)?.web_name : undefined,
      viceCaptainName: rawPlan.viceCaptainId ? playerMap.get(rawPlan.viceCaptainId)?.web_name : undefined,
      freeTransfers,
      transfersCost,
    };
  }

  /**
   * Hydrate multiple gameweek plans with player names and calculated fields
   * @param rawPlans - Array of raw plans from database
   * @param players - Array of FPL players (from snapshot)
   */
  async hydratePlans(rawPlans: RawGameweekPlan[], players: FPLPlayer[]): Promise<HydratedGameweekPlan[]> {
    return Promise.all(rawPlans.map(plan => this.hydratePlan(plan, players)));
  }
}

export const gameweekPlanHydrator = new GameweekPlanHydrator();
