import { fplApi } from './fpl-api';
import { storage } from './storage';
import { gameweekSnapshot } from './gameweek-data-snapshot';
import type { GameweekPlan, FPLPlayer, FPLGameweek } from '../shared/schema';

interface PlayerGameweekPoints {
  playerId: number;
  points: number;
  minutesPlayed: number;
}

interface ImpactAnalysisResult {
  planId: number;
  gameweek: number;
  actualPointsWithAI: number;
  actualPointsWithoutAI: number;
  pointsDelta: number;
  captainComparison: {
    original: { playerId: number; playerName: string; points: number };
    ai: { playerId: number; playerName: string; points: number };
    deltaFromCaptainChange: number;
  };
  transfersImpact?: {
    playersAdded: Array<{ playerId: number; playerName: string; points: number }>;
    playersRemoved: Array<{ playerId: number; playerName: string; points: number }>;
    netTransferImpact: number;
  };
}

export class AIImpactAnalysisService {
  /**
   * Analyze the impact of AI recommendations for a completed gameweek
   * Calculates actual points WITH AI vs WITHOUT AI recommendations
   */
  async analyzeGameweekImpact(planId: number): Promise<ImpactAnalysisResult> {
    console.log(`[AIImpactAnalysis] Starting analysis for plan ${planId}`);

    // 1. Get the gameweek plan
    const plan = await storage.getGameweekPlanById(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    if (plan.status !== 'applied') {
      throw new Error(`Plan ${planId} was not applied (status: ${plan.status})`);
    }

    if (!plan.originalTeamSnapshot) {
      throw new Error(`Plan ${planId} missing original team snapshot - cannot calculate impact`);
    }

    // 2. Fetch snapshot data for the gameweek
    const snapshot = await gameweekSnapshot.getSnapshot(plan.gameweek);
    const gameweeks = snapshot.data.gameweeks;
    const allPlayers = snapshot.data.players;
    
    const targetGameweek = gameweeks.find(gw => gw.id === plan.gameweek);
    if (!targetGameweek?.finished) {
      throw new Error(`Gameweek ${plan.gameweek} is not finished yet`);
    }

    // 3. Fetch actual player points for the gameweek
    const playerPoints = await this.fetchGameweekPlayerPoints(plan.gameweek);

    // 4. Calculate points WITH AI recommendations (what actually happened)
    const actualPointsWithAI = await this.calculateTeamPoints(
      plan.userId,
      plan.gameweek,
      playerPoints
    );

    // 5. Calculate points WITHOUT AI recommendations (hypothetical)
    const actualPointsWithoutAI = await this.calculateHypotheticalPoints(
      plan.originalTeamSnapshot,
      playerPoints
    );

    // 6. Calculate the delta
    const pointsDelta = actualPointsWithAI - actualPointsWithoutAI;

    // 7. Detailed comparison: Captain impact
    const captainComparison = await this.analyzeCaptainImpact(
      plan,
      playerPoints,
      allPlayers
    );

    // 8. Detailed comparison: Transfers impact (if any)
    const transfersImpact = plan.transfers.length > 0
      ? await this.analyzeTransfersImpact(plan, playerPoints, allPlayers)
      : undefined;

    // 9. Update the plan in database
    await storage.updateGameweekPlanAnalysis(planId, {
      actualPointsWithAI,
      actualPointsWithoutAI,
      pointsDelta,
      analysisCompletedAt: new Date(),
    });

    console.log(`[AIImpactAnalysis] Analysis complete for plan ${planId}: ${pointsDelta >= 0 ? '+' : ''}${pointsDelta} points impact`);

    return {
      planId: plan.id,
      gameweek: plan.gameweek,
      actualPointsWithAI,
      actualPointsWithoutAI,
      pointsDelta,
      captainComparison,
      transfersImpact,
    };
  }

  /**
   * Fetch actual points for all players in a gameweek from FPL API
   */
  private async fetchGameweekPlayerPoints(gameweek: number): Promise<Map<number, PlayerGameweekPoints>> {
    console.log(`[AIImpactAnalysis] Fetching player points for gameweek ${gameweek}`);
    
    const liveData = await fplApi.getLiveGameweekData(gameweek);
    const pointsMap = new Map<number, PlayerGameweekPoints>();

    if (liveData.elements && Array.isArray(liveData.elements)) {
      for (const element of liveData.elements) {
        if (element.id && element.stats) {
          pointsMap.set(element.id, {
            playerId: element.id,
            points: element.stats.total_points || 0,
            minutesPlayed: element.stats.minutes || 0,
          });
        }
      }
    }

    console.log(`[AIImpactAnalysis] Fetched points for ${pointsMap.size} players`);
    return pointsMap;
  }

  /**
   * Calculate actual team points from the database (what the user scored with AI)
   */
  private async calculateTeamPoints(
    userId: number,
    gameweek: number,
    playerPoints: Map<number, PlayerGameweekPoints>
  ): Promise<number> {
    // Get the team as it was after AI recommendations were applied
    const team = await storage.getTeam(userId, gameweek);
    if (!team) {
      throw new Error(`No team found for user ${userId} gameweek ${gameweek}`);
    }

    // Get actual picks from FPL to have accurate multipliers
    const userSettings = await storage.getUserSettings(userId);
    if (!userSettings?.manager_id) {
      throw new Error('Manager ID not set');
    }

    const picks = await fplApi.getManagerPicks(userSettings.manager_id, gameweek);
    
    // Use the actual points from entry_history which includes all scoring rules
    return picks.entry_history.points;
  }

  /**
   * Calculate hypothetical points using original team snapshot (what would have happened without AI)
   */
  private async calculateHypotheticalPoints(
    originalSnapshot: {
      captain_id: number;
      vice_captain_id: number;
      players: Array<{
        player_id: number | null;
        position: number;
        is_captain: boolean;
        is_vice_captain: boolean;
        multiplier: number;
      }>;
    },
    playerPoints: Map<number, PlayerGameweekPoints>
  ): Promise<number> {
    let totalPoints = 0;

    // Get captain and vice captain points
    const captainData = playerPoints.get(originalSnapshot.captain_id);
    const viceCaptainData = playerPoints.get(originalSnapshot.vice_captain_id);

    // Determine effective captain (captain if played, vice captain if captain didn't play)
    const captainPlayed = captainData && captainData.minutesPlayed > 0;
    const effectiveCaptain = captainPlayed ? originalSnapshot.captain_id : originalSnapshot.vice_captain_id;

    // Calculate points for each player based on their original position and multiplier
    for (const pick of originalSnapshot.players) {
      if (!pick.player_id) continue;

      const playerData = playerPoints.get(pick.player_id);
      if (!playerData) continue;

      let points = playerData.points;

      // Apply multiplier for captain/vice captain
      if (pick.player_id === effectiveCaptain) {
        // Captain gets 2x (or 3x for triple captain)
        const captainMultiplier = pick.multiplier === 3 ? 3 : 2;
        points = playerData.points * captainMultiplier;
      } else if (pick.multiplier === 0) {
        // Bench players (multiplier 0) don't contribute unless they came on via autosub
        // For simplicity, we'll skip complex autosub logic and only count starting 11
        continue;
      }

      totalPoints += points;
    }

    return totalPoints;
  }

  /**
   * Analyze the impact of captain change
   */
  private async analyzeCaptainImpact(
    plan: GameweekPlan,
    playerPoints: Map<number, PlayerGameweekPoints>,
    players: FPLPlayer[]
  ): Promise<{
    original: { playerId: number; playerName: string; points: number };
    ai: { playerId: number; playerName: string; points: number };
    deltaFromCaptainChange: number;
  }> {
    const playersMap = new Map(players.map(p => [p.id, p]));

    const originalCaptainId = plan.originalTeamSnapshot!.captain_id;
    const aiCaptainId = plan.captainId!;

    const originalCaptainPoints = playerPoints.get(originalCaptainId)?.points || 0;
    const aiCaptainPoints = playerPoints.get(aiCaptainId)?.points || 0;

    // Delta is the difference in captain points (doubled)
    const deltaFromCaptainChange = (aiCaptainPoints - originalCaptainPoints) * 2;

    return {
      original: {
        playerId: originalCaptainId,
        playerName: playersMap.get(originalCaptainId)?.web_name || `Player ${originalCaptainId}`,
        points: originalCaptainPoints,
      },
      ai: {
        playerId: aiCaptainId,
        playerName: playersMap.get(aiCaptainId)?.web_name || `Player ${aiCaptainId}`,
        points: aiCaptainPoints,
      },
      deltaFromCaptainChange,
    };
  }

  /**
   * Analyze the impact of transfers
   */
  private async analyzeTransfersImpact(
    plan: GameweekPlan,
    playerPoints: Map<number, PlayerGameweekPoints>,
    players: FPLPlayer[]
  ): Promise<{
    playersAdded: Array<{ playerId: number; playerName: string; points: number }>;
    playersRemoved: Array<{ playerId: number; playerName: string; points: number }>;
    netTransferImpact: number;
  }> {
    const playersMap = new Map(players.map(p => [p.id, p]));

    const playersAdded = plan.transfers.map(t => {
      const points = playerPoints.get(t.player_in_id)?.points || 0;
      return {
        playerId: t.player_in_id,
        playerName: playersMap.get(t.player_in_id)?.web_name || `Player ${t.player_in_id}`,
        points,
      };
    });

    const playersRemoved = plan.transfers.map(t => {
      const points = playerPoints.get(t.player_out_id)?.points || 0;
      return {
        playerId: t.player_out_id,
        playerName: playersMap.get(t.player_out_id)?.web_name || `Player ${t.player_out_id}`,
        points,
      };
    });

    const pointsGained = playersAdded.reduce((sum, p) => sum + p.points, 0);
    const pointsLost = playersRemoved.reduce((sum, p) => sum + p.points, 0);
    const netTransferImpact = pointsGained - pointsLost;

    return {
      playersAdded,
      playersRemoved,
      netTransferImpact,
    };
  }

  /**
   * Analyze impact for all completed gameweeks for a user
   */
  async analyzeAllCompletedGameweeks(userId: number): Promise<ImpactAnalysisResult[]> {
    console.log(`[AIImpactAnalysis] Analyzing all completed gameweeks for user ${userId}`);

    // Get all applied plans for this user
    const plans = await storage.getGameweekPlansByUser(userId);
    const appliedPlans = plans.filter(p => p.status === 'applied' && p.originalTeamSnapshot);

    // Get current gameweek to fetch snapshot
    const planningGameweek = await fplApi.getPlanningGameweek();
    const currentGw = planningGameweek?.id || 1;
    
    // Check which gameweeks are finished
    const snapshot = await gameweekSnapshot.getSnapshot(currentGw);
    const gameweeks = snapshot.data.gameweeks;
    const finishedGameweeks = new Set(gameweeks.filter(gw => gw.finished).map(gw => gw.id));

    const results: ImpactAnalysisResult[] = [];

    for (const plan of appliedPlans) {
      // Skip if already analyzed
      if (plan.analysisCompletedAt) {
        console.log(`[AIImpactAnalysis] Plan ${plan.id} (GW${plan.gameweek}) already analyzed`);
        continue;
      }

      // Skip if gameweek not finished
      if (!finishedGameweeks.has(plan.gameweek)) {
        console.log(`[AIImpactAnalysis] Gameweek ${plan.gameweek} not finished, skipping plan ${plan.id}`);
        continue;
      }

      try {
        const result = await this.analyzeGameweekImpact(plan.id);
        results.push(result);
      } catch (error) {
        console.error(`[AIImpactAnalysis] Error analyzing plan ${plan.id}:`, error);
      }
    }

    console.log(`[AIImpactAnalysis] Analyzed ${results.length} gameweeks`);
    return results;
  }
}

export const aiImpactAnalysis = new AIImpactAnalysisService();
