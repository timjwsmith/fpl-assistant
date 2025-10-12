import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and } from "drizzle-orm";
import {
  users,
  userSettingsTable,
  userTeams,
  predictions,
  transfers,
  chipsUsed,
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
  getPredictions(userId: number, gameweek: number): Promise<PredictionDB[]>;
  getPredictionsByUser(userId: number): Promise<PredictionDB[]>;
  updatePredictionActualPoints(predictionId: number, actualPoints: number): Promise<void>;
  
  saveTransfer(transfer: InsertTransfer): Promise<Transfer>;
  getTransfers(userId: number, gameweek: number): Promise<Transfer[]>;
  getTransfersByUser(userId: number): Promise<Transfer[]>;
  
  saveChipUsage(chipUsage: InsertChipUsed): Promise<ChipUsed>;
  getChipsUsed(userId: number): Promise<ChipUsed[]>;
  getChipUsedInGameweek(userId: number, gameweek: number): Promise<ChipUsed | undefined>;
}

export class PostgresStorage implements IStorage {
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
      risk_tolerance: dbRow.riskTolerance,
      preferred_formation: dbRow.preferredFormation ?? undefined,
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
      if (settings.hasOwnProperty('risk_tolerance')) dbSettings.riskTolerance = settings.risk_tolerance;
      if (settings.hasOwnProperty('preferred_formation')) dbSettings.preferredFormation = settings.preferred_formation;
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
        preferredFormation: '4-4-2',
        autoCaptain: false,
        notificationsEnabled: false,
        managerId: null,
      };

      // Override with any explicitly provided values
      if (settings.hasOwnProperty('manager_id')) dbSettings.managerId = settings.manager_id;
      if (settings.hasOwnProperty('risk_tolerance')) dbSettings.riskTolerance = settings.risk_tolerance;
      if (settings.hasOwnProperty('preferred_formation')) dbSettings.preferredFormation = settings.preferred_formation;
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
      risk_tolerance: result.riskTolerance,
      preferred_formation: result.preferredFormation ?? undefined,
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

  async getPredictions(userId: number, gameweek: number): Promise<PredictionDB[]> {
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
}

export const storage = new PostgresStorage();
