import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc, gt, lte, isNull } from "drizzle-orm";
import {
  users,
  userSettingsTable,
  userTeams,
  predictions,
  transfers,
  chipsUsed,
  aiTeamPredictions,
  fplCredentials,
  automationSettings,
  gameweekPlans,
  changeHistory,
  aiPrecomputations,
  aiDecisionLedger,
  type User,
  type InsertUser,
  type UserTeam,
  type InsertUserTeam,
  type PredictionDB,
  type InsertPrediction,
  type Transfer,
  type InsertTransfer,
  type ChipUsed,
  type InsertChipUsed,
  type UserSettingsTable,
  type InsertUserSettingsTable,
  type UserSettings,
  type AiTeamPrediction,
  type InsertAiTeamPrediction,
  type FplCredentials,
  type InsertFplCredentials,
  type AutomationSettings,
  type InsertAutomationSettings,
  type GameweekPlan,
  type InsertGameweekPlan,
  type ChangeHistory,
  type InsertChangeHistory,
  type InsertAiPrecomputation,
  type AiPrecomputation,
  type InsertAiDecisionLedger,
  type AiDecisionLedger,
} from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql);

export interface IStorage {
  getOrCreateUser(fplManagerId: number): Promise<User>;
  getUserSettings(userId: number): Promise<UserSettings | undefined>;
  saveUserSettings(userId: number, settings: UserSettings): Promise<UserSettings>;
  deleteUserSettings(userId: number): Promise<boolean>;
  
  saveTeam(team: InsertUserTeam): Promise<UserTeam>;
  getTeam(userId: number, gameweek: number): Promise<UserTeam | undefined>;
  getTeamsByUser(userId: number): Promise<UserTeam[]>;
  
  savePrediction(prediction: InsertPrediction): Promise<PredictionDB>;
  upsertPrediction(prediction: InsertPrediction): Promise<void>;
  getPredictions(userId: number, gameweek: number): Promise<PredictionDB[]>;
  getPredictionsByGameweek(userId: number, gameweek: number): Promise<PredictionDB[]>;
  getPredictionsByUser(userId: number): Promise<PredictionDB[]>;
  getPredictionsWithoutActuals(userId: number, gameweek: number): Promise<PredictionDB[]>;
  updatePredictionActualPoints(predictionId: number, actualPoints: number): Promise<void>;
  updateActualPointsByPlayer(userId: number, gameweek: number, playerId: number, actualPoints: number): Promise<void>;
  deletePredictionsByGameweek(userId: number, gameweek: number): Promise<void>;
  
  saveTransfer(transfer: InsertTransfer): Promise<Transfer>;
  getTransfers(userId: number, gameweek: number): Promise<Transfer[]>;
  getTransfersByUser(userId: number): Promise<Transfer[]>;
  
  saveChipUsage(chipUsage: InsertChipUsed): Promise<ChipUsed>;

  // AI Team Predictions (for async polling)
  createTeamPrediction(userId: number, requestData: any): Promise<number>;
  getTeamPrediction(predictionId: number): Promise<AiTeamPrediction | undefined>;
  updateTeamPredictionStatus(predictionId: number, status: string): Promise<void>;
  completeTeamPrediction(predictionId: number, result: any): Promise<void>;
  failTeamPrediction(predictionId: number, error: string): Promise<void>;
  getChipsUsed(userId: number): Promise<ChipUsed[]>;
  getChipUsedInGameweek(userId: number, gameweek: number): Promise<ChipUsed | undefined>;

  // FPL Credentials
  saveFplCredentials(credentials: InsertFplCredentials): Promise<FplCredentials>;
  getFplCredentials(userId: number): Promise<FplCredentials | undefined>;
  updateFplCredentials(userId: number, credentials: Partial<InsertFplCredentials>): Promise<FplCredentials>;
  deleteFplCredentials(userId: number): Promise<boolean>;

  // Automation Settings
  getAutomationSettings(userId: number): Promise<AutomationSettings | undefined>;
  saveAutomationSettings(userId: number, settings: Partial<InsertAutomationSettings>): Promise<AutomationSettings>;
  getUsersWithAutoSyncEnabled(): Promise<AutomationSettings[]>;

  // Gameweek Plans
  saveGameweekPlan(plan: InsertGameweekPlan): Promise<GameweekPlan>;
  getGameweekPlan(userId: number, gameweek: number): Promise<GameweekPlan | undefined>;
  getGameweekPlanById(planId: number): Promise<GameweekPlan | undefined>;
  getLatestGameweekPlan(userId: number): Promise<GameweekPlan | undefined>;
  getGameweekPlansByUser(userId: number): Promise<GameweekPlan[]>;
  updateGameweekPlanStatus(planId: number, status: 'pending' | 'previewed' | 'applied' | 'rejected'): Promise<void>;
  updateGameweekPlanActualPoints(planId: number, actualPoints: number): Promise<void>;
  updateGameweekPlanAnalysis(planId: number, analysis: {
    actualPointsWithAI: number;
    actualPointsWithoutAI: number;
    pointsDelta: number;
    analysisCompletedAt: Date;
  }): Promise<void>;
  updatePredictionAnalysis(planId: number, analysis: string): Promise<void>;
  updateGameweekPlanTransfers(planId: number, transfers: Array<{
    player_out_id: number;
    player_in_id: number;
    expected_points_gain: number;
    expected_points_gain_timeframe: string;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
    cost_impact: number;
  }>): Promise<void>;
  updateGameweekPlanLineupOptimizations(planId: number, lineupOptimizations: Array<{
    benched_player_id: number;
    benched_player_name: string;
    benched_player_position: string;
    benched_player_predicted_points: number;
    starting_player_id: number;
    starting_player_name: string;
    starting_player_position: string;
    starting_player_predicted_points: number;
    reasoning: string;
  }>): Promise<void>;
  updateGameweekPlanSubmitted(planId: number, submitted: boolean): Promise<void>;

  // Change History
  saveChangeHistory(change: InsertChangeHistory): Promise<ChangeHistory>;
  getChangeHistory(userId: number, gameweek: number): Promise<ChangeHistory[]>;
  getChangeHistoryByUser(userId: number): Promise<ChangeHistory[]>;

  // AI Precomputations
  savePrecomputation(data: InsertAiPrecomputation): Promise<void>;
  getPrecomputation(
    snapshotId: string,
    computationType: string,
    playerId?: number
  ): Promise<AiPrecomputation | null>;
  getPrecomputationsBySnapshot(
    snapshotId: string
  ): Promise<AiPrecomputation[]>;
  cleanupExpiredPrecomputations(): Promise<number>;

  // AI Decision Ledger
  saveDecisionLog(entry: InsertAiDecisionLedger): Promise<void>;
  getDecisionsByUser(userId: number, limit?: number): Promise<AiDecisionLedger[]>;
  getDecisionsByGameweek(userId: number, gameweek: number): Promise<AiDecisionLedger[]>;
  getDecisionsBySnapshot(snapshotId: string): Promise<AiDecisionLedger[]>;
  getDecisionById(id: number): Promise<AiDecisionLedger | null>;
}

export class PostgresStorage implements IStorage {
  // Helper function to add defensive defaults for 'accepted' field in legacy records
  private addAcceptedDefaults(plan: GameweekPlan): GameweekPlan {
    return {
      ...plan,
      transfers: (plan.transfers as any[])?.map(t => ({
        ...t,
        accepted: t.accepted ?? true
      })) || [],
      lineupOptimizations: (plan.lineupOptimizations as any[])?.map(lo => ({
        ...lo,
        accepted: lo.accepted ?? true
      })) || []
    };
  }

  async getOrCreateUser(fplManagerId: number): Promise<User> {
    const existingUsers = await db
      .select()
      .from(users)
      .where(eq(users.fplManagerId, fplManagerId))
      .limit(1);

    if (existingUsers.length > 0) {
      return existingUsers[0];
    }

    const newUsers = await db
      .insert(users)
      .values({ fplManagerId })
      .returning();

    return newUsers[0];
  }

  async getUserSettings(userId: number): Promise<UserSettings | undefined> {
    const settings = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId))
      .limit(1);

    if (!settings[0]) {
      return undefined;
    }

    // Transform camelCase DB fields to snake_case API contract
    const dbRow = settings[0];
    return {
      manager_id: dbRow.managerId,
      primary_league_id: dbRow.primaryLeagueId ?? undefined,
      risk_tolerance: dbRow.riskTolerance,
      auto_captain: dbRow.autoCaptain,
      notifications_enabled: dbRow.notificationsEnabled ?? undefined,
    };
  }

  async saveUserSettings(userId: number, settings: UserSettings): Promise<UserSettings> {
    // Check if settings exist in DB
    const existingSettings = await db
      .select()
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId))
      .limit(1);

    let result: UserSettingsTable;
    
    if (existingSettings.length > 0) {
      // UPDATE: Only set explicitly provided fields to preserve partial updates
      const dbSettings: Partial<typeof userSettingsTable.$inferInsert> = {};
      
      if (settings.hasOwnProperty('manager_id')) dbSettings.managerId = settings.manager_id;
      if (settings.hasOwnProperty('primary_league_id')) dbSettings.primaryLeagueId = settings.primary_league_id;
      if (settings.hasOwnProperty('risk_tolerance')) dbSettings.riskTolerance = settings.risk_tolerance;
      if (settings.hasOwnProperty('auto_captain')) dbSettings.autoCaptain = settings.auto_captain;
      if (settings.hasOwnProperty('notifications_enabled')) dbSettings.notificationsEnabled = settings.notifications_enabled;

      const updated = await db
        .update(userSettingsTable)
        .set(dbSettings)
        .where(eq(userSettingsTable.userId, userId))
        .returning();

      result = updated[0];
    } else {
      // INSERT: Set all defaults + overrides for new records
      const dbSettings: Partial<typeof userSettingsTable.$inferInsert> = {
        riskTolerance: 'balanced',
        autoCaptain: false,
        notificationsEnabled: false,
        managerId: null,
        primaryLeagueId: null,
      };

      // Override with any explicitly provided values
      if (settings.hasOwnProperty('manager_id')) dbSettings.managerId = settings.manager_id;
      if (settings.hasOwnProperty('primary_league_id')) dbSettings.primaryLeagueId = settings.primary_league_id;
      if (settings.hasOwnProperty('risk_tolerance')) dbSettings.riskTolerance = settings.risk_tolerance;
      if (settings.hasOwnProperty('auto_captain')) dbSettings.autoCaptain = settings.auto_captain;
      if (settings.hasOwnProperty('notifications_enabled')) dbSettings.notificationsEnabled = settings.notifications_enabled;

      const inserted = await db
        .insert(userSettingsTable)
        .values({ userId, ...dbSettings })
        .returning();

      result = inserted[0];
    }

    // Transform camelCase DB result back to snake_case API contract
    return {
      manager_id: result.managerId,
      primary_league_id: result.primaryLeagueId ?? undefined,
      risk_tolerance: result.riskTolerance,
      auto_captain: result.autoCaptain,
      notifications_enabled: result.notificationsEnabled,
    };
  }

  async deleteUserSettings(userId: number): Promise<boolean> {
    const result = await db
      .delete(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId))
      .returning();

    return result.length > 0;
  }

  async saveTeam(team: InsertUserTeam): Promise<UserTeam> {
    const existingTeam = await this.getTeam(team.userId, team.gameweek);

    const teamData = {
      ...team,
      players: team.players as { player_id: number | null; position: number; is_captain: boolean; is_vice_captain: boolean; }[]
    };

    if (existingTeam) {
      const updated = await db
        .update(userTeams)
        .set(teamData)
        .where(and(
          eq(userTeams.userId, team.userId),
          eq(userTeams.gameweek, team.gameweek)
        ))
        .returning();

      return updated[0];
    } else {
      const inserted = await db
        .insert(userTeams)
        .values(teamData)
        .returning();

      return inserted[0];
    }
  }

  async getTeam(userId: number, gameweek: number): Promise<UserTeam | undefined> {
    const teams = await db
      .select()
      .from(userTeams)
      .where(and(
        eq(userTeams.userId, userId),
        eq(userTeams.gameweek, gameweek)
      ))
      .limit(1);

    return teams[0];
  }

  async getTeamsByUser(userId: number): Promise<UserTeam[]> {
    return db
      .select()
      .from(userTeams)
      .where(eq(userTeams.userId, userId))
      .orderBy(userTeams.gameweek);
  }

  async savePrediction(prediction: InsertPrediction): Promise<PredictionDB> {
    const inserted = await db
      .insert(predictions)
      .values(prediction)
      .returning();

    return inserted[0];
  }

  async upsertPrediction(prediction: InsertPrediction): Promise<void> {
    await db
      .insert(predictions)
      .values(prediction)
      .onConflictDoUpdate({
        target: [predictions.userId, predictions.gameweek, predictions.playerId],
        set: {
          predictedPoints: prediction.predictedPoints,
          confidence: prediction.confidence,
          snapshotId: prediction.snapshotId,
        },
      });
  }

  async getPredictions(userId: number, gameweek: number): Promise<PredictionDB[]> {
    return db
      .select()
      .from(predictions)
      .where(and(
        eq(predictions.userId, userId),
        eq(predictions.gameweek, gameweek)
      ));
  }

  async getPredictionsByGameweek(userId: number, gameweek: number): Promise<PredictionDB[]> {
    return db
      .select()
      .from(predictions)
      .where(and(
        eq(predictions.userId, userId),
        eq(predictions.gameweek, gameweek)
      ));
  }

  async getPredictionsByUser(userId: number): Promise<PredictionDB[]> {
    return db
      .select()
      .from(predictions)
      .where(eq(predictions.userId, userId))
      .orderBy(predictions.gameweek, predictions.createdAt);
  }

  async updatePredictionActualPoints(predictionId: number, actualPoints: number): Promise<void> {
    await db
      .update(predictions)
      .set({ actualPoints })
      .where(eq(predictions.id, predictionId));
  }

  async saveTransfer(transfer: InsertTransfer): Promise<Transfer> {
    const inserted = await db
      .insert(transfers)
      .values(transfer)
      .returning();

    return inserted[0];
  }

  async getTransfers(userId: number, gameweek: number): Promise<Transfer[]> {
    return db
      .select()
      .from(transfers)
      .where(and(
        eq(transfers.userId, userId),
        eq(transfers.gameweek, gameweek)
      ))
      .orderBy(transfers.createdAt);
  }

  async getTransfersByUser(userId: number): Promise<Transfer[]> {
    return db
      .select()
      .from(transfers)
      .where(eq(transfers.userId, userId))
      .orderBy(transfers.gameweek, transfers.createdAt);
  }

  async saveChipUsage(chipUsage: InsertChipUsed): Promise<ChipUsed> {
    const inserted = await db
      .insert(chipsUsed)
      .values(chipUsage)
      .returning();

    return inserted[0];
  }

  async getChipsUsed(userId: number): Promise<ChipUsed[]> {
    return db
      .select()
      .from(chipsUsed)
      .where(eq(chipsUsed.userId, userId))
      .orderBy(chipsUsed.gameweekUsed);
  }

  async getChipUsedInGameweek(userId: number, gameweek: number): Promise<ChipUsed | undefined> {
    const chips = await db
      .select()
      .from(chipsUsed)
      .where(and(
        eq(chipsUsed.userId, userId),
        eq(chipsUsed.gameweekUsed, gameweek)
      ))
      .limit(1);

    return chips[0];
  }

  async getPredictionsWithoutActuals(userId: number, gameweek: number): Promise<PredictionDB[]> {
    const { isNull } = await import("drizzle-orm");
    return db
      .select()
      .from(predictions)
      .where(and(
        eq(predictions.userId, userId),
        eq(predictions.gameweek, gameweek),
        isNull(predictions.actualPoints)
      ));
  }

  async updateActualPointsByPlayer(userId: number, gameweek: number, playerId: number, actualPoints: number): Promise<void> {
    await db
      .update(predictions)
      .set({ actualPoints })
      .where(and(
        eq(predictions.userId, userId),
        eq(predictions.gameweek, gameweek),
        eq(predictions.playerId, playerId)
      ));
  }

  async deletePredictionsByGameweek(userId: number, gameweek: number): Promise<void> {
    await db
      .delete(predictions)
      .where(
        and(
          eq(predictions.userId, userId),
          eq(predictions.gameweek, gameweek)
        )
      );
    console.log(`[Storage] Cleared predictions for user ${userId}, GW${gameweek}`);
  }

  // AI Team Predictions methods
  async createTeamPrediction(userId: number, requestData: any): Promise<number> {
    const inserted = await db
      .insert(aiTeamPredictions)
      .values({
        userId,
        requestData,
        status: 'pending',
      })
      .returning({ id: aiTeamPredictions.id });

    return inserted[0].id;
  }

  async getTeamPrediction(predictionId: number): Promise<AiTeamPrediction | undefined> {
    const results = await db
      .select()
      .from(aiTeamPredictions)
      .where(eq(aiTeamPredictions.id, predictionId))
      .limit(1);

    return results[0];
  }

  async updateTeamPredictionStatus(predictionId: number, status: string): Promise<void> {
    await db
      .update(aiTeamPredictions)
      .set({ status: status as 'pending' | 'processing' | 'complete' | 'error' })
      .where(eq(aiTeamPredictions.id, predictionId));
  }

  async completeTeamPrediction(predictionId: number, result: any): Promise<void> {
    await db
      .update(aiTeamPredictions)
      .set({ 
        status: 'complete',
        result,
        completedAt: new Date(),
      })
      .where(eq(aiTeamPredictions.id, predictionId));
  }

  async failTeamPrediction(predictionId: number, error: string): Promise<void> {
    await db
      .update(aiTeamPredictions)
      .set({ 
        status: 'error',
        error,
        completedAt: new Date(),
      })
      .where(eq(aiTeamPredictions.id, predictionId));
  }

  // FPL Credentials methods
  async saveFplCredentials(credentials: InsertFplCredentials): Promise<FplCredentials> {
    const existingCreds = await this.getFplCredentials(credentials.userId);

    if (existingCreds) {
      const updated = await db
        .update(fplCredentials)
        .set({
          ...credentials,
          updatedAt: new Date(),
        })
        .where(eq(fplCredentials.userId, credentials.userId))
        .returning();

      return updated[0];
    } else {
      const inserted = await db
        .insert(fplCredentials)
        .values(credentials)
        .returning();

      return inserted[0];
    }
  }

  async getFplCredentials(userId: number): Promise<FplCredentials | undefined> {
    const results = await db
      .select()
      .from(fplCredentials)
      .where(eq(fplCredentials.userId, userId))
      .limit(1);

    return results[0];
  }

  async updateFplCredentials(userId: number, credentials: Partial<InsertFplCredentials>): Promise<FplCredentials> {
    const updated = await db
      .update(fplCredentials)
      .set({
        ...credentials,
        updatedAt: new Date(),
      })
      .where(eq(fplCredentials.userId, userId))
      .returning();

    if (!updated[0]) {
      throw new Error(`FPL credentials not found for user ${userId}`);
    }

    return updated[0];
  }

  async deleteFplCredentials(userId: number): Promise<boolean> {
    const result = await db
      .delete(fplCredentials)
      .where(eq(fplCredentials.userId, userId))
      .returning();

    return result.length > 0;
  }

  // Automation Settings methods
  async getAutomationSettings(userId: number): Promise<AutomationSettings | undefined> {
    const results = await db
      .select()
      .from(automationSettings)
      .where(eq(automationSettings.userId, userId))
      .limit(1);

    return results[0];
  }

  async saveAutomationSettings(userId: number, settings: Partial<InsertAutomationSettings>): Promise<AutomationSettings> {
    const existingSettings = await this.getAutomationSettings(userId);

    if (existingSettings) {
      const updated = await db
        .update(automationSettings)
        .set({
          ...settings,
          updatedAt: new Date(),
        })
        .where(eq(automationSettings.userId, userId))
        .returning();

      return updated[0];
    } else {
      const inserted = await db
        .insert(automationSettings)
        .values({
          userId,
          ...settings,
        })
        .returning();

      return inserted[0];
    }
  }

  async getUsersWithAutoSyncEnabled(): Promise<AutomationSettings[]> {
    return db
      .select()
      .from(automationSettings)
      .where(eq(automationSettings.autoSyncEnabled, true));
  }

  // Gameweek Plans methods
  async saveGameweekPlan(plan: InsertGameweekPlan): Promise<GameweekPlan> {
    const inserted = await db
      .insert(gameweekPlans)
      .values(plan)
      .returning();

    return inserted[0];
  }

  async getGameweekPlan(userId: number, gameweek: number): Promise<GameweekPlan | undefined> {
    const results = await db
      .select()
      .from(gameweekPlans)
      .where(and(
        eq(gameweekPlans.userId, userId),
        eq(gameweekPlans.gameweek, gameweek)
      ))
      .orderBy(desc(gameweekPlans.createdAt))
      .limit(1);

    return results[0] ? this.addAcceptedDefaults(results[0]) : undefined;
  }

  async getGameweekPlanById(planId: number): Promise<GameweekPlan | undefined> {
    const results = await db
      .select()
      .from(gameweekPlans)
      .where(eq(gameweekPlans.id, planId))
      .limit(1);

    return results[0] ? this.addAcceptedDefaults(results[0]) : undefined;
  }

  async getLatestGameweekPlan(userId: number): Promise<GameweekPlan | undefined> {
    const results = await db
      .select()
      .from(gameweekPlans)
      .where(eq(gameweekPlans.userId, userId))
      .orderBy(desc(gameweekPlans.createdAt))
      .limit(1);

    return results[0] ? this.addAcceptedDefaults(results[0]) : undefined;
  }

  async getGameweekPlansByUser(userId: number): Promise<GameweekPlan[]> {
    const results = await db
      .select()
      .from(gameweekPlans)
      .where(eq(gameweekPlans.userId, userId))
      .orderBy(gameweekPlans.gameweek);

    return results.map(plan => this.addAcceptedDefaults(plan));
  }

  async updateGameweekPlanStatus(planId: number, status: 'pending' | 'previewed' | 'applied' | 'rejected'): Promise<void> {
    await db
      .update(gameweekPlans)
      .set({ 
        status,
        appliedAt: status === 'applied' ? new Date() : undefined,
      })
      .where(eq(gameweekPlans.id, planId));
  }

  async updateGameweekPlanActualPoints(planId: number, actualPoints: number): Promise<void> {
    await db
      .update(gameweekPlans)
      .set({ 
        actualPointsWithAI: actualPoints,
      })
      .where(eq(gameweekPlans.id, planId));
  }

  async updateGameweekPlanPredictedPoints(planId: number, predictedPoints: number): Promise<void> {
    await db
      .update(gameweekPlans)
      .set({ 
        predictedPoints,
      })
      .where(eq(gameweekPlans.id, planId));
  }

  async updateGameweekPlanReasoning(planId: number, reasoning: string): Promise<void> {
    // Get existing aiReasoning, update just the reasoning field
    const [plan] = await db
      .select({ aiReasoning: gameweekPlans.aiReasoning })
      .from(gameweekPlans)
      .where(eq(gameweekPlans.id, planId));
    
    if (plan?.aiReasoning) {
      // Parse the JSON string, update the reasoning field, and stringify back
      const existingReasoning = typeof plan.aiReasoning === 'string' 
        ? JSON.parse(plan.aiReasoning)
        : plan.aiReasoning;
      
      const updatedReasoning = {
        ...existingReasoning,
        reasoning: reasoning,
      };
      
      await db
        .update(gameweekPlans)
        .set({ aiReasoning: JSON.stringify(updatedReasoning) })
        .where(eq(gameweekPlans.id, planId));
    }
  }

  async updateGameweekPlanAnalysis(planId: number, analysis: {
    actualPointsWithAI: number;
    actualPointsWithoutAI: number;
    pointsDelta: number;
    analysisCompletedAt: Date;
  }): Promise<void> {
    await db
      .update(gameweekPlans)
      .set({
        actualPointsWithAI: analysis.actualPointsWithAI,
        actualPointsWithoutAI: analysis.actualPointsWithoutAI,
        pointsDelta: analysis.pointsDelta,
        analysisCompletedAt: analysis.analysisCompletedAt,
      })
      .where(eq(gameweekPlans.id, planId));
  }

  async updatePredictionAnalysis(planId: number, analysis: string): Promise<void> {
    await db
      .update(gameweekPlans)
      .set({
        predictionAnalysis: analysis,
      })
      .where(eq(gameweekPlans.id, planId));
  }

  async updateGameweekPlanLineup(planId: number, lineup: Array<{
    player_id: number;
    position: number;
    is_captain: boolean;
    is_vice_captain: boolean;
    multiplier: number;
  }>): Promise<void> {
    await db
      .update(gameweekPlans)
      .set({
        lineup: lineup as any,
      })
      .where(eq(gameweekPlans.id, planId));
  }

  async updateGameweekPlanTransfers(planId: number, transfers: Array<{
    player_out_id: number;
    player_in_id: number;
    player_out_predicted_points?: number;
    player_in_predicted_points?: number;
    expected_points_gain: number;
    expected_points_gain_timeframe: string;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
    cost_impact: number;
    accepted?: boolean;
  }>): Promise<void> {
    // Ensure all transfers have accepted field (default to true if not provided)
    const transfersWithAccepted = transfers.map(t => ({
      ...t,
      accepted: t.accepted ?? true,
      player_out_predicted_points: t.player_out_predicted_points ?? 0,
      player_in_predicted_points: t.player_in_predicted_points ?? 0,
    }));

    await db
      .update(gameweekPlans)
      .set({
        transfers: transfersWithAccepted as any,
      })
      .where(eq(gameweekPlans.id, planId));
  }

  async updateGameweekPlanLineupOptimizations(planId: number, lineupOptimizations: Array<{
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
  }>): Promise<void> {
    // Ensure all lineup optimizations have accepted field (default to true if not provided)
    const lineupOptimizationsWithAccepted = lineupOptimizations.map(lo => ({
      ...lo,
      accepted: lo.accepted ?? true
    }));

    await db
      .update(gameweekPlans)
      .set({
        lineupOptimizations: lineupOptimizationsWithAccepted as any,
      })
      .where(eq(gameweekPlans.id, planId));
  }

  async updateGameweekPlanSubmitted(planId: number, submitted: boolean): Promise<void> {
    await db
      .update(gameweekPlans)
      .set({ 
        submitted,
        submittedAt: submitted ? new Date() : null
      })
      .where(eq(gameweekPlans.id, planId));
  }

  async saveChangeHistory(change: InsertChangeHistory): Promise<ChangeHistory> {
    const inserted = await db
      .insert(changeHistory)
      .values(change)
      .returning();

    return inserted[0];
  }

  async getChangeHistory(userId: number, gameweek: number): Promise<ChangeHistory[]> {
    return db
      .select()
      .from(changeHistory)
      .where(and(
        eq(changeHistory.userId, userId),
        eq(changeHistory.gameweek, gameweek)
      ))
      .orderBy(changeHistory.createdAt);
  }

  async getChangeHistoryByUser(userId: number): Promise<ChangeHistory[]> {
    return db
      .select()
      .from(changeHistory)
      .where(eq(changeHistory.userId, userId))
      .orderBy(changeHistory.gameweek, changeHistory.createdAt);
  }

  // AI Precomputations methods
  async savePrecomputation(data: InsertAiPrecomputation): Promise<void> {
    await db.insert(aiPrecomputations).values(data);
  }

  async getPrecomputation(
    snapshotId: string,
    computationType: string,
    playerId?: number
  ): Promise<AiPrecomputation | null> {
    const conditions: any[] = [
      eq(aiPrecomputations.snapshotId, snapshotId),
      eq(aiPrecomputations.computationType, computationType as any),
      gt(aiPrecomputations.expiresAt, new Date())
    ];

    if (playerId !== undefined) {
      conditions.push(eq(aiPrecomputations.playerId, playerId as any));
    } else {
      conditions.push(isNull(aiPrecomputations.playerId));
    }

    const result = await db
      .select()
      .from(aiPrecomputations)
      .where(and(...conditions))
      .limit(1);
    
    if (result.length > 0) {
      console.log(`[Precomputation Cache] 🎯 HIT for ${computationType} (snapshot: ${snapshotId.substring(0, 8)}...)`);
    } else {
      console.log(`[Precomputation Cache] ❌ MISS for ${computationType} (snapshot: ${snapshotId.substring(0, 8)}...)`);
    }
    
    return result[0] || null;
  }

  async getPrecomputationsBySnapshot(
    snapshotId: string
  ): Promise<AiPrecomputation[]> {
    return await db
      .select()
      .from(aiPrecomputations)
      .where(
        and(
          eq(aiPrecomputations.snapshotId, snapshotId),
          gt(aiPrecomputations.expiresAt, new Date())
        )
      );
  }

  async cleanupExpiredPrecomputations(): Promise<number> {
    const result = await db
      .delete(aiPrecomputations)
      .where(lte(aiPrecomputations.expiresAt, new Date()));
    
    return result.rowCount || 0;
  }

  // AI Decision Ledger methods
  async saveDecisionLog(entry: InsertAiDecisionLedger): Promise<void> {
    await db.insert(aiDecisionLedger).values(entry);
  }

  async getDecisionsByUser(userId: number, limit = 50): Promise<AiDecisionLedger[]> {
    return await db
      .select()
      .from(aiDecisionLedger)
      .where(eq(aiDecisionLedger.userId, userId))
      .orderBy(desc(aiDecisionLedger.createdAt))
      .limit(limit);
  }

  async getDecisionsByGameweek(userId: number, gameweek: number): Promise<AiDecisionLedger[]> {
    return await db
      .select()
      .from(aiDecisionLedger)
      .where(
        and(
          eq(aiDecisionLedger.userId, userId),
          eq(aiDecisionLedger.gameweek, gameweek)
        )
      )
      .orderBy(desc(aiDecisionLedger.createdAt));
  }

  async getDecisionsBySnapshot(snapshotId: string): Promise<AiDecisionLedger[]> {
    return await db
      .select()
      .from(aiDecisionLedger)
      .where(eq(aiDecisionLedger.snapshotId, snapshotId))
      .orderBy(desc(aiDecisionLedger.createdAt));
  }

  async getDecisionById(id: number): Promise<AiDecisionLedger | null> {
    const result = await db
      .select()
      .from(aiDecisionLedger)
      .where(eq(aiDecisionLedger.id, id))
      .limit(1);
    return result[0] || null;
  }
}

export const storage = new PostgresStorage();
