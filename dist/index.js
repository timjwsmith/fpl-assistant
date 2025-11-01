var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
import { z } from "zod";
import { pgTable, text, integer, jsonb, timestamp, boolean, index, serial, uniqueIndex, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
var fplPlayerSchema, fplTeamSchema, fplFixtureSchema, fplGameweekSchema, fplManagerSchema, fplPickSchema, fplTeamPicksSchema, fplTransferSchema, predictionSchema, transferRecommendationSchema, captainRecommendationSchema, chipStrategySchema, teamDraftSchema, performanceComparisonSchema, userSettingsSchema, users, insertUserSchema, userSettingsTable, insertUserSettingsTableSchema, userTeams, insertUserTeamSchema, predictions, insertPredictionSchema, aiTeamPredictions, insertAiTeamPredictionSchema, transfers, insertTransferSchema, chipsUsed, insertChipUsedSchema, fplCredentials, insertFplCredentialsSchema, automationSettings, insertAutomationSettingsSchema, gameweekPlans, insertGameweekPlanSchema, changeHistory, insertChangeHistorySchema, usersRelations, userSettingsRelations, userTeamsRelations, predictionsRelations, transfersRelations, chipsUsedRelations, fplCredentialsRelations, automationSettingsRelations, gameweekPlansRelations, changeHistoryRelations, aiPrecomputations, insertAiPrecomputationSchema, aiDecisionLedger, insertAiDecisionLedgerSchema, aiPrecomputationsRelations, aiDecisionLedgerRelations;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    fplPlayerSchema = z.object({
      id: z.number(),
      web_name: z.string(),
      first_name: z.string(),
      second_name: z.string(),
      team: z.number(),
      team_code: z.number(),
      // Team code for shirt images (matches team.code)
      element_type: z.number(),
      // 1=GK, 2=DEF, 3=MID, 4=FWD
      now_cost: z.number(),
      // Price in tenths (divide by 10)
      selected_by_percent: z.string(),
      form: z.string(),
      total_points: z.number(),
      event_points: z.number(),
      points_per_game: z.string(),
      bonus: z.number(),
      bps: z.number(),
      ict_index: z.string(),
      expected_goals: z.string(),
      expected_assists: z.string(),
      expected_goal_involvements: z.string(),
      expected_goals_conceded: z.string(),
      goals_scored: z.number(),
      assists: z.number(),
      clean_sheets: z.number(),
      saves: z.number(),
      yellow_cards: z.number(),
      red_cards: z.number(),
      minutes: z.number(),
      status: z.string(),
      // a=available, d=doubtful, i=injured, u=unavailable
      chance_of_playing_this_round: z.number().nullable(),
      chance_of_playing_next_round: z.number().nullable(),
      news: z.string(),
      influence: z.string(),
      creativity: z.string(),
      threat: z.string(),
      photo: z.string()
      // Player photo filename e.g. "437730.jpg"
    });
    fplTeamSchema = z.object({
      id: z.number(),
      name: z.string(),
      short_name: z.string(),
      code: z.number(),
      // Used for badge URLs: https://resources.premierleague.com/premierleague/badges/t{code}.png
      strength: z.number(),
      strength_overall_home: z.number(),
      strength_overall_away: z.number(),
      strength_attack_home: z.number(),
      strength_attack_away: z.number(),
      strength_defence_home: z.number(),
      strength_defence_away: z.number()
    });
    fplFixtureSchema = z.object({
      id: z.number(),
      event: z.number().nullable(),
      // Gameweek
      team_h: z.number(),
      team_a: z.number(),
      team_h_difficulty: z.number(),
      team_a_difficulty: z.number(),
      kickoff_time: z.string().nullable(),
      finished: z.boolean(),
      team_h_score: z.number().nullable(),
      team_a_score: z.number().nullable()
    });
    fplGameweekSchema = z.object({
      id: z.number(),
      name: z.string(),
      deadline_time: z.string(),
      average_entry_score: z.number(),
      highest_score: z.number().nullable(),
      is_current: z.boolean(),
      is_next: z.boolean(),
      is_previous: z.boolean(),
      finished: z.boolean(),
      most_captained: z.number().nullable(),
      most_transferred_in: z.number().nullable(),
      top_element: z.number().nullable()
    });
    fplManagerSchema = z.object({
      id: z.number(),
      entry_name: z.string(),
      player_first_name: z.string(),
      player_last_name: z.string(),
      summary_overall_points: z.number(),
      summary_overall_rank: z.number(),
      current_event: z.number(),
      last_deadline_bank: z.number(),
      last_deadline_value: z.number(),
      last_deadline_total_transfers: z.number()
    });
    fplPickSchema = z.object({
      element: z.number(),
      // Player ID
      position: z.number(),
      // Position 1-15
      multiplier: z.number(),
      // 0=benched, 1=playing, 2=captain, 3=triple captain
      is_captain: z.boolean(),
      is_vice_captain: z.boolean()
    });
    fplTeamPicksSchema = z.object({
      picks: z.array(fplPickSchema),
      chips: z.string().nullable(),
      entry_history: z.object({
        event: z.number(),
        points: z.number(),
        total_points: z.number(),
        rank: z.number().nullable(),
        rank_sort: z.number().nullable(),
        overall_rank: z.number(),
        bank: z.number(),
        value: z.number(),
        event_transfers: z.number(),
        event_transfers_cost: z.number(),
        points_on_bench: z.number()
      })
    });
    fplTransferSchema = z.object({
      element_in: z.number(),
      element_in_cost: z.number(),
      element_out: z.number(),
      element_out_cost: z.number(),
      entry: z.number(),
      event: z.number(),
      time: z.string()
    });
    predictionSchema = z.object({
      player_id: z.number(),
      predicted_points: z.number(),
      confidence: z.number(),
      // 0-100
      reasoning: z.string(),
      fixtures_considered: z.array(z.number())
    });
    transferRecommendationSchema = z.object({
      player_out_id: z.number(),
      player_in_id: z.number(),
      expected_points_gain: z.number(),
      reasoning: z.string(),
      priority: z.enum(["high", "medium", "low"]),
      cost_impact: z.number()
    });
    captainRecommendationSchema = z.object({
      player_id: z.number(),
      expected_points: z.number(),
      confidence: z.number(),
      reasoning: z.string(),
      differential: z.boolean(),
      // Is this a differential pick?
      ownership_percent: z.number()
    });
    chipStrategySchema = z.object({
      chip_name: z.enum(["wildcard", "freehit", "benchboost", "triplecaptain"]),
      recommended_gameweek: z.number(),
      reasoning: z.string(),
      expected_value: z.number(),
      confidence: z.number()
    });
    teamDraftSchema = z.object({
      picks: z.array(z.object({
        player_id: z.number().nullable(),
        position: z.number(),
        is_captain: z.boolean(),
        is_vice_captain: z.boolean()
      })),
      budget_remaining: z.number(),
      predicted_points: z.number(),
      formation: z.string()
      // e.g., "4-4-2"
    });
    performanceComparisonSchema = z.object({
      gameweek: z.number(),
      actual_points: z.number(),
      predicted_points: z.number(),
      difference: z.number(),
      accuracy: z.number()
    });
    userSettingsSchema = z.object({
      manager_id: z.number().nullable(),
      primary_league_id: z.number().nullable().optional(),
      risk_tolerance: z.enum(["conservative", "balanced", "aggressive"]).default("balanced"),
      auto_captain: z.boolean().default(false),
      notifications_enabled: z.boolean().optional().default(false)
    });
    users = pgTable("users", {
      id: serial("id").primaryKey(),
      fplManagerId: integer("fpl_manager_id").unique().notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
    userSettingsTable = pgTable("user_settings", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      managerId: integer("manager_id"),
      primaryLeagueId: integer("primary_league_id"),
      riskTolerance: text("risk_tolerance", { enum: ["conservative", "balanced", "aggressive"] }).default("balanced").notNull(),
      autoCaptain: boolean("auto_captain").default(false).notNull(),
      notificationsEnabled: boolean("notifications_enabled").default(false).notNull()
    }, (table) => ({
      userIdIdx: index("user_settings_user_id_idx").on(table.userId)
    }));
    insertUserSettingsTableSchema = createInsertSchema(userSettingsTable).omit({ id: true });
    userTeams = pgTable("user_teams", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      gameweek: integer("gameweek").notNull(),
      players: jsonb("players").notNull().$type(),
      formation: text("formation").notNull(),
      teamValue: integer("team_value").notNull(),
      bank: integer("bank").notNull(),
      transfersMade: integer("transfers_made").notNull().default(0),
      lastDeadlineBank: integer("last_deadline_bank").notNull().default(0),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdate(() => /* @__PURE__ */ new Date())
    }, (table) => ({
      userIdIdx: index("user_teams_user_id_idx").on(table.userId),
      gameweekIdx: index("user_teams_gameweek_idx").on(table.gameweek),
      userGameweekIdx: index("user_teams_user_gameweek_idx").on(table.userId, table.gameweek),
      userGameweekUnique: uniqueIndex("user_teams_user_gameweek_unique").on(table.userId, table.gameweek)
    }));
    insertUserTeamSchema = createInsertSchema(userTeams).omit({ id: true, createdAt: true, updatedAt: true });
    predictions = pgTable("predictions", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      gameweek: integer("gameweek").notNull(),
      playerId: integer("player_id").notNull(),
      predictedPoints: real("predicted_points").notNull(),
      actualPoints: real("actual_points"),
      confidence: integer("confidence").notNull(),
      snapshotId: text("snapshot_id"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (table) => ({
      userIdIdx: index("predictions_user_id_idx").on(table.userId),
      gameweekIdx: index("predictions_gameweek_idx").on(table.gameweek),
      playerIdIdx: index("predictions_player_id_idx").on(table.playerId),
      userGameweekIdx: index("predictions_user_gameweek_idx").on(table.userId, table.gameweek),
      userGameweekPlayerIdx: uniqueIndex("predictions_user_gameweek_player_idx").on(table.userId, table.gameweek, table.playerId),
      snapshotIdIdx: index("predictions_snapshot_id_idx").on(table.snapshotId)
    }));
    insertPredictionSchema = createInsertSchema(predictions).omit({ id: true, createdAt: true });
    aiTeamPredictions = pgTable("ai_team_predictions", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      requestData: jsonb("request_data").notNull(),
      // {players, formation}
      status: text("status", { enum: ["pending", "processing", "complete", "error"] }).notNull().default("pending"),
      result: jsonb("result"),
      // {insights, predicted_points, confidence}
      error: text("error"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      completedAt: timestamp("completed_at")
    }, (table) => ({
      userIdIdx: index("ai_team_predictions_user_id_idx").on(table.userId),
      statusIdx: index("ai_team_predictions_status_idx").on(table.status)
    }));
    insertAiTeamPredictionSchema = createInsertSchema(aiTeamPredictions).omit({ id: true, createdAt: true, completedAt: true });
    transfers = pgTable("transfers", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      gameweek: integer("gameweek").notNull(),
      playerInId: integer("player_in_id").notNull(),
      playerOutId: integer("player_out_id").notNull(),
      cost: integer("cost").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (table) => ({
      userIdIdx: index("transfers_user_id_idx").on(table.userId),
      gameweekIdx: index("transfers_gameweek_idx").on(table.gameweek),
      userGameweekIdx: index("transfers_user_gameweek_idx").on(table.userId, table.gameweek)
    }));
    insertTransferSchema = createInsertSchema(transfers).omit({ id: true, createdAt: true });
    chipsUsed = pgTable("chips_used", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      chipType: text("chip_type", { enum: ["wildcard", "freehit", "benchboost", "triplecaptain"] }).notNull(),
      gameweekUsed: integer("gameweek_used").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (table) => ({
      userIdIdx: index("chips_used_user_id_idx").on(table.userId),
      gameweekIdx: index("chips_used_gameweek_idx").on(table.gameweekUsed),
      userChipGameweekUnique: uniqueIndex("chips_used_user_chip_gameweek_unique").on(table.userId, table.chipType, table.gameweekUsed)
    }));
    insertChipUsedSchema = createInsertSchema(chipsUsed).omit({ id: true, createdAt: true });
    fplCredentials = pgTable("fpl_credentials", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      emailEncrypted: text("email_encrypted"),
      passwordEncrypted: text("password_encrypted"),
      sessionCookies: text("session_cookies"),
      cookiesExpiresAt: timestamp("cookies_expires_at"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    }, (table) => ({
      userIdIdx: index("fpl_credentials_user_id_idx").on(table.userId)
    }));
    insertFplCredentialsSchema = createInsertSchema(fplCredentials).omit({ id: true, createdAt: true, updatedAt: true });
    automationSettings = pgTable("automation_settings", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      autoSyncEnabled: boolean("auto_sync_enabled").default(false).notNull(),
      autoApplyTransfers: boolean("auto_apply_transfers").default(false).notNull(),
      autoApplyCaptain: boolean("auto_apply_captain").default(false).notNull(),
      autoApplyChips: boolean("auto_apply_chips").default(false).notNull(),
      maxTransferHit: integer("max_transfer_hit").default(8).notNull(),
      notificationEnabled: boolean("notification_enabled").default(true).notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    }, (table) => ({
      userIdIdx: index("automation_settings_user_id_idx").on(table.userId)
    }));
    insertAutomationSettingsSchema = createInsertSchema(automationSettings).omit({ id: true, createdAt: true, updatedAt: true });
    gameweekPlans = pgTable("gameweek_plans", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      gameweek: integer("gameweek").notNull(),
      transfers: jsonb("transfers").notNull().$type(),
      lineupOptimizations: jsonb("lineup_optimizations").$type(),
      captainId: integer("captain_id"),
      viceCaptainId: integer("vice_captain_id"),
      chipToPlay: text("chip_to_play", { enum: ["wildcard", "freehit", "benchboost", "triplecaptain"] }),
      formation: text("formation").notNull(),
      lineup: jsonb("lineup").$type(),
      predictedPoints: integer("predicted_points").notNull(),
      confidence: integer("confidence").notNull(),
      aiReasoning: text("ai_reasoning").notNull(),
      status: text("status", { enum: ["pending", "previewed", "applied", "rejected"] }).notNull().default("pending"),
      appliedAt: timestamp("applied_at"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      originalTeamSnapshot: jsonb("original_team_snapshot").$type(),
      actualPointsWithAI: integer("actual_points_with_ai"),
      actualPointsWithoutAI: integer("actual_points_without_ai"),
      pointsDelta: integer("points_delta"),
      analysisCompletedAt: timestamp("analysis_completed_at"),
      predictionAnalysis: text("prediction_analysis"),
      recommendationsChanged: boolean("recommendations_changed").default(false),
      changeReasoning: text("change_reasoning"),
      snapshotId: text("snapshot_id"),
      snapshotGameweek: integer("snapshot_gameweek"),
      snapshotTimestamp: timestamp("snapshot_timestamp"),
      snapshotEnriched: boolean("snapshot_enriched")
    }, (table) => ({
      userIdIdx: index("gameweek_plans_user_id_idx").on(table.userId),
      gameweekIdx: index("gameweek_plans_gameweek_idx").on(table.gameweek),
      userGameweekIdx: index("gameweek_plans_user_gameweek_idx").on(table.userId, table.gameweek)
    }));
    insertGameweekPlanSchema = createInsertSchema(gameweekPlans).omit({ id: true, createdAt: true });
    changeHistory = pgTable("change_history", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      gameweek: integer("gameweek").notNull(),
      changeType: text("change_type", { enum: ["transfer", "captain", "chip", "formation"] }).notNull(),
      changeData: jsonb("change_data").notNull().$type(),
      appliedSuccessfully: boolean("applied_successfully").notNull(),
      errorMessage: text("error_message"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (table) => ({
      userIdIdx: index("change_history_user_id_idx").on(table.userId),
      gameweekIdx: index("change_history_gameweek_idx").on(table.gameweek),
      userGameweekIdx: index("change_history_user_gameweek_idx").on(table.userId, table.gameweek)
    }));
    insertChangeHistorySchema = createInsertSchema(changeHistory).omit({ id: true, createdAt: true });
    usersRelations = relations(users, ({ many, one }) => ({
      teams: many(userTeams),
      predictions: many(predictions),
      transfers: many(transfers),
      chipsUsed: many(chipsUsed),
      settings: one(userSettingsTable, {
        fields: [users.id],
        references: [userSettingsTable.userId]
      }),
      fplCredentials: one(fplCredentials, {
        fields: [users.id],
        references: [fplCredentials.userId]
      }),
      automationSettings: one(automationSettings, {
        fields: [users.id],
        references: [automationSettings.userId]
      }),
      gameweekPlans: many(gameweekPlans),
      changeHistory: many(changeHistory)
    }));
    userSettingsRelations = relations(userSettingsTable, ({ one }) => ({
      user: one(users, {
        fields: [userSettingsTable.userId],
        references: [users.id]
      })
    }));
    userTeamsRelations = relations(userTeams, ({ one }) => ({
      user: one(users, {
        fields: [userTeams.userId],
        references: [users.id]
      })
    }));
    predictionsRelations = relations(predictions, ({ one }) => ({
      user: one(users, {
        fields: [predictions.userId],
        references: [users.id]
      })
    }));
    transfersRelations = relations(transfers, ({ one }) => ({
      user: one(users, {
        fields: [transfers.userId],
        references: [users.id]
      })
    }));
    chipsUsedRelations = relations(chipsUsed, ({ one }) => ({
      user: one(users, {
        fields: [chipsUsed.userId],
        references: [users.id]
      })
    }));
    fplCredentialsRelations = relations(fplCredentials, ({ one }) => ({
      user: one(users, {
        fields: [fplCredentials.userId],
        references: [users.id]
      })
    }));
    automationSettingsRelations = relations(automationSettings, ({ one }) => ({
      user: one(users, {
        fields: [automationSettings.userId],
        references: [users.id]
      })
    }));
    gameweekPlansRelations = relations(gameweekPlans, ({ one }) => ({
      user: one(users, {
        fields: [gameweekPlans.userId],
        references: [users.id]
      })
    }));
    changeHistoryRelations = relations(changeHistory, ({ one }) => ({
      user: one(users, {
        fields: [changeHistory.userId],
        references: [users.id]
      })
    }));
    aiPrecomputations = pgTable("ai_precomputations", {
      id: serial("id").primaryKey(),
      snapshotId: text("snapshot_id").notNull(),
      gameweek: integer("gameweek").notNull(),
      computationType: text("computation_type", {
        enum: ["player_projections", "fixture_difficulty", "captain_shortlist", "chip_heuristics"]
      }).notNull(),
      playerId: integer("player_id"),
      result: jsonb("result").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      expiresAt: timestamp("expires_at").notNull()
    }, (table) => ({
      snapshotIdIdx: index("ai_precomp_snapshot_id_idx").on(table.snapshotId),
      gameweekIdx: index("ai_precomp_gameweek_idx").on(table.gameweek),
      typeIdx: index("ai_precomp_type_idx").on(table.computationType),
      playerIdIdx: index("ai_precomp_player_id_idx").on(table.playerId),
      snapshotTypePlayerUnique: uniqueIndex("ai_precomp_snapshot_type_player_unique").on(table.snapshotId, table.computationType, table.playerId)
    }));
    insertAiPrecomputationSchema = createInsertSchema(aiPrecomputations).omit({ id: true, createdAt: true });
    aiDecisionLedger = pgTable("ai_decision_ledger", {
      id: serial("id").primaryKey(),
      userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
      planId: integer("plan_id").references(() => gameweekPlans.id, { onDelete: "cascade" }),
      snapshotId: text("snapshot_id").notNull(),
      gameweek: integer("gameweek").notNull(),
      decisionType: text("decision_type", {
        enum: ["gameweek_plan", "transfer", "captain", "chip", "prediction"]
      }).notNull(),
      inputsFingerprint: text("inputs_fingerprint").notNull(),
      modelVersion: text("model_version").notNull(),
      confidence: integer("confidence"),
      uncertaintyReasons: jsonb("uncertainty_reasons").$type(),
      overrides: jsonb("overrides").$type(),
      decisionData: jsonb("decision_data").notNull(),
      createdAt: timestamp("created_at").defaultNow().notNull()
    }, (table) => ({
      userIdIdx: index("ai_decision_user_id_idx").on(table.userId),
      planIdIdx: index("ai_decision_plan_id_idx").on(table.planId),
      snapshotIdIdx: index("ai_decision_snapshot_id_idx").on(table.snapshotId),
      gameweekIdx: index("ai_decision_gameweek_idx").on(table.gameweek),
      decisionTypeIdx: index("ai_decision_type_idx").on(table.decisionType)
    }));
    insertAiDecisionLedgerSchema = createInsertSchema(aiDecisionLedger).omit({ id: true, createdAt: true });
    aiPrecomputationsRelations = relations(aiPrecomputations, ({ one }) => ({
      // No user relation as these are shared across all users for a given snapshot
    }));
    aiDecisionLedgerRelations = relations(aiDecisionLedger, ({ one }) => ({
      user: one(users, {
        fields: [aiDecisionLedger.userId],
        references: [users.id]
      }),
      plan: one(gameweekPlans, {
        fields: [aiDecisionLedger.planId],
        references: [gameweekPlans.id]
      })
    }));
  }
});

// server/storage.ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, desc, gt, lte, isNull } from "drizzle-orm";
var sql, db, PostgresStorage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_schema();
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    sql = neon(process.env.DATABASE_URL);
    db = drizzle(sql);
    PostgresStorage = class {
      async getOrCreateUser(fplManagerId) {
        const existingUsers = await db.select().from(users).where(eq(users.fplManagerId, fplManagerId)).limit(1);
        if (existingUsers.length > 0) {
          return existingUsers[0];
        }
        const newUsers = await db.insert(users).values({ fplManagerId }).returning();
        return newUsers[0];
      }
      async getUserSettings(userId) {
        const settings = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1);
        if (!settings[0]) {
          return void 0;
        }
        const dbRow = settings[0];
        return {
          manager_id: dbRow.managerId,
          primary_league_id: dbRow.primaryLeagueId ?? void 0,
          risk_tolerance: dbRow.riskTolerance,
          auto_captain: dbRow.autoCaptain,
          notifications_enabled: dbRow.notificationsEnabled ?? void 0
        };
      }
      async saveUserSettings(userId, settings) {
        const existingSettings = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId)).limit(1);
        let result;
        if (existingSettings.length > 0) {
          const dbSettings = {};
          if (settings.hasOwnProperty("manager_id")) dbSettings.managerId = settings.manager_id;
          if (settings.hasOwnProperty("primary_league_id")) dbSettings.primaryLeagueId = settings.primary_league_id;
          if (settings.hasOwnProperty("risk_tolerance")) dbSettings.riskTolerance = settings.risk_tolerance;
          if (settings.hasOwnProperty("auto_captain")) dbSettings.autoCaptain = settings.auto_captain;
          if (settings.hasOwnProperty("notifications_enabled")) dbSettings.notificationsEnabled = settings.notifications_enabled;
          const updated = await db.update(userSettingsTable).set(dbSettings).where(eq(userSettingsTable.userId, userId)).returning();
          result = updated[0];
        } else {
          const dbSettings = {
            riskTolerance: "balanced",
            autoCaptain: false,
            notificationsEnabled: false,
            managerId: null,
            primaryLeagueId: null
          };
          if (settings.hasOwnProperty("manager_id")) dbSettings.managerId = settings.manager_id;
          if (settings.hasOwnProperty("primary_league_id")) dbSettings.primaryLeagueId = settings.primary_league_id;
          if (settings.hasOwnProperty("risk_tolerance")) dbSettings.riskTolerance = settings.risk_tolerance;
          if (settings.hasOwnProperty("auto_captain")) dbSettings.autoCaptain = settings.auto_captain;
          if (settings.hasOwnProperty("notifications_enabled")) dbSettings.notificationsEnabled = settings.notifications_enabled;
          const inserted = await db.insert(userSettingsTable).values({ userId, ...dbSettings }).returning();
          result = inserted[0];
        }
        return {
          manager_id: result.managerId,
          primary_league_id: result.primaryLeagueId ?? void 0,
          risk_tolerance: result.riskTolerance,
          auto_captain: result.autoCaptain,
          notifications_enabled: result.notificationsEnabled
        };
      }
      async deleteUserSettings(userId) {
        const result = await db.delete(userSettingsTable).where(eq(userSettingsTable.userId, userId)).returning();
        return result.length > 0;
      }
      async saveTeam(team) {
        const existingTeam = await this.getTeam(team.userId, team.gameweek);
        const teamData = {
          ...team,
          players: team.players
        };
        if (existingTeam) {
          const updated = await db.update(userTeams).set(teamData).where(and(
            eq(userTeams.userId, team.userId),
            eq(userTeams.gameweek, team.gameweek)
          )).returning();
          return updated[0];
        } else {
          const inserted = await db.insert(userTeams).values(teamData).returning();
          return inserted[0];
        }
      }
      async getTeam(userId, gameweek) {
        const teams = await db.select().from(userTeams).where(and(
          eq(userTeams.userId, userId),
          eq(userTeams.gameweek, gameweek)
        )).limit(1);
        return teams[0];
      }
      async getTeamsByUser(userId) {
        return db.select().from(userTeams).where(eq(userTeams.userId, userId)).orderBy(userTeams.gameweek);
      }
      async savePrediction(prediction) {
        const inserted = await db.insert(predictions).values(prediction).returning();
        return inserted[0];
      }
      async upsertPrediction(prediction) {
        await db.insert(predictions).values(prediction).onConflictDoUpdate({
          target: [predictions.userId, predictions.gameweek, predictions.playerId],
          set: {
            predictedPoints: prediction.predictedPoints,
            confidence: prediction.confidence,
            snapshotId: prediction.snapshotId
          }
        });
      }
      async getPredictions(userId, gameweek) {
        return db.select().from(predictions).where(and(
          eq(predictions.userId, userId),
          eq(predictions.gameweek, gameweek)
        ));
      }
      async getPredictionsByGameweek(userId, gameweek) {
        return db.select().from(predictions).where(and(
          eq(predictions.userId, userId),
          eq(predictions.gameweek, gameweek)
        ));
      }
      async getPredictionsByUser(userId) {
        return db.select().from(predictions).where(eq(predictions.userId, userId)).orderBy(predictions.gameweek, predictions.createdAt);
      }
      async updatePredictionActualPoints(predictionId, actualPoints) {
        await db.update(predictions).set({ actualPoints }).where(eq(predictions.id, predictionId));
      }
      async saveTransfer(transfer) {
        const inserted = await db.insert(transfers).values(transfer).returning();
        return inserted[0];
      }
      async getTransfers(userId, gameweek) {
        return db.select().from(transfers).where(and(
          eq(transfers.userId, userId),
          eq(transfers.gameweek, gameweek)
        )).orderBy(transfers.createdAt);
      }
      async getTransfersByUser(userId) {
        return db.select().from(transfers).where(eq(transfers.userId, userId)).orderBy(transfers.gameweek, transfers.createdAt);
      }
      async saveChipUsage(chipUsage) {
        const inserted = await db.insert(chipsUsed).values(chipUsage).returning();
        return inserted[0];
      }
      async getChipsUsed(userId) {
        return db.select().from(chipsUsed).where(eq(chipsUsed.userId, userId)).orderBy(chipsUsed.gameweekUsed);
      }
      async getChipUsedInGameweek(userId, gameweek) {
        const chips = await db.select().from(chipsUsed).where(and(
          eq(chipsUsed.userId, userId),
          eq(chipsUsed.gameweekUsed, gameweek)
        )).limit(1);
        return chips[0];
      }
      async getPredictionsWithoutActuals(userId, gameweek) {
        const { isNull: isNull2 } = await import("drizzle-orm");
        return db.select().from(predictions).where(and(
          eq(predictions.userId, userId),
          eq(predictions.gameweek, gameweek),
          isNull2(predictions.actualPoints)
        ));
      }
      async updateActualPointsByPlayer(userId, gameweek, playerId, actualPoints) {
        await db.update(predictions).set({ actualPoints }).where(and(
          eq(predictions.userId, userId),
          eq(predictions.gameweek, gameweek),
          eq(predictions.playerId, playerId)
        ));
      }
      async deletePredictionsByGameweek(userId, gameweek) {
        await db.delete(predictions).where(
          and(
            eq(predictions.userId, userId),
            eq(predictions.gameweek, gameweek)
          )
        );
        console.log(`[Storage] Cleared predictions for user ${userId}, GW${gameweek}`);
      }
      // AI Team Predictions methods
      async createTeamPrediction(userId, requestData) {
        const inserted = await db.insert(aiTeamPredictions).values({
          userId,
          requestData,
          status: "pending"
        }).returning({ id: aiTeamPredictions.id });
        return inserted[0].id;
      }
      async getTeamPrediction(predictionId) {
        const results = await db.select().from(aiTeamPredictions).where(eq(aiTeamPredictions.id, predictionId)).limit(1);
        return results[0];
      }
      async updateTeamPredictionStatus(predictionId, status) {
        await db.update(aiTeamPredictions).set({ status }).where(eq(aiTeamPredictions.id, predictionId));
      }
      async completeTeamPrediction(predictionId, result) {
        await db.update(aiTeamPredictions).set({
          status: "complete",
          result,
          completedAt: /* @__PURE__ */ new Date()
        }).where(eq(aiTeamPredictions.id, predictionId));
      }
      async failTeamPrediction(predictionId, error) {
        await db.update(aiTeamPredictions).set({
          status: "error",
          error,
          completedAt: /* @__PURE__ */ new Date()
        }).where(eq(aiTeamPredictions.id, predictionId));
      }
      // FPL Credentials methods
      async saveFplCredentials(credentials) {
        const existingCreds = await this.getFplCredentials(credentials.userId);
        if (existingCreds) {
          const updated = await db.update(fplCredentials).set({
            ...credentials,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq(fplCredentials.userId, credentials.userId)).returning();
          return updated[0];
        } else {
          const inserted = await db.insert(fplCredentials).values(credentials).returning();
          return inserted[0];
        }
      }
      async getFplCredentials(userId) {
        const results = await db.select().from(fplCredentials).where(eq(fplCredentials.userId, userId)).limit(1);
        return results[0];
      }
      async updateFplCredentials(userId, credentials) {
        const updated = await db.update(fplCredentials).set({
          ...credentials,
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(fplCredentials.userId, userId)).returning();
        if (!updated[0]) {
          throw new Error(`FPL credentials not found for user ${userId}`);
        }
        return updated[0];
      }
      async deleteFplCredentials(userId) {
        const result = await db.delete(fplCredentials).where(eq(fplCredentials.userId, userId)).returning();
        return result.length > 0;
      }
      // Automation Settings methods
      async getAutomationSettings(userId) {
        const results = await db.select().from(automationSettings).where(eq(automationSettings.userId, userId)).limit(1);
        return results[0];
      }
      async saveAutomationSettings(userId, settings) {
        const existingSettings = await this.getAutomationSettings(userId);
        if (existingSettings) {
          const updated = await db.update(automationSettings).set({
            ...settings,
            updatedAt: /* @__PURE__ */ new Date()
          }).where(eq(automationSettings.userId, userId)).returning();
          return updated[0];
        } else {
          const inserted = await db.insert(automationSettings).values({
            userId,
            ...settings
          }).returning();
          return inserted[0];
        }
      }
      async getUsersWithAutoSyncEnabled() {
        return db.select().from(automationSettings).where(eq(automationSettings.autoSyncEnabled, true));
      }
      // Gameweek Plans methods
      async saveGameweekPlan(plan) {
        const inserted = await db.insert(gameweekPlans).values(plan).returning();
        return inserted[0];
      }
      async getGameweekPlan(userId, gameweek) {
        const results = await db.select().from(gameweekPlans).where(and(
          eq(gameweekPlans.userId, userId),
          eq(gameweekPlans.gameweek, gameweek)
        )).orderBy(desc(gameweekPlans.createdAt)).limit(1);
        return results[0];
      }
      async getGameweekPlanById(planId) {
        const results = await db.select().from(gameweekPlans).where(eq(gameweekPlans.id, planId)).limit(1);
        return results[0];
      }
      async getLatestGameweekPlan(userId) {
        const results = await db.select().from(gameweekPlans).where(eq(gameweekPlans.userId, userId)).orderBy(desc(gameweekPlans.createdAt)).limit(1);
        return results[0];
      }
      async getGameweekPlansByUser(userId) {
        return db.select().from(gameweekPlans).where(eq(gameweekPlans.userId, userId)).orderBy(gameweekPlans.gameweek);
      }
      async updateGameweekPlanStatus(planId, status) {
        await db.update(gameweekPlans).set({
          status,
          appliedAt: status === "applied" ? /* @__PURE__ */ new Date() : void 0
        }).where(eq(gameweekPlans.id, planId));
      }
      async updateGameweekPlanActualPoints(planId, actualPoints) {
        await db.update(gameweekPlans).set({
          actualPointsWithAI: actualPoints
        }).where(eq(gameweekPlans.id, planId));
      }
      async updateGameweekPlanPredictedPoints(planId, predictedPoints) {
        await db.update(gameweekPlans).set({
          predictedPoints
        }).where(eq(gameweekPlans.id, planId));
      }
      async updateGameweekPlanReasoning(planId, reasoning) {
        const [plan] = await db.select({ aiReasoning: gameweekPlans.aiReasoning }).from(gameweekPlans).where(eq(gameweekPlans.id, planId));
        if (plan?.aiReasoning) {
          const existingReasoning = typeof plan.aiReasoning === "string" ? JSON.parse(plan.aiReasoning) : plan.aiReasoning;
          const updatedReasoning = {
            ...existingReasoning,
            reasoning
          };
          await db.update(gameweekPlans).set({ aiReasoning: JSON.stringify(updatedReasoning) }).where(eq(gameweekPlans.id, planId));
        }
      }
      async updateGameweekPlanAnalysis(planId, analysis) {
        await db.update(gameweekPlans).set({
          actualPointsWithAI: analysis.actualPointsWithAI,
          actualPointsWithoutAI: analysis.actualPointsWithoutAI,
          pointsDelta: analysis.pointsDelta,
          analysisCompletedAt: analysis.analysisCompletedAt
        }).where(eq(gameweekPlans.id, planId));
      }
      async updatePredictionAnalysis(planId, analysis) {
        await db.update(gameweekPlans).set({
          predictionAnalysis: analysis
        }).where(eq(gameweekPlans.id, planId));
      }
      async updateGameweekPlanLineup(planId, lineup) {
        await db.update(gameweekPlans).set({
          lineup
        }).where(eq(gameweekPlans.id, planId));
      }
      async updateGameweekPlanTransfers(planId, transfers2) {
        await db.update(gameweekPlans).set({
          transfers: transfers2
        }).where(eq(gameweekPlans.id, planId));
      }
      async updateGameweekPlanLineupOptimizations(planId, lineupOptimizations) {
        await db.update(gameweekPlans).set({
          lineupOptimizations
        }).where(eq(gameweekPlans.id, planId));
      }
      async saveChangeHistory(change) {
        const inserted = await db.insert(changeHistory).values(change).returning();
        return inserted[0];
      }
      async getChangeHistory(userId, gameweek) {
        return db.select().from(changeHistory).where(and(
          eq(changeHistory.userId, userId),
          eq(changeHistory.gameweek, gameweek)
        )).orderBy(changeHistory.createdAt);
      }
      async getChangeHistoryByUser(userId) {
        return db.select().from(changeHistory).where(eq(changeHistory.userId, userId)).orderBy(changeHistory.gameweek, changeHistory.createdAt);
      }
      // AI Precomputations methods
      async savePrecomputation(data) {
        await db.insert(aiPrecomputations).values(data);
      }
      async getPrecomputation(snapshotId, computationType, playerId) {
        const conditions = [
          eq(aiPrecomputations.snapshotId, snapshotId),
          eq(aiPrecomputations.computationType, computationType),
          gt(aiPrecomputations.expiresAt, /* @__PURE__ */ new Date())
        ];
        if (playerId !== void 0) {
          conditions.push(eq(aiPrecomputations.playerId, playerId));
        } else {
          conditions.push(isNull(aiPrecomputations.playerId));
        }
        const result = await db.select().from(aiPrecomputations).where(and(...conditions)).limit(1);
        if (result.length > 0) {
          console.log(`[Precomputation Cache] \u{1F3AF} HIT for ${computationType} (snapshot: ${snapshotId.substring(0, 8)}...)`);
        } else {
          console.log(`[Precomputation Cache] \u274C MISS for ${computationType} (snapshot: ${snapshotId.substring(0, 8)}...)`);
        }
        return result[0] || null;
      }
      async getPrecomputationsBySnapshot(snapshotId) {
        return await db.select().from(aiPrecomputations).where(
          and(
            eq(aiPrecomputations.snapshotId, snapshotId),
            gt(aiPrecomputations.expiresAt, /* @__PURE__ */ new Date())
          )
        );
      }
      async cleanupExpiredPrecomputations() {
        const result = await db.delete(aiPrecomputations).where(lte(aiPrecomputations.expiresAt, /* @__PURE__ */ new Date()));
        return result.rowCount || 0;
      }
      // AI Decision Ledger methods
      async saveDecisionLog(entry) {
        await db.insert(aiDecisionLedger).values(entry);
      }
      async getDecisionsByUser(userId, limit = 50) {
        return await db.select().from(aiDecisionLedger).where(eq(aiDecisionLedger.userId, userId)).orderBy(desc(aiDecisionLedger.createdAt)).limit(limit);
      }
      async getDecisionsByGameweek(userId, gameweek) {
        return await db.select().from(aiDecisionLedger).where(
          and(
            eq(aiDecisionLedger.userId, userId),
            eq(aiDecisionLedger.gameweek, gameweek)
          )
        ).orderBy(desc(aiDecisionLedger.createdAt));
      }
      async getDecisionsBySnapshot(snapshotId) {
        return await db.select().from(aiDecisionLedger).where(eq(aiDecisionLedger.snapshotId, snapshotId)).orderBy(desc(aiDecisionLedger.createdAt));
      }
      async getDecisionById(id) {
        const result = await db.select().from(aiDecisionLedger).where(eq(aiDecisionLedger.id, id)).limit(1);
        return result[0] || null;
      }
    };
    storage = new PostgresStorage();
  }
});

// server/fpl-api.ts
var fpl_api_exports = {};
__export(fpl_api_exports, {
  fplApi: () => fplApi
});
var FPL_BASE_URL, FPLApiService, fplApi;
var init_fpl_api = __esm({
  "server/fpl-api.ts"() {
    "use strict";
    FPL_BASE_URL = "https://fantasy.premierleague.com/api";
    FPLApiService = class {
      bootstrapCache = null;
      cacheTimestamp = 0;
      CACHE_DURATION = 5 * 60 * 1e3;
      // 5 minutes
      async getBootstrapData() {
        const now = Date.now();
        if (this.bootstrapCache && now - this.cacheTimestamp < this.CACHE_DURATION) {
          return this.bootstrapCache;
        }
        const response = await fetch(`${FPL_BASE_URL}/bootstrap-static/`);
        if (!response.ok) {
          throw new Error(`FPL API error: ${response.statusText}`);
        }
        const data = await response.json();
        this.bootstrapCache = data;
        this.cacheTimestamp = now;
        return data;
      }
      async getPlayers() {
        const data = await this.getBootstrapData();
        return data.elements;
      }
      async getTeams() {
        const data = await this.getBootstrapData();
        return data.teams;
      }
      async getGameweeks() {
        const data = await this.getBootstrapData();
        return data.events;
      }
      async getCurrentGameweek() {
        const gameweeks = await this.getGameweeks();
        return gameweeks.find((gw) => gw.is_current);
      }
      async getNextGameweek() {
        const gameweeks = await this.getGameweeks();
        return gameweeks.find((gw) => gw.is_next);
      }
      async getPlanningGameweek() {
        const gameweeks = await this.getGameweeks();
        const next = gameweeks.find((gw) => gw.is_next);
        const current = gameweeks.find((gw) => gw.is_current);
        return next || current;
      }
      async getPositionTypes() {
        const data = await this.getBootstrapData();
        return data.element_types;
      }
      async getFixtures(gameweek) {
        const url = gameweek ? `${FPL_BASE_URL}/fixtures/?event=${gameweek}` : `${FPL_BASE_URL}/fixtures/`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`FPL API error: ${response.statusText}`);
        }
        return response.json();
      }
      async getPlayerDetails(playerId) {
        const response = await fetch(`${FPL_BASE_URL}/element-summary/${playerId}/`);
        if (!response.ok) {
          throw new Error(`FPL API error: ${response.statusText}`);
        }
        return response.json();
      }
      async getManagerDetails(managerId) {
        const response = await fetch(`${FPL_BASE_URL}/entry/${managerId}/`);
        if (!response.ok) {
          throw new Error(`FPL API error: ${response.statusText}`);
        }
        return response.json();
      }
      async getManagerPicks(managerId, gameweek) {
        const response = await fetch(`${FPL_BASE_URL}/entry/${managerId}/event/${gameweek}/picks/`);
        if (!response.ok) {
          throw new Error(`FPL API error: ${response.statusText}`);
        }
        return response.json();
      }
      async getManagerTransfers(managerId) {
        const response = await fetch(`${FPL_BASE_URL}/entry/${managerId}/transfers/`);
        if (!response.ok) {
          throw new Error(`FPL API error: ${response.statusText}`);
        }
        return response.json();
      }
      async getManagerHistory(managerId) {
        const response = await fetch(`${FPL_BASE_URL}/entry/${managerId}/history/`);
        if (!response.ok) {
          throw new Error(`FPL API error: ${response.statusText}`);
        }
        return response.json();
      }
      async getLiveGameweekData(gameweek) {
        const response = await fetch(`${FPL_BASE_URL}/event/${gameweek}/live/`);
        if (!response.ok) {
          throw new Error(`FPL API error: ${response.statusText}`);
        }
        return response.json();
      }
      // League Analysis Endpoints
      async getLeagueStandings(leagueId, page = 1) {
        const response = await fetch(`${FPL_BASE_URL}/leagues-classic/${leagueId}/standings/?page_standings=${page}`);
        if (!response.ok) {
          throw new Error(`FPL API error: ${response.statusText}`);
        }
        return response.json();
      }
      async getSetPieceTakers() {
        const response = await fetch(`${FPL_BASE_URL}/set-piece-notes/`);
        if (!response.ok) {
          throw new Error(`FPL API error: ${response.statusText}`);
        }
        return response.json();
      }
      async getDreamTeam(gameweek) {
        const response = await fetch(`${FPL_BASE_URL}/dream-team/${gameweek}/`);
        if (!response.ok) {
          throw new Error(`FPL API error: ${response.statusText}`);
        }
        return response.json();
      }
      async getEventStatus() {
        const response = await fetch(`${FPL_BASE_URL}/event-status/`);
        if (!response.ok) {
          throw new Error(`FPL API error: ${response.statusText}`);
        }
        return response.json();
      }
    };
    fplApi = new FPLApiService();
  }
});

// server/understat-api.ts
import * as cheerio from "cheerio";
var UnderstatService, understatService;
var init_understat_api = __esm({
  "server/understat-api.ts"() {
    "use strict";
    UnderstatService = class {
      cache = /* @__PURE__ */ new Map();
      inFlightRequests = /* @__PURE__ */ new Map();
      CACHE_DURATION = 24 * 60 * 60 * 1e3;
      // 24 hours
      BASE_URL = "https://understat.com";
      /**
       * Extract JSON data from Understat page script tags
       */
      extractJsonFromScript(html, variableName) {
        const $ = cheerio.load(html);
        const scripts = $("script").toArray();
        for (const script of scripts) {
          const scriptContent = $(script).html();
          if (scriptContent && scriptContent.includes(variableName)) {
            try {
              const jsonParseMatch = scriptContent.match(new RegExp(`var ${variableName}\\s*=\\s*JSON\\.parse\\('(.+?)'\\)`));
              if (jsonParseMatch && jsonParseMatch[1]) {
                const escapedJson = jsonParseMatch[1];
                const decodedJson = escapedJson.replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))).replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
                return JSON.parse(decodedJson);
              }
            } catch (error) {
              console.error(`[Understat] Failed to parse ${variableName}:`, error);
            }
          }
        }
        return [];
      }
      /**
       * Get EPL player stats from Understat for a specific season
       */
      async getLeaguePlayers(season = "2024") {
        const cacheKey = `epl_${season}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
          console.log(`[Understat] Using cached data for ${cacheKey}`);
          return cached.data;
        }
        const inFlight = this.inFlightRequests.get(cacheKey);
        if (inFlight) {
          console.log(`[Understat] Sharing in-flight request for ${cacheKey} (preventing duplicate fetch)`);
          return inFlight;
        }
        const fetchPromise = this.fetchLeaguePlayers(season, cacheKey, cached);
        this.inFlightRequests.set(cacheKey, fetchPromise);
        try {
          const result = await fetchPromise;
          return result;
        } finally {
          this.inFlightRequests.delete(cacheKey);
        }
      }
      /**
       * Internal method to fetch league players from Understat
       */
      async fetchLeaguePlayers(season, cacheKey, cached) {
        try {
          console.log(`[Understat] Fetching EPL player data for season ${season}`);
          const url = `${this.BASE_URL}/league/EPL/${season}`;
          const response = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          });
          if (!response.ok) {
            throw new Error(`Understat request failed: ${response.status} ${response.statusText}`);
          }
          const html = await response.text();
          const playersData = this.extractJsonFromScript(html, "playersData");
          if (!playersData || playersData.length === 0) {
            console.warn("[Understat] No player data found");
            return [];
          }
          console.log(`[Understat] Successfully fetched ${playersData.length} players`);
          this.cache.set(cacheKey, {
            data: playersData,
            timestamp: Date.now()
          });
          return playersData;
        } catch (error) {
          console.error("[Understat] Error fetching player data:", error);
          if (cached) {
            console.log("[Understat] Returning stale cache due to error");
            return cached.data;
          }
          return [];
        }
      }
      /**
       * Get Understat data for a specific player by name
       */
      async getPlayerByName(playerName, season = "2024") {
        const players = await this.getLeaguePlayers(season);
        const normalizedName = playerName.toLowerCase().trim();
        let player = players.find((p) => p.player_name.toLowerCase() === normalizedName);
        if (!player) {
          player = players.find(
            (p) => p.player_name.toLowerCase().includes(normalizedName) || normalizedName.includes(p.player_name.toLowerCase())
          );
        }
        return player || null;
      }
      /**
       * Enrich FPL player data with Understat metrics
       */
      async enrichPlayerData(fplPlayerName, season = "2024") {
        const understatPlayer = await this.getPlayerByName(fplPlayerName, season);
        if (!understatPlayer) {
          return null;
        }
        return {
          npxG: parseFloat(understatPlayer.npxG || "0"),
          xGChain: parseFloat(understatPlayer.xGChain || "0"),
          xGBuildup: parseFloat(understatPlayer.xGBuildup || "0")
        };
      }
      /**
       * Clear cache (useful for testing or forcing refresh)
       */
      clearCache() {
        this.cache.clear();
        this.inFlightRequests.clear();
        console.log("[Understat] Cache and in-flight requests cleared");
      }
    };
    understatService = new UnderstatService();
  }
});

// server/precomputation-orchestrator.ts
function calculateTeamFixtureDifficulty(team, fixtures, currentGameweek) {
  const upcoming = fixtures.filter(
    (f) => f.event && f.event > currentGameweek && f.event <= currentGameweek + 6 && (f.team_h === team.id || f.team_a === team.id)
  ).slice(0, 6);
  const totalDifficulty = upcoming.reduce((sum, fixture) => {
    const difficulty = fixture.team_h === team.id ? fixture.team_h_difficulty : fixture.team_a_difficulty;
    return sum + difficulty;
  }, 0);
  return upcoming.length > 0 ? totalDifficulty / upcoming.length : 0;
}
function analyzeOptimalBenchBoost(fixtures, teams, currentGW) {
  const gws = Array.from({ length: 10 }, (_, i) => currentGW + i + 1);
  const doubleGameweeks = gws.filter((gw) => {
    const gwFixtures = fixtures.filter((f) => f.event === gw);
    const teamsPlaying = gwFixtures.flatMap((f) => [f.team_h, f.team_a]);
    return teamsPlaying.some((team, idx) => teamsPlaying.indexOf(team) !== idx);
  });
  return {
    recommendedGameweek: doubleGameweeks[0] || currentGW + 5,
    reasoning: doubleGameweeks.length > 0 ? `Double gameweek detected in GW${doubleGameweeks[0]}` : "No double gameweeks found, defaulting to mid-season"
  };
}
function analyzeOptimalTripleCaptain(fixtures, teams, currentGW) {
  return analyzeOptimalBenchBoost(fixtures, teams, currentGW);
}
function analyzeOptimalFreeHit(fixtures, teams, currentGW) {
  return {
    recommendedGameweek: currentGW + 6,
    reasoning: "Use during blank/double gameweeks for maximum impact"
  };
}
function analyzeOptimalWildcard(fixtures, teams, currentGW) {
  return {
    recommendedGameweek: currentGW + 3,
    reasoning: "Mid-season wildcard to reset team structure"
  };
}
var PrecomputationOrchestrator, precomputationOrchestrator;
var init_precomputation_orchestrator = __esm({
  "server/precomputation-orchestrator.ts"() {
    "use strict";
    init_storage();
    PrecomputationOrchestrator = class {
      /**
       * Trigger precomputation jobs for a new snapshot
       * Called when GameweekDataSnapshot creates/refreshes a snapshot
       * 
       * @param context - Complete snapshot context with metadata
       * 
       * @example
       * // Triggered automatically by GameweekDataSnapshot
       * const context = await snapshotContext.getContext(10);
       * await precomputationOrchestrator.onSnapshotReady(context);
       */
      async onSnapshotReady(context) {
        console.log(`[Precomputation] Starting batch jobs for snapshot ${context.snapshotId} (GW${context.gameweek})`);
        const expiresAt = new Date(context.timestamp + 5 * 60 * 1e3);
        await Promise.all([
          this.precomputeFixtureDifficulty(context, expiresAt),
          this.precomputeCaptainShortlist(context, expiresAt),
          this.precomputeChipHeuristics(context, expiresAt)
        ]);
        console.log(`[Precomputation] Completed batch jobs for snapshot ${context.snapshotId}`);
      }
      /**
       * Precompute fixture difficulty scores for all teams
       * This is a deterministic calculation based on FPL API data
       * 
       * Results are stored as a single JSONB entry containing all team difficulty scores:
       * [
       *   { teamId: 1, nextSixGWDifficulty: 2.8 },
       *   { teamId: 2, nextSixGWDifficulty: 3.5 },
       *   ...
       * ]
       * 
       * @param context - Snapshot context with all FPL data
       * @param expiresAt - Expiration timestamp (aligned with snapshot TTL)
       */
      async precomputeFixtureDifficulty(context, expiresAt) {
        const fixtures = context.snapshot.data.fixtures;
        const teams = context.snapshot.data.teams;
        const difficultyScores = teams.map((team) => ({
          teamId: team.id,
          nextSixGWDifficulty: calculateTeamFixtureDifficulty(team, fixtures, context.gameweek)
        }));
        const precomputation = {
          snapshotId: context.snapshotId,
          gameweek: context.gameweek,
          computationType: "fixture_difficulty",
          playerId: null,
          result: difficultyScores,
          expiresAt
        };
        await storage.savePrecomputation(precomputation);
        console.log(`[Precomputation] Saved fixture difficulty for ${teams.length} teams`);
      }
      /**
       * Precompute captain shortlist based on form, fixtures, and ownership
       * Returns top 10 captain candidates with expected points range
       */
      async precomputeCaptainShortlist(context, expiresAt) {
        const players = context.snapshot.data.players;
        const teams = context.snapshot.data.teams;
        const fixtures = context.snapshot.data.fixtures;
        const premiumAttackers = players.filter(
          (p) => (p.element_type === 3 || p.element_type === 4) && p.now_cost >= 80 && p.status === "a"
          // Available only
        );
        const captainCandidates = premiumAttackers.map((player) => {
          const form = parseFloat(player.form) || 0;
          const ictIndex = parseFloat(player.ict_index) || 0;
          const ownership = parseFloat(player.selected_by_percent) || 0;
          const differentialBonus = ownership < 20 ? 5 : 0;
          const score = form * 2 + ictIndex / 10 + differentialBonus;
          return {
            playerId: player.id,
            playerName: player.web_name,
            score,
            form,
            ownership,
            isDifferential: ownership < 20
          };
        }).sort((a, b) => b.score - a.score).slice(0, 10);
        await storage.savePrecomputation({
          snapshotId: context.snapshotId,
          gameweek: context.gameweek,
          computationType: "captain_shortlist",
          playerId: null,
          // Not player-specific
          result: captainCandidates,
          expiresAt
        });
        console.log(`[Precomputation] Captain shortlist: ${captainCandidates.length} candidates`);
      }
      /**
       * Precompute chip timing heuristics based on fixtures and team form
       * Suggests optimal gameweeks for each chip type
       */
      async precomputeChipHeuristics(context, expiresAt) {
        const fixtures = context.snapshot.data.fixtures;
        const teams = context.snapshot.data.teams;
        const gameweek = context.gameweek;
        const chipRecommendations = {
          benchBoost: analyzeOptimalBenchBoost(fixtures, teams, gameweek),
          tripleCaptain: analyzeOptimalTripleCaptain(fixtures, teams, gameweek),
          freeHit: analyzeOptimalFreeHit(fixtures, teams, gameweek),
          wildcard: analyzeOptimalWildcard(fixtures, teams, gameweek)
        };
        await storage.savePrecomputation({
          snapshotId: context.snapshotId,
          gameweek: context.gameweek,
          computationType: "chip_heuristics",
          playerId: null,
          result: chipRecommendations,
          expiresAt
        });
        console.log(`[Precomputation] Chip heuristics computed for GW${gameweek}`);
      }
    };
    precomputationOrchestrator = new PrecomputationOrchestrator();
  }
});

// server/gameweek-data-snapshot.ts
var gameweek_data_snapshot_exports = {};
__export(gameweek_data_snapshot_exports, {
  gameweekSnapshot: () => gameweekSnapshot
});
import { createHash } from "crypto";
var GameweekDataSnapshotService, gameweekSnapshot;
var init_gameweek_data_snapshot = __esm({
  "server/gameweek-data-snapshot.ts"() {
    "use strict";
    init_fpl_api();
    init_understat_api();
    init_precomputation_orchestrator();
    GameweekDataSnapshotService = class {
      cache = /* @__PURE__ */ new Map();
      CACHE_DURATION = 5 * 60 * 1e3;
      // 5 minutes - matches FPL API cache
      /**
       * Generate a unique snapshot ID from gameweek and timestamp
       * Format: sha256 hash of "gw{gameweek}-ts{timestamp}"
       * Example: "gw10-ts1698764800000" -> "a3b2c1d4e5f6..."
       */
      generateSnapshotId(gameweek, timestamp2) {
        const input = `gw${gameweek}-ts${timestamp2}`;
        return createHash("sha256").update(input).digest("hex").substring(0, 16);
      }
      /**
       * Get a complete snapshot of all data for a gameweek
       * 
       * @param gameweek - The gameweek number to fetch data for
       * @param enrichWithUnderstat - Whether to enrich premium players with Understat data (default: true)
       * @param forceRefresh - Bypass cache and fetch fresh data (default: false)
       * 
       * @returns Complete gameweek snapshot with all FPL and Understat data
       * 
       * @example
       * // Normal usage - uses cache if available and fresh
       * const snapshot = await gameweekSnapshot.getSnapshot(10);
       * 
       * @example
       * // Force refresh - bypasses cache (use after deadline or injury news)
       * const snapshot = await gameweekSnapshot.getSnapshot(10, true, true);
       */
      async getSnapshot(gameweek, enrichWithUnderstat = true, forceRefresh = false) {
        const cached = this.cache.get(gameweek);
        const now = Date.now();
        if (!forceRefresh && cached && now - cached.timestamp < this.CACHE_DURATION) {
          const cacheAge = Math.round((now - cached.timestamp) / 1e3);
          console.log(`[Snapshot] \u{1F3AF} CACHE HIT for GW${gameweek} (age: ${cacheAge}s, TTL: ${this.CACHE_DURATION / 1e3}s)`);
          return cached;
        }
        if (forceRefresh) {
          console.log(`[Snapshot] \u{1F504} FORCED REFRESH for GW${gameweek} (cache bypassed)`);
        } else if (cached) {
          const cacheAge = Math.round((now - cached.timestamp) / 1e3);
          console.log(`[Snapshot] \u23F0 CACHE EXPIRED for GW${gameweek} (age: ${cacheAge}s, TTL: ${this.CACHE_DURATION / 1e3}s)`);
        } else {
          console.log(`[Snapshot] \u{1F195} CACHE MISS for GW${gameweek} (no cached data)`);
        }
        const [players, teams, fixtures, gameweeks, element_types] = await Promise.all([
          fplApi.getPlayers(),
          fplApi.getTeams(),
          fplApi.getFixtures(),
          fplApi.getGameweeks(),
          fplApi.getPositionTypes()
        ]);
        const currentGameweek = gameweeks.find((gw) => gw.is_current);
        const nextGameweek = gameweeks.find((gw) => gw.is_next);
        let enrichedPlayers = players;
        if (enrichWithUnderstat) {
          enrichedPlayers = await this.enrichPlayersWithUnderstat(players);
        }
        const snapshot = {
          snapshotId: this.generateSnapshotId(gameweek, now),
          gameweek,
          timestamp: now,
          data: {
            players: enrichedPlayers,
            teams,
            fixtures,
            gameweeks,
            currentGameweek,
            nextGameweek,
            element_types
          }
        };
        this.cache.set(gameweek, snapshot);
        console.log(`[Snapshot] Cached fresh data for GW${gameweek} with ${enrichedPlayers.length} players`);
        const snapshotContext2 = {
          snapshotId: snapshot.snapshotId,
          gameweek: snapshot.gameweek,
          timestamp: snapshot.timestamp,
          enriched: enrichWithUnderstat,
          snapshot
        };
        precomputationOrchestrator.onSnapshotReady(snapshotContext2).catch((err) => {
          console.error("[Snapshot] Precomputation failed:", err);
        });
        return snapshot;
      }
      /**
       * Enrich players with Understat data (only for premium players to reduce API calls)
       */
      async enrichPlayersWithUnderstat(players) {
        const premiumPlayers = players.filter((p) => p.now_cost >= 70);
        console.log(`[Snapshot] Enriching ${premiumPlayers.length} premium players with Understat data`);
        const enrichedMap = /* @__PURE__ */ new Map();
        const batchSize = 10;
        for (let i = 0; i < premiumPlayers.length; i += batchSize) {
          const batch = premiumPlayers.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (player) => {
              try {
                const understatData = await understatService.enrichPlayerData(
                  player.web_name,
                  "2024"
                );
                enrichedMap.set(player.id, understatData);
              } catch (error) {
                console.warn(`[Snapshot] Failed to enrich ${player.web_name}:`, error instanceof Error ? error.message : "Unknown error");
                enrichedMap.set(player.id, null);
              }
            })
          );
          if (i + batchSize < premiumPlayers.length) {
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
        }
        return players.map((player) => ({
          ...player,
          understat: enrichedMap.get(player.id) || null
        }));
      }
      /**
       * Get the current/next editable gameweek snapshot (planning gameweek)
       * 
       * @param enrichWithUnderstat - Whether to enrich premium players with Understat data (default: true)
       * @param forceRefresh - Bypass cache and fetch fresh data (default: false)
       * 
       * @returns Snapshot for the currently editable gameweek
       */
      async getPlanningSnapshot(enrichWithUnderstat = true, forceRefresh = false) {
        const planningGameweek = await fplApi.getPlanningGameweek();
        if (!planningGameweek) {
          throw new Error("No planning gameweek available");
        }
        return this.getSnapshot(planningGameweek.id, enrichWithUnderstat, forceRefresh);
      }
      /**
       * Clear cache for a specific gameweek (useful for testing or forcing refresh)
       * 
       * @param gameweek - Optional gameweek number. If not provided, clears all cache
       * 
       * @example
       * // Clear cache for a specific gameweek
       * gameweekSnapshot.clearCache(10);
       * 
       * @example
       * // Clear all cache
       * gameweekSnapshot.clearCache();
       */
      clearCache(gameweek) {
        if (gameweek) {
          this.cache.delete(gameweek);
          console.log(`[Snapshot] \u{1F5D1}\uFE0F  Cleared cache for GW${gameweek}`);
        } else {
          this.cache.clear();
          console.log(`[Snapshot] \u{1F5D1}\uFE0F  Cleared all snapshot cache`);
        }
      }
      /**
       * Get the age (in seconds) of cached data for a specific gameweek
       * Returns null if no cached data exists for that gameweek
       * 
       * @param gameweek - The gameweek number to check
       * @returns Age in seconds, or null if not cached
       * 
       * @example
       * const age = gameweekSnapshot.getCacheAge(10);
       * if (age !== null && age > 240) {
       *   console.log('Cache is older than 4 minutes, consider refreshing');
       * }
       */
      getCacheAge(gameweek) {
        const cached = this.cache.get(gameweek);
        if (!cached) {
          return null;
        }
        const now = Date.now();
        return Math.round((now - cached.timestamp) / 1e3);
      }
      /**
       * Get cache status for all cached gameweeks (for debugging and monitoring)
       * 
       * @returns Array of gameweek numbers with their cache age in seconds
       * 
       * @example
       * const status = gameweekSnapshot.getCacheStatus();
       * console.log('Cached gameweeks:', status);
       * // Output: [{ gameweek: 10, age: 45, isStale: false }, { gameweek: 9, age: 310, isStale: true }]
       */
      getCacheStatus() {
        const now = Date.now();
        return Array.from(this.cache.entries()).map(([gameweek, snapshot]) => {
          const age = Math.round((now - snapshot.timestamp) / 1e3);
          return {
            gameweek,
            age,
            isStale: now - snapshot.timestamp >= this.CACHE_DURATION
          };
        });
      }
    };
    gameweekSnapshot = new GameweekDataSnapshotService();
  }
});

// server/gameweek-plan-hydrator.ts
var gameweek_plan_hydrator_exports = {};
__export(gameweek_plan_hydrator_exports, {
  GameweekPlanHydrator: () => GameweekPlanHydrator,
  gameweekPlanHydrator: () => gameweekPlanHydrator
});
var GameweekPlanHydrator, gameweekPlanHydrator;
var init_gameweek_plan_hydrator = __esm({
  "server/gameweek-plan-hydrator.ts"() {
    "use strict";
    GameweekPlanHydrator = class {
      /**
       * Hydrate a gameweek plan with player names and calculated fields
       * @param rawPlan - The raw plan from database
       * @param players - Array of FPL players (from snapshot)
       */
      async hydratePlan(rawPlan, players) {
        const playerMap = new Map(players.map((p) => [p.id, p]));
        const enrichedTransfers = rawPlan.transfers.map((transfer) => ({
          player_out_id: transfer.player_out_id,
          player_out_name: playerMap.get(transfer.player_out_id)?.web_name || `Player ${transfer.player_out_id}`,
          player_in_id: transfer.player_in_id,
          player_in_name: playerMap.get(transfer.player_in_id)?.web_name || `Player ${transfer.player_in_id}`,
          expected_points_gain: transfer.expected_points_gain,
          reasoning: transfer.reasoning,
          priority: transfer.priority,
          cost_impact: transfer.cost_impact
        }));
        const lineupOptimizations = rawPlan.lineupOptimizations || [];
        const numTransfers = rawPlan.transfers.length;
        const freeTransfers = 1;
        const transfersCost = Math.max(0, (numTransfers - freeTransfers) * 4);
        return {
          ...rawPlan,
          transfers: enrichedTransfers,
          lineupOptimizations,
          captainName: rawPlan.captainId ? playerMap.get(rawPlan.captainId)?.web_name : void 0,
          viceCaptainName: rawPlan.viceCaptainId ? playerMap.get(rawPlan.viceCaptainId)?.web_name : void 0,
          freeTransfers,
          transfersCost
        };
      }
      /**
       * Hydrate multiple gameweek plans with player names and calculated fields
       * @param rawPlans - Array of raw plans from database
       * @param players - Array of FPL players (from snapshot)
       */
      async hydratePlans(rawPlans, players) {
        return Promise.all(rawPlans.map((plan) => this.hydratePlan(plan, players)));
      }
    };
    gameweekPlanHydrator = new GameweekPlanHydrator();
  }
});

// server/index.ts
import express2 from "express";

// server/routes.ts
init_storage();
init_fpl_api();
import { createServer } from "http";

// server/ai-predictions.ts
init_storage();
init_understat_api();
import OpenAI from "openai";

// server/snapshot-context.ts
init_gameweek_data_snapshot();
var SnapshotContextManager = class {
  /**
   * Get a complete snapshot context for AI operations
   * 
   * This is the primary interface AI services should use to ensure they're
   * all operating on the same snapshot with consistent metadata.
   * 
   * @param gameweek - The gameweek number to fetch data for
   * @param enrichWithUnderstat - Whether to enrich premium players with Understat data (default: true)
   * @param forceRefresh - Bypass cache and fetch fresh data (default: false)
   * 
   * @returns Complete snapshot context with metadata
   * 
   * @example
   * // Get context for AI predictions
   * const context = await snapshotContext.getContext(10);
   * const predictions = await aiService.predict(context);
   * 
   * @example
   * // Force refresh for critical updates (e.g., injury news)
   * const context = await snapshotContext.getContext(10, true, true);
   */
  async getContext(gameweek, enrichWithUnderstat = true, forceRefresh = false) {
    const snapshot = await gameweekSnapshot.getSnapshot(
      gameweek,
      enrichWithUnderstat,
      forceRefresh
    );
    return {
      snapshotId: snapshot.snapshotId,
      gameweek: snapshot.gameweek,
      timestamp: snapshot.timestamp,
      enriched: enrichWithUnderstat,
      snapshot
    };
  }
  /**
   * Check if two snapshot IDs match
   * 
   * Used for validation that all AI outputs reference the same snapshot.
   * This ensures consistency across multiple AI operations (predictions,
   * transfers, captains, etc.) that should all use the same data.
   * 
   * @param snapshotId1 - First snapshot ID to compare
   * @param snapshotId2 - Second snapshot ID to compare
   * @returns True if snapshot IDs match, false otherwise
   * 
   * @example
   * // Validate predictions and transfers use the same snapshot
   * const predictionsContext = await snapshotContext.getContext(10);
   * const transfersContext = await snapshotContext.getContext(10);
   * 
   * const isValid = snapshotContext.validateSnapshotMatch(
   *   predictionsContext.snapshotId,
   *   transfersContext.snapshotId
   * );
   * 
   * if (!isValid) {
   *   throw new Error('AI outputs use different snapshots!');
   * }
   */
  validateSnapshotMatch(snapshotId1, snapshotId2) {
    return snapshotId1 === snapshotId2;
  }
};
var snapshotContext = new SnapshotContextManager();

// server/decision-logger.ts
init_storage();
import { createHash as createHash2 } from "crypto";
var DecisionLogger = class {
  /**
   * Log a gameweek plan decision
   * 
   * Records a complete gameweek plan including team selection, captain,
   * transfers, and chip usage decisions.
   * 
   * @param userId - The user ID for this decision
   * @param planId - The gameweek plan ID
   * @param context - Snapshot context containing gameweek and snapshot ID
   * @param inputs - Input data used to generate the plan (for replay)
   * @param plan - The generated gameweek plan
   * @param confidence - AI confidence score (0-100)
   * @param uncertaintyReasons - Array of reasons for uncertainty
   */
  async logGameweekPlan(userId, planId, context, inputs, plan, confidence, uncertaintyReasons) {
    const entry = {
      userId,
      planId,
      snapshotId: context.snapshotId,
      gameweek: context.gameweek,
      decisionType: "gameweek_plan",
      inputsFingerprint: this.hashInputs(inputs),
      modelVersion: "gpt-4o",
      confidence,
      uncertaintyReasons,
      decisionData: plan
    };
    await this.log(entry);
    console.log(`[DecisionLogger] Logged gameweek plan for user ${userId}, GW${context.gameweek}, confidence: ${confidence || "N/A"}`);
  }
  /**
   * Log a captain recommendation decision
   * 
   * Records the AI's captain choice with reasoning and confidence.
   * 
   * @param userId - The user ID for this decision
   * @param planId - Optional gameweek plan ID if part of a larger plan
   * @param context - Snapshot context containing gameweek and snapshot ID
   * @param inputs - Input data used to generate the recommendation (for replay)
   * @param captain - The captain recommendation data
   * @param confidence - AI confidence score (0-100)
   */
  async logCaptainDecision(userId, planId, context, inputs, captain, confidence) {
    const entry = {
      userId,
      planId,
      snapshotId: context.snapshotId,
      gameweek: context.gameweek,
      decisionType: "captain",
      inputsFingerprint: this.hashInputs(inputs),
      modelVersion: "gpt-4o",
      confidence,
      decisionData: captain
    };
    await this.log(entry);
    console.log(`[DecisionLogger] Logged captain decision for user ${userId}, GW${context.gameweek}`);
  }
  /**
   * Log a transfer recommendation decision
   * 
   * Records transfer recommendations with expected points gain and reasoning.
   * 
   * @param userId - The user ID for this decision
   * @param context - Snapshot context containing gameweek and snapshot ID
   * @param inputs - Input data used to generate the transfers (for replay)
   * @param transfers - Array of transfer recommendations
   * @param confidence - AI confidence score (0-100)
   */
  async logTransferDecision(userId, context, inputs, transfers2, confidence) {
    const entry = {
      userId,
      snapshotId: context.snapshotId,
      gameweek: context.gameweek,
      decisionType: "transfer",
      inputsFingerprint: this.hashInputs(inputs),
      modelVersion: "gpt-4o",
      confidence,
      decisionData: transfers2
    };
    await this.log(entry);
    console.log(`[DecisionLogger] Logged ${transfers2.length} transfer(s) for user ${userId}, GW${context.gameweek}`);
  }
  /**
   * Log a chip strategy decision
   * 
   * Records chip usage recommendations with timing and expected value.
   * 
   * @param userId - The user ID for this decision
   * @param planId - Optional gameweek plan ID if part of a larger plan
   * @param context - Snapshot context containing gameweek and snapshot ID
   * @param inputs - Input data used to generate the strategy (for replay)
   * @param chipStrategy - The chip strategy recommendation
   * @param confidence - AI confidence score (0-100)
   */
  async logChipDecision(userId, planId, context, inputs, chipStrategy, confidence) {
    const entry = {
      userId,
      planId,
      snapshotId: context.snapshotId,
      gameweek: context.gameweek,
      decisionType: "chip",
      inputsFingerprint: this.hashInputs(inputs),
      modelVersion: "gpt-4o",
      confidence,
      decisionData: chipStrategy
    };
    await this.log(entry);
    console.log(`[DecisionLogger] Logged chip strategy for user ${userId}, GW${context.gameweek}`);
  }
  /**
   * Hash inputs to create a fingerprint for replay
   * 
   * Creates a SHA-256 hash of the input data to enable decision replay.
   * If the same inputs are provided again, we should get the same decision.
   * 
   * @param inputs - The input data to hash
   * @returns A 16-character hex string fingerprint
   * 
   * @private
   */
  hashInputs(inputs) {
    const inputStr = JSON.stringify(inputs);
    return createHash2("sha256").update(inputStr).digest("hex").substring(0, 16);
  }
  /**
   * Persist decision log entry to database
   * 
   * Saves the decision entry to the aiDecisionLedger table via storage layer.
   * 
   * @param entry - The decision log entry to persist
   * 
   * @private
   */
  async log(entry) {
    await storage.saveDecisionLog(entry);
  }
};
var decisionLogger = new DecisionLogger();

// server/ai-predictions.ts
var openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});
var AIPredictionService = class {
  async predictPlayerPoints(context) {
    const position = context.player.element_type === 1 ? "GK" : context.player.element_type === 2 ? "DEF" : context.player.element_type === 3 ? "MID" : "FWD";
    const isDefensive = position === "GK" || position === "DEF";
    const prompt = `
You are an expert Fantasy Premier League analyst. Predict the expected points for the following player:

Player: ${context.player.web_name}
Position: ${position}
Current Form: ${context.player.form}
Points Per Game: ${context.player.points_per_game}
Total Points: ${context.player.total_points}

ATTACKING METRICS:
- Expected Goals (xG): ${context.player.expected_goals}
- Expected Assists (xA): ${context.player.expected_assists}
- Actual Goals: ${context.player.goals_scored} | Actual Assists: ${context.player.assists}
- Expected Goal Involvements: ${context.player.expected_goal_involvements}

${isDefensive ? `DEFENSIVE METRICS:
- Clean Sheets: ${context.player.clean_sheets}
- Expected Goals Conceded: ${context.player.expected_goals_conceded}
${position === "GK" ? `- Saves: ${context.player.saves}` : ""}` : ""}

ICT INDEX (Influence/Creativity/Threat):
- Overall ICT: ${context.player.ict_index}
- Influence: ${context.player.influence}
- Creativity: ${context.player.creativity}
- Threat: ${context.player.threat}

BONUS POINTS SYSTEM:
- Total Bonus: ${context.player.bonus}
- BPS Score: ${context.player.bps}

AVAILABILITY:
- Minutes Played: ${context.player.minutes}
- Status: ${context.player.status} (a=available, d=doubtful, i=injured, u=unavailable, s=suspended)
- Chance of Playing: ${context.player.chance_of_playing_this_round !== null ? context.player.chance_of_playing_this_round + "%" : "Unknown"}
- News: ${context.player.news || "None"}
- Yellow Cards: ${context.player.yellow_cards} | Red Cards: ${context.player.red_cards}

Upcoming Fixtures (next 3):
${context.upcomingFixtures.slice(0, 3).map((f, i) => `${i + 1}. Difficulty: ${f.team_h_difficulty || f.team_a_difficulty}`).join("\n")}

CRITICAL RULES FOR INJURY/AVAILABILITY:
1. If Status is 'i' (injured), 'u' (unavailable), or 's' (suspended) \u2192 predicted_points MUST be 0
2. If Chance of Playing is 0% or null and News mentions injury/suspension \u2192 predicted_points MUST be 0
3. If Chance of Playing is < 25% \u2192 predicted_points should be heavily discounted (max 2 pts)
4. Only predict meaningful points if Status = 'a' (available) OR Chance of Playing \u2265 75%

Based on AVAILABILITY FIRST, then form, fixtures, underlying stats, ICT metrics, and bonus potential, provide a prediction in JSON format:
{
  "predicted_points": <number>,
  "confidence": <0-100>,
  "reasoning": "<brief explanation>",
  "fixtures_considered": [<fixture_ids>]
}
`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 4e3,
      temperature: 0,
      // Deterministic predictions for consistency
      seed: 42
      // Perfect reproducibility for same inputs
    });
    let result;
    try {
      result = JSON.parse(response.choices[0].message.content || "{}");
    } catch (error) {
      console.error("Failed to parse AI response for player points prediction:", error);
      result = {};
    }
    let predictedPoints = result.predicted_points || 0;
    let reasoning = result.reasoning || "Analysis based on current form and fixtures";
    const isDefinitelyOut = context.player.status === "i" || context.player.status === "u" || context.player.status === "s" || context.player.chance_of_playing_this_round === 0;
    if (isDefinitelyOut && predictedPoints > 0) {
      console.warn(`[AI Override] ${context.player.web_name} predicted ${predictedPoints} pts but status=${context.player.status}, forcing to 0`);
      predictedPoints = 0;
      reasoning = `Player unavailable (${context.player.status === "i" ? "injured" : context.player.status === "u" ? "unavailable" : "suspended"}). ${context.player.news || "No additional news"}`;
    }
    const prediction = {
      player_id: context.player.id,
      predicted_points: predictedPoints,
      confidence: result.confidence || 50,
      reasoning,
      fixtures_considered: result.fixtures_considered || context.upcomingFixtures.slice(0, 3).map((f) => f.id)
    };
    if (context.userId && context.gameweek) {
      try {
        await storage.upsertPrediction({
          userId: context.userId,
          gameweek: context.gameweek,
          playerId: context.player.id,
          predictedPoints: prediction.predicted_points,
          actualPoints: null,
          confidence: prediction.confidence,
          snapshotId: context.snapshotId
        });
        if (context.snapshotId) {
          console.log(`[Prediction] Saved prediction for player ${context.player.id} with snapshot ${context.snapshotId}`);
        }
      } catch (error) {
        console.error("Error saving prediction to database:", error);
      }
    }
    return prediction;
  }
  async getTransferRecommendations(currentPlayers, allPlayers, fixtures, budget, userId, gameweek) {
    const context = await snapshotContext.getContext(gameweek || 1, false);
    const teams = context.snapshot.data.teams;
    console.log(`[Transfers] Using snapshot ${context.snapshotId} from ${new Date(context.timestamp).toISOString()}`);
    const squadAnalysis = currentPlayers.map((p) => {
      const team = teams.find((t) => t.id === p.team);
      const upcomingFixtures = fixtures.filter((f) => !f.finished && f.event && f.event >= (gameweek || 1) && (f.team_h === p.team || f.team_a === p.team)).slice(0, 3).map((f) => {
        const isHome = f.team_h === p.team;
        const opponent = teams.find((t) => t.id === (isHome ? f.team_a : f.team_h));
        const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
        return `${isHome ? "H" : "A"} vs ${opponent?.short_name} (Diff: ${difficulty})`;
      });
      return {
        id: p.id,
        name: p.web_name,
        team: team?.short_name || "Unknown",
        position: p.element_type === 1 ? "GK" : p.element_type === 2 ? "DEF" : p.element_type === 3 ? "MID" : "FWD",
        form: parseFloat(p.form),
        ppg: parseFloat(p.points_per_game),
        price: p.now_cost / 10,
        fixtures: upcomingFixtures.join(", ") || "No upcoming fixtures",
        status: p.status,
        chanceOfPlaying: p.chance_of_playing_this_round,
        news: p.news || "None",
        yellowCards: p.yellow_cards,
        ict: parseFloat(p.ict_index || "0"),
        bps: p.bps
      };
    });
    const potentialTargets = allPlayers.filter(
      (p) => !currentPlayers.some((cp) => cp.id === p.id) && // Not already in squad
      parseFloat(p.form) > 4 && // Good form
      p.status !== "i" && // Not injured
      p.status !== "u" && // Not unavailable
      p.status !== "s" && // Not suspended
      p.chance_of_playing_this_round !== 0
      // Has chance of playing
    ).slice(0, 20).map((p) => {
      const team = teams.find((t) => t.id === p.team);
      const upcomingFixtures = fixtures.filter((f) => !f.finished && f.event && f.event >= (gameweek || 1) && (f.team_h === p.team || f.team_a === p.team)).slice(0, 3).map((f) => {
        const isHome = f.team_h === p.team;
        const opponent = teams.find((t) => t.id === (isHome ? f.team_a : f.team_h));
        const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
        return `${isHome ? "H" : "A"} vs ${opponent?.short_name} (Diff: ${difficulty})`;
      });
      return {
        id: p.id,
        name: p.web_name,
        team: team?.short_name || "Unknown",
        position: p.element_type === 1 ? "GK" : p.element_type === 2 ? "DEF" : p.element_type === 3 ? "MID" : "FWD",
        form: parseFloat(p.form),
        ppg: parseFloat(p.points_per_game),
        price: p.now_cost / 10,
        fixtures: upcomingFixtures.join(", ") || "No upcoming fixtures",
        ict: parseFloat(p.ict_index || "0"),
        xGI: parseFloat(p.expected_goal_involvements || "0"),
        status: p.status
      };
    });
    const prompt = `You are an expert FPL transfer analyst. Analyze the current squad and recommend the top 3 transfer moves.

CURRENT SQUAD:
${squadAnalysis.map((p) => `
${p.name} (${p.position}) - ${p.team}
- Form: ${p.form.toFixed(1)} | PPG: ${p.ppg} | Price: \xA3${p.price}m
- ICT Index: ${p.ict.toFixed(1)} | BPS: ${p.bps}
- Status: ${p.status}${p.chanceOfPlaying !== null ? ` (${p.chanceOfPlaying}% chance)` : ""}
- News: ${p.news}
- Cards: ${p.yellowCards} yellow
- Fixtures: ${p.fixtures}
`).join("\n")}

BUDGET AVAILABLE: \xA3${budget.toFixed(1)}m

TOP TARGETS IN FORM:
${potentialTargets.slice(0, 10).map((p) => `
${p.name} (${p.position}) - ${p.team}
- Form: ${p.form.toFixed(1)} | PPG: ${p.ppg} | Price: \xA3${p.price}m
- ICT Index: ${p.ict.toFixed(1)} | xGI: ${p.xGI.toFixed(2)}
- Status: ${p.status}
- Fixtures: ${p.fixtures}
`).join("\n")}

TRANSFER STRATEGY:
1. Identify underperforming players (low PPG/form), injury concerns, or difficult fixtures
2. Consider suspension risk (players on 4 yellows)
3. Find in-form replacements with high ICT index and favorable upcoming fixtures
4. Ensure affordability within the budget
5. Prioritize consistency (PPG) and expected goal involvements (xGI)

Provide exactly 3 transfer recommendations in this JSON format:
{
  "recommendations": [
    {
      "player_out_id": <id to transfer out>,
      "player_in_id": <id to bring in>,
      "expected_points_gain": <expected additional points over next 3 GWs>,
      "reasoning": "<brief explanation focusing on consistency, fixtures, injuries, and ICT metrics>",
      "priority": "high|medium|low",
      "cost_impact": <price difference (positive = money saved, negative = money spent)>
    }
  ]
}`;
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 4e3,
        temperature: 0,
        // Deterministic predictions for consistency
        seed: 42
        // Perfect reproducibility for same inputs
      });
      const result = JSON.parse(response.choices[0].message.content || '{ "recommendations": [] }');
      console.log("[AI] Transfer recommendations result:", JSON.stringify(result, null, 2));
      const recommendations = Array.isArray(result.recommendations) ? result.recommendations : [];
      if (userId && gameweek && recommendations.length > 0) {
        for (const rec of recommendations) {
          try {
            const playerIn = allPlayers.find((p) => p.id === rec.player_in_id);
            if (playerIn) {
              const upcomingFixtures = fixtures.filter((f) => f.event && f.event >= gameweek).slice(0, 3);
              const prediction = await this.predictPlayerPoints({
                player: playerIn,
                upcomingFixtures,
                userId,
                gameweek,
                snapshotId: context.snapshotId
              });
              await storage.upsertPrediction({
                userId,
                gameweek,
                playerId: rec.player_in_id,
                predictedPoints: prediction.predicted_points,
                actualPoints: null,
                confidence: rec.priority === "high" ? 80 : rec.priority === "medium" ? 60 : 40,
                snapshotId: context.snapshotId
              });
              console.log(`[Transfers] Saved transfer recommendation prediction for player ${rec.player_in_id} with snapshot ${context.snapshotId}`);
            }
          } catch (error) {
            console.error(`Error saving transfer recommendation prediction for player ${rec.player_in_id}:`, error);
          }
        }
      }
      if (recommendations.length > 0 && userId && gameweek) {
        await decisionLogger.logTransferDecision(
          userId,
          context,
          { currentPlayers, allPlayers, fixtures, budget, gameweek },
          recommendations,
          void 0
          // No overall confidence for transfer lists
        );
      }
      return recommendations;
    } catch (error) {
      console.error("Error in transfer recommendations:", error);
      return [];
    }
  }
  async getCaptainRecommendations(players, fixtures, userId, gameweek) {
    const context = await snapshotContext.getContext(gameweek || 1, false);
    const teams = context.snapshot.data.teams;
    console.log(`[Captain] Using snapshot ${context.snapshotId} from ${new Date(context.timestamp).toISOString()}`);
    const topPlayers = players.filter(
      (p) => parseFloat(p.form) > 3 && p.total_points > 20 && p.status !== "i" && // Not injured
      p.status !== "u" && // Not unavailable  
      p.status !== "s" && // Not suspended
      p.chance_of_playing_this_round !== 0
      // Has chance of playing
    ).slice(0, 15).map((p) => {
      const team = teams.find((t) => t.id === p.team);
      const nextFixture = fixtures.find(
        (f) => !f.finished && f.event === gameweek && (f.team_h === p.team || f.team_a === p.team)
      );
      let fixtureInfo = "No fixture";
      if (nextFixture) {
        const isHome = nextFixture.team_h === p.team;
        const opponent = teams.find((t) => t.id === (isHome ? nextFixture.team_a : nextFixture.team_h));
        const difficulty = isHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;
        fixtureInfo = `${isHome ? "H" : "A"} vs ${opponent?.short_name} (Diff: ${difficulty})`;
      }
      return {
        id: p.id,
        name: p.web_name,
        team: team?.short_name || "Unknown",
        form: parseFloat(p.form),
        ppg: parseFloat(p.points_per_game),
        totalPoints: p.total_points,
        ownership: parseFloat(p.selected_by_percent),
        expectedGoals: parseFloat(p.expected_goals || "0"),
        expectedAssists: parseFloat(p.expected_assists || "0"),
        ict: parseFloat(p.ict_index || "0"),
        influence: parseFloat(p.influence || "0"),
        creativity: parseFloat(p.creativity || "0"),
        threat: parseFloat(p.threat || "0"),
        bps: p.bps,
        bonus: p.bonus,
        fixture: fixtureInfo
      };
    });
    const prompt = `You are an expert Fantasy Premier League captain analyst. Analyze these players and recommend the top 3 captain choices for gameweek ${gameweek || "upcoming"}.

CANDIDATES:
${topPlayers.map((p) => `
${p.name} (${p.team})
- Form: ${p.form.toFixed(1)} | PPG: ${p.ppg} | Total Points: ${p.totalPoints}
- Fixture: ${p.fixture}
- Ownership: ${p.ownership.toFixed(1)}% ${p.ownership < 20 ? "(DIFFERENTIAL)" : "(TEMPLATE)"}
- xG: ${p.expectedGoals.toFixed(2)} | xA: ${p.expectedAssists.toFixed(2)}
- ICT Index: ${p.ict.toFixed(1)} (I: ${p.influence.toFixed(1)}, C: ${p.creativity.toFixed(1)}, T: ${p.threat.toFixed(1)})
- BPS: ${p.bps} | Total Bonus: ${p.bonus}
`).join("\n")}

ANALYSIS CRITERIA:
1. Fixture difficulty and home/away advantage
2. Current form (PPG) and recent performances
3. Expected goals/assists (xG/xA) and goal involvement potential
4. ICT Index - high Threat/Creativity = higher ceiling
5. BPS potential - high BPS players often get bonus points (3/2/1 pts)
6. Ownership % - consider differentials (<20%) vs safe picks for rank climbing
7. Consistency vs ceiling - PPG shows consistency, ICT shows upside

Provide exactly 3 captain recommendations in this JSON format:
{
  "recommendations": [
    {
      "player_id": <id>,
      "expected_points": <realistic points estimate>,
      "confidence": <0-100>,
      "reasoning": "<concise explanation focusing on fixtures, form, BPS potential, and ownership strategy>",
      "differential": <true if ownership < 20%, false otherwise>,
      "ownership_percent": <ownership %>
    }
  ]
}`;
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 4e3,
        temperature: 0,
        // Deterministic predictions for consistency
        seed: 42
        // Perfect reproducibility for same inputs
      });
      const result = JSON.parse(response.choices[0].message.content || '{ "recommendations": [] }');
      console.log("[AI] Captain recommendations result:", JSON.stringify(result, null, 2));
      const recommendations = Array.isArray(result.recommendations) ? result.recommendations : [];
      if (userId && gameweek && recommendations.length > 0) {
        for (const rec of recommendations) {
          try {
            await storage.upsertPrediction({
              userId,
              gameweek,
              playerId: rec.player_id,
              predictedPoints: Math.round(rec.expected_points),
              actualPoints: null,
              confidence: rec.confidence,
              snapshotId: context.snapshotId
            });
            console.log(`[Captain] Saved captain recommendation prediction for player ${rec.player_id} with snapshot ${context.snapshotId}`);
          } catch (error) {
            console.error(`Error saving captain recommendation prediction for player ${rec.player_id}:`, error);
          }
        }
      }
      if (recommendations.length > 0 && userId && gameweek) {
        const topRecommendation = recommendations[0];
        await decisionLogger.logCaptainDecision(
          userId,
          void 0,
          // No planId for standalone captain calls
          context,
          { players, fixtures, gameweek },
          topRecommendation,
          topRecommendation.confidence
        );
      }
      return recommendations;
    } catch (error) {
      console.error("Error in captain recommendations:", error);
      return [];
    }
  }
  async getChipStrategy(currentGameweek, remainingChips) {
    const prompt = `
You are a Fantasy Premier League chip strategy expert. Recommend when to use the following chips for maximum value:

Current Gameweek: ${currentGameweek}
Remaining Chips: ${remainingChips.join(", ")}

Chips Available:
- Wildcard: Unlimited free transfers for one GW
- Triple Captain: Captain scores 3x instead of 2x
- Bench Boost: All 15 players score points
- Free Hit: Unlimited transfers for one GW, team reverts after

Consider:
1. Double gameweeks (typically GW24, GW37)
2. Blank gameweeks (fewer teams playing)
3. Fixture swings
4. Team value and planning time

Provide chip strategy in JSON format:
{
  "strategies": [
    {
      "chip_name": "wildcard|freehit|benchboost|triplecaptain",
      "recommended_gameweek": <number>,
      "reasoning": "<explanation>",
      "expected_value": <number>,
      "confidence": <0-100>
    }
  ]
}
`;
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1e3,
      temperature: 0,
      // Deterministic predictions for consistency
      seed: 42
      // Perfect reproducibility for same inputs
    });
    let result;
    try {
      result = JSON.parse(response.choices[0].message.content || '{ "strategies": [] }');
    } catch (error) {
      console.error("Failed to parse AI response for chip strategy:", error);
      result = { strategies: [] };
    }
    return result.strategies || [];
  }
  async analyzeTeamCompositionStream(players, formation, onChunk) {
    const { fplApi: fplApi2 } = await Promise.resolve().then(() => (init_fpl_api(), fpl_api_exports));
    const fixtures = await fplApi2.getFixtures();
    const teams = await fplApi2.getTeams();
    const understatDataPromises = players.map(
      (p) => understatService.enrichPlayerData(p.web_name).catch(() => null)
    );
    const understatDataResults = await Promise.all(understatDataPromises);
    const playerDetails = players.map((p, index2) => {
      const team = teams.find((t) => t.id === p.team);
      const position = p.element_type === 1 ? "GK" : p.element_type === 2 ? "DEF" : p.element_type === 3 ? "MID" : "FWD";
      const isDefensive = position === "GK" || position === "DEF";
      const upcomingFixtures = fixtures.filter((f) => !f.finished && f.event && (f.team_h === p.team || f.team_a === p.team)).slice(0, 3).map((f) => {
        const isHome = f.team_h === p.team;
        const opponent = teams.find((t) => t.id === (isHome ? f.team_a : f.team_h));
        const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
        return `${isHome ? "H" : "A"} vs ${opponent?.short_name} (Diff: ${difficulty})`;
      });
      const understatData = understatDataResults[index2];
      return {
        name: p.web_name,
        position,
        team: team?.short_name || "Unknown",
        form: parseFloat(p.form),
        ppg: parseFloat(p.points_per_game),
        totalPoints: p.total_points,
        price: p.now_cost / 10,
        upcomingFixtures,
        selectedBy: parseFloat(p.selected_by_percent),
        expectedGoals: parseFloat(p.expected_goals || "0"),
        expectedAssists: parseFloat(p.expected_assists || "0"),
        ict: parseFloat(p.ict_index || "0"),
        bps: p.bps,
        cleanSheets: isDefensive ? p.clean_sheets : void 0,
        expectedGoalsConceded: isDefensive ? parseFloat(p.expected_goals_conceded || "0") : void 0,
        // Understat advanced metrics (null if not available)
        npxG: understatData?.npxG,
        xGChain: understatData?.xGChain,
        xGBuildup: understatData?.xGBuildup
      };
    });
    const prompt = `You are an expert Fantasy Premier League analyst. Analyze this team and provide concise insights.

TEAM:
Formation: ${formation} | Value: \xA3${(players.reduce((sum, p) => sum + p.now_cost, 0) / 10).toFixed(1)}m

PLAYERS:
${playerDetails.map((p) => {
      const baseInfo = `${p.name} (${p.position}) ${p.team}: Form ${p.form.toFixed(1)} | PPG ${p.ppg} | ICT ${p.ict.toFixed(1)}`;
      const attackInfo = `xG ${p.expectedGoals.toFixed(1)} xA ${p.expectedAssists.toFixed(1)}`;
      const understatInfo = p.npxG !== void 0 && p.npxG !== null ? ` npxG ${p.npxG.toFixed(1)} xGChain ${p.xGChain?.toFixed(1)} xGBuild ${p.xGBuildup?.toFixed(1)}` : "";
      const defenseInfo = p.cleanSheets !== void 0 ? `CS ${p.cleanSheets} xGC ${p.expectedGoalsConceded?.toFixed(1)}` : "";
      const fixtureInfo = p.upcomingFixtures[0] || "No fixtures";
      return `${baseInfo} | ${defenseInfo || attackInfo}${understatInfo} | ${fixtureInfo}`;
    }).join("\n")}

Provide 3 BRIEF insights (max 2 sentences each):
1. Team balance, formation fit, and defensive coverage
2. Best fixtures, attack threat, and top differential picks
3. Transfer priority based on PPG, ICT index, and fixture difficulty

JSON format (be concise):
{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "predicted_points": <number>,
  "confidence": <0-100>
}`;
    try {
      console.log("[AI STREAM] Starting stream for", players.length, "players");
      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 4e3,
        temperature: 0,
        // Deterministic predictions for consistency
        seed: 42,
        // Perfect reproducibility for same inputs
        stream: true
      });
      let fullContent = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullContent += content;
          onChunk(content);
        }
      }
      console.log("[AI STREAM] Complete. Full response:", fullContent);
      try {
        const result = JSON.parse(fullContent);
        onChunk("\n[DONE]");
        console.log("[AI STREAM] Parsed result:", result.predicted_points, "pts,", result.confidence, "% confidence");
      } catch (parseError) {
        console.error("[AI STREAM] Failed to parse final result:", parseError);
        onChunk("\n[ERROR]");
      }
    } catch (error) {
      console.error("[AI STREAM] Error:", error);
      onChunk("\n[ERROR]");
    }
  }
  async analyzeTeamComposition(players, formation) {
    const { fplApi: fplApi2 } = await Promise.resolve().then(() => (init_fpl_api(), fpl_api_exports));
    const fixtures = await fplApi2.getFixtures();
    const teams = await fplApi2.getTeams();
    const understatDataPromises = players.map(
      (p) => understatService.enrichPlayerData(p.web_name).catch(() => null)
    );
    const understatDataResults = await Promise.all(understatDataPromises);
    const playerDetails = players.map((p, index2) => {
      const team = teams.find((t) => t.id === p.team);
      const position = p.element_type === 1 ? "GK" : p.element_type === 2 ? "DEF" : p.element_type === 3 ? "MID" : "FWD";
      const isDefensive = position === "GK" || position === "DEF";
      const upcomingFixtures = fixtures.filter((f) => !f.finished && f.event && (f.team_h === p.team || f.team_a === p.team)).slice(0, 3).map((f) => {
        const isHome = f.team_h === p.team;
        const opponent = teams.find((t) => t.id === (isHome ? f.team_a : f.team_h));
        const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
        return `${isHome ? "H" : "A"} vs ${opponent?.short_name} (Diff: ${difficulty})`;
      });
      const understatData = understatDataResults[index2];
      return {
        name: p.web_name,
        position,
        team: team?.short_name || "Unknown",
        form: parseFloat(p.form),
        ppg: parseFloat(p.points_per_game),
        totalPoints: p.total_points,
        price: p.now_cost / 10,
        upcomingFixtures,
        selectedBy: parseFloat(p.selected_by_percent),
        expectedGoals: parseFloat(p.expected_goals || "0"),
        expectedAssists: parseFloat(p.expected_assists || "0"),
        ict: parseFloat(p.ict_index || "0"),
        bps: p.bps,
        cleanSheets: isDefensive ? p.clean_sheets : void 0,
        expectedGoalsConceded: isDefensive ? parseFloat(p.expected_goals_conceded || "0") : void 0,
        // Understat advanced metrics (null if not available)
        npxG: understatData?.npxG,
        xGChain: understatData?.xGChain,
        xGBuildup: understatData?.xGBuildup
      };
    });
    const prompt = `You are an expert Fantasy Premier League analyst. Analyze this team and provide concise insights.

TEAM:
Formation: ${formation} | Value: \xA3${(players.reduce((sum, p) => sum + p.now_cost, 0) / 10).toFixed(1)}m

PLAYERS:
${playerDetails.map((p) => {
      const baseInfo = `${p.name} (${p.position}) ${p.team}: Form ${p.form.toFixed(1)} | PPG ${p.ppg} | ICT ${p.ict.toFixed(1)}`;
      const attackInfo = `xG ${p.expectedGoals.toFixed(1)} xA ${p.expectedAssists.toFixed(1)}`;
      const understatInfo = p.npxG !== void 0 && p.npxG !== null ? ` npxG ${p.npxG.toFixed(1)} xGChain ${p.xGChain?.toFixed(1)} xGBuild ${p.xGBuildup?.toFixed(1)}` : "";
      const defenseInfo = p.cleanSheets !== void 0 ? `CS ${p.cleanSheets} xGC ${p.expectedGoalsConceded?.toFixed(1)}` : "";
      const fixtureInfo = p.upcomingFixtures[0] || "No fixtures";
      return `${baseInfo} | ${defenseInfo || attackInfo}${understatInfo} | ${fixtureInfo}`;
    }).join("\n")}

Provide 3 BRIEF insights (max 2 sentences each):
1. Team balance, formation fit, and defensive coverage
2. Best fixtures, attack threat, and top differential picks
3. Transfer priority based on PPG, ICT index, and fixture difficulty

JSON format (be concise):
{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "predicted_points": <number>,
  "confidence": <0-100>
}`;
    try {
      console.log("[AI] Analyzing team with", players.length, "players");
      console.log("[AI] Prompt:", prompt);
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 4e3,
        temperature: 0,
        // Deterministic predictions for consistency
        seed: 42
        // Perfect reproducibility for same inputs
      });
      console.log("[AI] Full response:", JSON.stringify(response, null, 2));
      console.log("[AI] Choices:", response.choices);
      console.log("[AI] First choice:", response.choices[0]);
      console.log("[AI] Message:", response.choices[0]?.message);
      const rawContent = response.choices[0]?.message?.content || "{}";
      console.log("[AI] Raw response content:", rawContent);
      const result = JSON.parse(rawContent);
      console.log("[AI] Parsed result:", JSON.stringify(result));
      console.log("[AI] Team analysis complete:", result.predicted_points, "pts,", result.confidence, "% confidence");
      return {
        insights: Array.isArray(result.insights) ? result.insights : [],
        predicted_points: typeof result.predicted_points === "number" ? result.predicted_points : 0,
        confidence: typeof result.confidence === "number" ? result.confidence : 50
      };
    } catch (error) {
      console.error("Error in team composition analysis:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      return {
        insights: ["Unable to generate AI insights at this time"],
        predicted_points: 0,
        confidence: 0
      };
    }
  }
};
var aiPredictions = new AIPredictionService();

// server/manager-sync.ts
init_fpl_api();
init_storage();
var ManagerSyncService = class {
  async syncManagerTeam(managerId, userId) {
    try {
      const currentGameweek = await fplApi.getCurrentGameweek();
      const nextGameweek = await fplApi.getNextGameweek();
      const targetGameweek = currentGameweek && !currentGameweek.finished ? currentGameweek : nextGameweek;
      if (!targetGameweek) {
        throw new Error("Unable to determine current gameweek");
      }
      const managerDetails = await fplApi.getManagerDetails(managerId);
      let picks;
      let actualGameweek = targetGameweek;
      try {
        picks = await fplApi.getManagerPicks(managerId, targetGameweek.id);
      } catch (error) {
        if (currentGameweek && targetGameweek.id !== currentGameweek.id) {
          console.log(`Picks not available for GW${targetGameweek.id}, falling back to GW${currentGameweek.id}`);
          picks = await fplApi.getManagerPicks(managerId, currentGameweek.id);
          actualGameweek = currentGameweek;
        } else {
          throw error;
        }
      }
      const allPlayers = await fplApi.getPlayers();
      const players = picks.picks.map((pick) => ({
        player_id: pick.element,
        position: pick.position,
        is_captain: pick.is_captain,
        is_vice_captain: pick.is_vice_captain
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
      const teamData = {
        userId,
        gameweek: actualGameweek.id,
        players,
        formation,
        teamValue,
        bank,
        transfersMade,
        lastDeadlineBank
      };
      await storage.saveTeam(teamData);
      if (nextGameweek && nextGameweek.id !== actualGameweek.id) {
        const planningTeamData = {
          ...teamData,
          gameweek: nextGameweek.id
        };
        await storage.saveTeam(planningTeamData);
      }
      const captainPick = picks.picks.find((p) => p.is_captain);
      const viceCaptainPick = picks.picks.find((p) => p.is_vice_captain);
      return {
        success: true,
        teamValue,
        freeTransfers,
        playerCount: players.length,
        captainId: captainPick?.element || null,
        viceCaptainId: viceCaptainPick?.element || null,
        gameweek: actualGameweek.id,
        formation,
        lastSyncTime: (/* @__PURE__ */ new Date()).toISOString()
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
        lastSyncTime: (/* @__PURE__ */ new Date()).toISOString(),
        error: error instanceof Error ? error.message : "Unknown error occurred"
      };
    }
  }
  async getManagerStatus(managerId, userId) {
    try {
      const currentGameweek = await fplApi.getCurrentGameweek();
      const nextGameweek = await fplApi.getNextGameweek();
      const targetGameweek = currentGameweek && !currentGameweek.finished ? currentGameweek : nextGameweek;
      if (!targetGameweek) {
        return null;
      }
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
      const captainPlayer = team.players.find((p) => p.is_captain);
      const viceCaptainPlayer = team.players.find((p) => p.is_vice_captain);
      return {
        success: true,
        teamValue: team.teamValue,
        freeTransfers,
        playerCount: team.players.length,
        captainId: captainPlayer?.player_id || null,
        viceCaptainId: viceCaptainPlayer?.player_id || null,
        gameweek: team.gameweek,
        formation: team.formation,
        lastSyncTime: team.updatedAt.toISOString()
      };
    } catch (error) {
      console.error("Error getting manager status:", error);
      return null;
    }
  }
  calculateFormation(picks, allPlayers) {
    const startingPicks = picks.filter((p) => p.position <= 11);
    const positionCounts = {
      def: 0,
      mid: 0,
      fwd: 0
    };
    for (const pick of startingPicks) {
      const player = allPlayers.find((p) => p.id === pick.element);
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
  calculateFreeTransfers(currentGameweek, lastDeadlineBank, eventTransfers) {
    if (currentGameweek === 1) {
      return 1;
    }
    const totalAvailable = Math.min(1 + lastDeadlineBank, 2);
    const freeTransfersAvailable = Math.max(0, totalAvailable - eventTransfers);
    return freeTransfersAvailable;
  }
};
var managerSync = new ManagerSyncService();

// server/actual-points.ts
init_fpl_api();
init_storage();
init_gameweek_data_snapshot();
var ActualPointsService = class {
  async fetchActualGameweekPoints(gameweek) {
    try {
      const liveData = await fplApi.getLiveGameweekData(gameweek);
      const pointsMap = /* @__PURE__ */ new Map();
      if (liveData.elements && Array.isArray(liveData.elements)) {
        for (const element of liveData.elements) {
          if (element.id && element.stats && typeof element.stats.total_points === "number") {
            pointsMap.set(element.id, element.stats.total_points);
          }
        }
      }
      return pointsMap;
    } catch (error) {
      console.error(`Error fetching actual points for gameweek ${gameweek}:`, error);
      return /* @__PURE__ */ new Map();
    }
  }
  async updateActualPoints(userId, gameweek) {
    const errors = [];
    let updated = 0;
    try {
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      const gameweeks = snapshot.data.gameweeks;
      const targetGameweek = gameweeks.find((gw) => gw.id === gameweek);
      if (!targetGameweek) {
        return { updated: 0, errors: ["Gameweek not found"] };
      }
      if (!targetGameweek.finished) {
        return { updated: 0, errors: ["Gameweek has not finished yet"] };
      }
      const predictionsToUpdate = await storage.getPredictionsWithoutActuals(userId, gameweek);
      if (predictionsToUpdate.length === 0) {
        return { updated: 0, errors: [] };
      }
      const actualPointsMap = await this.fetchActualGameweekPoints(gameweek);
      for (const prediction of predictionsToUpdate) {
        const actualPoints = actualPointsMap.get(prediction.playerId);
        if (actualPoints !== void 0) {
          try {
            await storage.updateActualPointsByPlayer(
              userId,
              gameweek,
              prediction.playerId,
              actualPoints
            );
            updated++;
          } catch (error) {
            errors.push(`Failed to update prediction for player ${prediction.playerId}: ${error}`);
          }
        } else {
          errors.push(`No actual points found for player ${prediction.playerId}`);
        }
      }
      return { updated, errors };
    } catch (error) {
      console.error("Error updating actual points:", error);
      return { updated, errors: [...errors, `Failed to update: ${error}`] };
    }
  }
  calculateAccuracyMetrics(predictions2) {
    const completedPredictions = predictions2.filter((p) => p.actualPoints !== null);
    const totalPredictions = predictions2.length;
    const completedCount = completedPredictions.length;
    if (completedCount === 0) {
      return {
        totalPredictions,
        completedPredictions: 0,
        averageError: null,
        rmse: null,
        mae: null,
        accuracyRate: null
      };
    }
    let sumSquaredError = 0;
    let sumAbsoluteError = 0;
    let sumError = 0;
    let withinTwoPoints = 0;
    for (const prediction of completedPredictions) {
      const predicted = prediction.predictedPoints;
      const actual = prediction.actualPoints;
      const error = predicted - actual;
      const absError = Math.abs(error);
      sumSquaredError += error * error;
      sumAbsoluteError += absError;
      sumError += error;
      if (absError <= 2) {
        withinTwoPoints++;
      }
    }
    const averageError = sumError / completedCount;
    const rmse = Math.sqrt(sumSquaredError / completedCount);
    const mae = sumAbsoluteError / completedCount;
    const accuracyRate = withinTwoPoints / completedCount * 100;
    return {
      totalPredictions,
      completedPredictions: completedCount,
      averageError: parseFloat(averageError.toFixed(2)),
      rmse: parseFloat(rmse.toFixed(2)),
      mae: parseFloat(mae.toFixed(2)),
      accuracyRate: parseFloat(accuracyRate.toFixed(2))
    };
  }
  async getPerformanceComparison(userId, gameweek) {
    try {
      const predictions2 = await storage.getPredictions(userId, gameweek);
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      const allPlayers = snapshot.data.players;
      const playersMap = new Map(allPlayers.map((p) => [p.id, p]));
      const predictionDetails = predictions2.map((p) => {
        const player = playersMap.get(p.playerId);
        const difference = p.actualPoints !== null ? p.predictedPoints - p.actualPoints : null;
        let accuracy = null;
        if (p.actualPoints !== null) {
          const error = Math.abs(p.predictedPoints - p.actualPoints);
          accuracy = p.actualPoints !== 0 ? Math.max(0, 100 - error / Math.abs(p.actualPoints) * 100) : p.predictedPoints === p.actualPoints ? 100 : 0;
          accuracy = parseFloat(accuracy.toFixed(2));
        }
        return {
          playerId: p.playerId,
          playerName: player?.web_name || `Player ${p.playerId}`,
          predictedPoints: p.predictedPoints,
          actualPoints: p.actualPoints,
          difference,
          accuracy
        };
      });
      const metrics = this.calculateAccuracyMetrics(predictions2);
      return {
        gameweek,
        predictions: predictionDetails,
        metrics
      };
    } catch (error) {
      console.error("Error getting performance comparison:", error);
      throw error;
    }
  }
};
var actualPointsService = new ActualPointsService();

// server/fpl-auth.ts
init_storage();
import crypto from "crypto";
import { chromium } from "playwright-core";
var FPL_LOGIN_URL = "https://users.premierleague.com/accounts/login/";
var COOKIE_EXPIRY_DAYS = 7;
var ALGORITHM = "aes-256-gcm";
var IV_LENGTH = 16;
var SALT_LENGTH = 64;
function getEncryptionKey() {
  const secretKey = process.env.FPL_ENCRYPTION_KEY;
  if (!secretKey) {
    const generatedKey = crypto.randomBytes(32).toString("hex");
    throw new Error(
      `FPL_ENCRYPTION_KEY environment variable is required but not set.

To fix this, add the following to your Secrets:
FPL_ENCRYPTION_KEY=${generatedKey}

Without this key, encrypted credentials cannot be persisted across restarts.`
    );
  }
  if (secretKey.length !== 64) {
    throw new Error("FPL_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)");
  }
  return Buffer.from(secretKey, "hex");
}
function encrypt(text2) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const salt = crypto.randomBytes(SALT_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text2, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return salt.toString("hex") + ":" + iv.toString("hex") + ":" + authTag.toString("hex") + ":" + encrypted;
}
function decrypt(encryptedData) {
  const key = getEncryptionKey();
  const parts = encryptedData.split(":");
  if (parts.length !== 4) {
    throw new Error("Invalid encrypted data format");
  }
  const salt = Buffer.from(parts[0], "hex");
  const iv = Buffer.from(parts[1], "hex");
  const authTag = Buffer.from(parts[2], "hex");
  const encrypted = parts[3];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
function validateAndNormalizeCookies(rawCookies) {
  if (!rawCookies || typeof rawCookies !== "string") {
    return {
      isValid: false,
      error: "Cookie string is required and must be a string"
    };
  }
  let cookies = rawCookies.trim();
  if (cookies.length === 0) {
    return {
      isValid: false,
      error: "Cookie string cannot be empty"
    };
  }
  if (cookies.includes("\n") || cookies.includes("\r")) {
    return {
      isValid: false,
      error: "Invalid cookie format: cookies cannot contain newlines. Please provide cookies as a single line in the format: cookie_name=value; cookie_name2=value2"
    };
  }
  if (cookies.toLowerCase().startsWith("cookie:")) {
    cookies = cookies.substring(7).trim();
  }
  const cookiePairs = cookies.split(";").map((pair) => pair.trim()).filter((pair) => pair.length > 0);
  if (cookiePairs.length === 0) {
    return {
      isValid: false,
      error: "Invalid cookie format: no valid cookie pairs found. Expected format: cookie_name=value; cookie_name2=value2"
    };
  }
  for (const pair of cookiePairs) {
    if (!pair.includes("=")) {
      return {
        isValid: false,
        error: `Invalid cookie format: "${pair}" does not contain "=". Each cookie must be in the format: cookie_name=value`
      };
    }
    const [name, ...valueParts] = pair.split("=");
    const cookieName = name.trim();
    const cookieValue = valueParts.join("=").trim();
    if (cookieName.length === 0) {
      return {
        isValid: false,
        error: `Invalid cookie format: cookie name cannot be empty. Expected format: cookie_name=value; cookie_name2=value2`
      };
    }
    if (/[^\x20-\x7E]/.test(pair)) {
      return {
        isValid: false,
        error: "Invalid cookie format: cookies contain non-printable or invalid characters"
      };
    }
  }
  const normalizedCookies = cookiePairs.join("; ");
  const requiredCookieNames = ["pl_profile", "sessionid", "csrftoken"];
  const cookieNames = cookiePairs.map((pair) => pair.split("=")[0].trim().toLowerCase());
  const hasRequiredCookie = requiredCookieNames.some(
    (required) => cookieNames.includes(required.toLowerCase())
  );
  if (!hasRequiredCookie) {
    return {
      isValid: false,
      error: `Invalid cookies: missing required FPL session cookies. Expected at least one of: ${requiredCookieNames.join(", ")}. Please ensure you copied the complete cookie string from your browser.`
    };
  }
  return {
    isValid: true,
    normalized: normalizedCookies
  };
}
var FPLAuthService = class {
  async login(email, password, userId) {
    console.log(`[FPL Auth] Attempting login for user ${userId} using browser automation`);
    let browser;
    try {
      console.log(`[FPL Auth] Launching local headless browser with stealth mode...`);
      browser = await chromium.launch({
        headless: true,
        executablePath: "/home/runner/workspace/.cache/ms-playwright/chromium-1194/chrome-linux/chrome",
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-blink-features=AutomationControlled",
          "--disable-web-security",
          "--disable-features=IsolateOrigins,site-per-process"
        ]
      });
      console.log(`[FPL Auth] Local browser launched successfully`);
      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        viewport: { width: 1920, height: 1080 },
        locale: "en-GB",
        extraHTTPHeaders: {
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
          "Accept-Encoding": "gzip, deflate, br",
          "DNT": "1",
          "Upgrade-Insecure-Requests": "1",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Sec-Fetch-User": "?1"
        }
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", {
          get: () => void 0
        });
        Object.defineProperty(navigator, "plugins", {
          get: () => [1, 2, 3, 4, 5]
        });
        Object.defineProperty(navigator, "languages", {
          get: () => ["en-GB", "en-US", "en"]
        });
        const originalQuery = window.navigator.permissions.query;
        window.navigator.permissions.query = (parameters) => parameters.name === "notifications" ? Promise.resolve({ state: "prompt" }) : originalQuery(parameters);
        window.chrome = {
          runtime: {}
        };
      });
      console.log(`[FPL Auth] Navigating to login page...`);
      await page.goto(FPL_LOGIN_URL, {
        waitUntil: "domcontentloaded",
        timeout: 3e4
      });
      const currentUrl = page.url();
      const pageTitle = await page.title();
      console.log(`[FPL Auth Debug] Current URL: ${currentUrl}`);
      console.log(`[FPL Auth Debug] Page title: ${pageTitle}`);
      const pageContent = await page.content();
      const hasCaptcha = pageContent.includes("captcha") || pageContent.includes("CAPTCHA");
      const hasCloudflare = pageContent.includes("cloudflare") || pageContent.includes("Cloudflare");
      const hasChallenge = pageContent.includes("challenge") || pageContent.includes("Just a moment");
      console.log(`[FPL Auth Debug] Has CAPTCHA: ${hasCaptcha}`);
      console.log(`[FPL Auth Debug] Has Cloudflare: ${hasCloudflare}`);
      console.log(`[FPL Auth Debug] Has Challenge: ${hasChallenge}`);
      const allInputs = await page.$$eval(
        "input",
        (inputs) => inputs.map((i) => ({
          type: i.type,
          name: i.name,
          id: i.id,
          placeholder: i.placeholder
        }))
      );
      console.log(`[FPL Auth Debug] Found ${allInputs.length} input fields:`, JSON.stringify(allInputs, null, 2));
      console.log(`[FPL Auth] Waiting for page to fully load...`);
      await page.waitForLoadState("networkidle", { timeout: 1e4 }).catch(() => {
        console.log(`[FPL Auth Debug] Network didn't go idle, continuing anyway...`);
      });
      console.log(`[FPL Auth] Waiting for login form...`);
      await page.waitForSelector('input#login, input[name="login"]', { timeout: 2e4 });
      console.log(`[FPL Auth] Filling in credentials...`);
      const emailInput = await page.$('input#login, input[name="login"]');
      const passwordInput = await page.$('input#password, input[name="password"]');
      if (!emailInput || !passwordInput) {
        throw new Error("Could not find login form fields");
      }
      await emailInput.fill(email);
      await passwordInput.fill(password);
      await page.waitForTimeout(500);
      console.log(`[FPL Auth] Submitting login form...`);
      const submitButton = await page.$('button[type="submit"], input[type="submit"]');
      if (submitButton) {
        await submitButton.click();
      } else {
        await page.keyboard.press("Enter");
      }
      console.log(`[FPL Auth] Waiting for login response...`);
      try {
        await Promise.race([
          page.waitForURL("**/fantasy.premierleague.com/**", { timeout: 15e3 }),
          page.waitForURL("**/a/login**", { timeout: 15e3 })
        ]);
      } catch (e) {
        const currentUrl2 = page.url();
        if (currentUrl2.includes("holding.html")) {
          throw new Error("FPL authentication temporarily unavailable due to security measures. Please try again in a few minutes.");
        }
        const errorText = await page.textContent('.error, .alert, [role="alert"]').catch(() => null);
        if (errorText) {
          throw new Error(`Login failed: ${errorText}`);
        }
      }
      const finalUrl = page.url();
      console.log(`[FPL Auth] Final URL: ${finalUrl}`);
      if (finalUrl.includes("holding.html")) {
        throw new Error("FPL authentication temporarily unavailable due to security measures. Please try again in a few minutes.");
      }
      const cookies = await context.cookies();
      console.log(`[FPL Auth] Extracted ${cookies.length} cookies from browser`);
      if (cookies.length === 0) {
        throw new Error("Login failed: Invalid email or password. Please check your FPL credentials.");
      }
      const cookieString = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
      const emailEncrypted = encrypt(email);
      const passwordEncrypted = encrypt(password);
      const cookiesExpiresAt = /* @__PURE__ */ new Date();
      cookiesExpiresAt.setDate(cookiesExpiresAt.getDate() + COOKIE_EXPIRY_DAYS);
      await storage.saveFplCredentials({
        userId,
        emailEncrypted,
        passwordEncrypted,
        sessionCookies: cookieString,
        cookiesExpiresAt
      });
      console.log(`[FPL Auth] \u2713 Login successful for user ${userId}, session expires ${cookiesExpiresAt.toISOString()}`);
    } catch (error) {
      console.error(`[FPL Auth] \u2717 Login error for user ${userId}:`, error);
      throw error;
    } finally {
      if (browser) {
        await browser.close();
        console.log(`[FPL Auth] Browser closed`);
      }
    }
  }
  async isAuthenticated(userId) {
    try {
      const credentials = await storage.getFplCredentials(userId);
      if (!credentials || !credentials.sessionCookies) {
        return false;
      }
      const now = /* @__PURE__ */ new Date();
      const expiresAt = credentials.cookiesExpiresAt ? new Date(credentials.cookiesExpiresAt) : null;
      if (!expiresAt || expiresAt <= now) {
        console.log(`[FPL Auth] Session expired for user ${userId}, attempting refresh...`);
        try {
          await this.refreshSession(userId);
          return true;
        } catch (error) {
          console.error(`[FPL Auth] Failed to refresh session for user ${userId}:`, error);
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error(`[FPL Auth] Error checking authentication for user ${userId}:`, error);
      return false;
    }
  }
  async getSessionCookies(userId) {
    const credentials = await storage.getFplCredentials(userId);
    if (!credentials || !credentials.sessionCookies) {
      throw new Error(`No FPL credentials found for user ${userId}. Please login first.`);
    }
    const now = /* @__PURE__ */ new Date();
    const expiresAt = credentials.cookiesExpiresAt ? new Date(credentials.cookiesExpiresAt) : null;
    if (!expiresAt || expiresAt <= now) {
      console.log(`[FPL Auth] Session expired for user ${userId}, refreshing...`);
      await this.refreshSession(userId);
      const refreshedCredentials = await storage.getFplCredentials(userId);
      if (!refreshedCredentials || !refreshedCredentials.sessionCookies) {
        throw new Error("Failed to refresh session cookies");
      }
      return decodeURIComponent(refreshedCredentials.sessionCookies);
    }
    return decodeURIComponent(credentials.sessionCookies);
  }
  extractCsrfToken(cookies) {
    const csrfMatch = cookies.match(/(?:Csrf|csrftoken)=([^;]+)/i);
    return csrfMatch ? csrfMatch[1] : null;
  }
  async getCsrfToken(userId) {
    const cookies = await this.getSessionCookies(userId);
    const token = this.extractCsrfToken(cookies);
    if (!token) {
      throw new Error("CSRF token not found in session cookies");
    }
    return token;
  }
  async refreshSession(userId) {
    console.log(`[FPL Auth] Refreshing session for user ${userId}`);
    const credentials = await storage.getFplCredentials(userId);
    if (!credentials) {
      throw new Error(`No FPL credentials found for user ${userId}. Please login first.`);
    }
    if (!credentials.emailEncrypted || !credentials.passwordEncrypted) {
      throw new Error("Session expired. Cannot auto-refresh without stored credentials. Please re-authenticate with cookies or email/password.");
    }
    try {
      const email = decrypt(credentials.emailEncrypted);
      const password = decrypt(credentials.passwordEncrypted);
      const formData = new URLSearchParams({
        login: email,
        password,
        redirect_uri: "https://fantasy.premierleague.com/a/login",
        app: "plfpl-web"
      });
      const response = await fetch(FPL_LOGIN_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://fantasy.premierleague.com/",
          "Origin": "https://fantasy.premierleague.com"
        },
        body: formData.toString()
      });
      console.log(`[FPL Auth Refresh] Response status: ${response.status} ${response.statusText}`);
      const responseText = await response.text();
      if (!response.ok) {
        console.error(`[FPL Auth] Session refresh failed for user ${userId}: ${response.status}`);
        throw new Error(`FPL session refresh failed: ${response.statusText} - ${responseText.substring(0, 500)}`);
      }
      const setCookieHeaders = response.headers.getSetCookie?.() || response.headers.get("set-cookie")?.split(",") || [];
      console.log(`[FPL Auth Refresh] Set-Cookie headers count: ${setCookieHeaders.length}`);
      if (setCookieHeaders.length === 0) {
        console.error(`[FPL Auth Refresh] Response body: ${responseText.substring(0, 1e3)}`);
        throw new Error("Session refresh failed: No cookies received");
      }
      const cookieString = setCookieHeaders.map((cookie) => cookie.split(";")[0]).join("; ");
      const cookiesExpiresAt = /* @__PURE__ */ new Date();
      cookiesExpiresAt.setDate(cookiesExpiresAt.getDate() + COOKIE_EXPIRY_DAYS);
      await storage.updateFplCredentials(userId, {
        sessionCookies: cookieString,
        cookiesExpiresAt
      });
      console.log(`[FPL Auth] \u2713 Session refreshed for user ${userId}, expires ${cookiesExpiresAt.toISOString()}`);
    } catch (error) {
      console.error(`[FPL Auth] \u2717 Session refresh error for user ${userId}:`, error);
      throw error;
    }
  }
  async loginWithCookies(userId, cookies, email, password) {
    console.log(`[FPL Auth] Manual cookie authentication for user ${userId}`);
    try {
      const validationResult = validateAndNormalizeCookies(cookies);
      if (!validationResult.isValid) {
        throw new Error(validationResult.error || "Invalid cookie format");
      }
      const normalizedCookies = validationResult.normalized;
      console.log(`[FPL Auth] Cookie validation passed, testing authentication...`);
      const testResponse = await fetch("https://fantasy.premierleague.com/api/me/", {
        headers: {
          "Cookie": normalizedCookies,
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        }
      });
      if (!testResponse.ok) {
        if (testResponse.status === 403) {
          throw new Error("Authentication failed: The provided cookies are invalid or expired. Please log in to FPL in your browser and copy fresh cookies.");
        } else if (testResponse.status === 401) {
          throw new Error("Authentication failed: The provided cookies are not authorized. Please ensure you copied the complete cookie string from an active FPL session.");
        } else {
          throw new Error(`Authentication failed: FPL API returned status ${testResponse.status}. Please ensure your cookies are current and valid.`);
        }
      }
      const userData = await testResponse.json();
      console.log(`[FPL Auth] Cookie validation successful for user ${userId}, FPL ID: ${userData.player}`);
      const cookiesExpiresAt = /* @__PURE__ */ new Date();
      cookiesExpiresAt.setDate(cookiesExpiresAt.getDate() + COOKIE_EXPIRY_DAYS);
      await storage.saveFplCredentials({
        userId,
        emailEncrypted: email ? encrypt(email) : null,
        passwordEncrypted: password ? encrypt(password) : null,
        sessionCookies: normalizedCookies,
        cookiesExpiresAt
      });
      console.log(`[FPL Auth] \u2713 Manual authentication successful for user ${userId}, session expires ${cookiesExpiresAt.toISOString()}`);
    } catch (error) {
      console.error(`[FPL Auth] \u2717 Manual authentication error for user ${userId}:`, error);
      throw error;
    }
  }
  async logout(userId) {
    console.log(`[FPL Auth] Logging out user ${userId}`);
    const deleted = await storage.deleteFplCredentials(userId);
    if (deleted) {
      console.log(`[FPL Auth] \u2713 Successfully logged out user ${userId}`);
    } else {
      console.log(`[FPL Auth] No credentials found for user ${userId}`);
    }
  }
};
var fplAuth = new FPLAuthService();

// server/gameweek-analyzer.ts
init_storage();
init_fpl_api();
import OpenAI2 from "openai";

// server/league-analysis.ts
init_fpl_api();
var LeagueAnalysisService = class {
  async analyzeLeague(leagueId, userId, managerId, gameweek, players) {
    try {
      console.log(`[LEAGUE ANALYSIS] Analyzing league ${leagueId} for user ${managerId}`);
      const standings = await fplApi.getLeagueStandings(leagueId);
      const entries = standings.standings?.results || [];
      if (entries.length === 0) {
        console.log("[LEAGUE ANALYSIS] No entries found in league");
        return null;
      }
      const userEntry = entries.find((e) => e.entry === managerId);
      if (!userEntry) {
        console.log("[LEAGUE ANALYSIS] User not found in league");
        return null;
      }
      const userRank = userEntry.rank;
      const firstPlace = entries[0];
      const gapToFirst = firstPlace.total - userEntry.total;
      const topCount = Math.min(5, entries.length);
      const topEntries = entries.slice(0, topCount).filter((e) => e.entry !== managerId);
      console.log(`[LEAGUE ANALYSIS] Analyzing top ${topEntries.length} competitors`);
      const competitorAnalyses = [];
      for (const entry of topEntries) {
        try {
          const picks = await fplApi.getManagerPicks(entry.entry, gameweek);
          const gwPoints = picks.entry_history?.points || 0;
          const captain = picks.picks.find((p) => p.is_captain)?.element || null;
          const viceCaptain = picks.picks.find((p) => p.is_vice_captain)?.element || null;
          const playerIds = picks.picks.map((p) => p.element);
          competitorAnalyses.push({
            managerId: entry.entry,
            teamName: entry.entry_name,
            managerName: entry.player_name,
            totalPoints: entry.total,
            rank: entry.rank,
            gameweekPoints: gwPoints,
            captain,
            viceCaptain,
            picks: playerIds,
            chipUsed: picks.active_chip || null
          });
        } catch (error) {
          console.error(`[LEAGUE ANALYSIS] Error fetching picks for ${entry.entry}:`, error);
        }
      }
      const pickCounts = /* @__PURE__ */ new Map();
      competitorAnalyses.forEach((comp) => {
        comp.picks.forEach((playerId) => {
          pickCounts.set(playerId, (pickCounts.get(playerId) || 0) + 1);
        });
      });
      const commonPicks = Array.from(pickCounts.entries()).filter(([_, count]) => count >= Math.ceil(competitorAnalyses.length * 0.6)).map(([playerId, count]) => {
        const player = players.find((p) => p.id === playerId);
        return {
          playerId,
          count,
          playerName: player?.web_name || `Player ${playerId}`
        };
      }).sort((a, b) => b.count - a.count);
      const allTopPicks = /* @__PURE__ */ new Set();
      competitorAnalyses.forEach((comp) => comp.picks.forEach((p) => allTopPicks.add(p)));
      const potentialDifferentials = players.filter((p) => {
        const leaderOwnership = (pickCounts.get(p.id) || 0) / competitorAnalyses.length;
        return leaderOwnership < 0.4 && parseFloat(p.form) > 3 && p.total_points > 15;
      }).slice(0, 5).map((p) => ({
        playerId: p.id,
        playerName: p.web_name,
        reason: `Form ${p.form}, owned by ${Math.round((pickCounts.get(p.id) || 0) / competitorAnalyses.length * 100)}% of leaders`
      }));
      const insights = [];
      if (gapToFirst > 50) {
        insights.push(`You're ${gapToFirst} points behind first place. Consider differential picks and calculated risks to close the gap.`);
      } else if (gapToFirst > 20) {
        insights.push(`You're ${gapToFirst} points behind the leader. Small differential picks could help you climb the rankings.`);
      } else if (gapToFirst <= 5) {
        insights.push(`You're very close to first place (${gapToFirst} points behind)! Stay consistent and avoid risky moves.`);
      }
      const mostCommonCaptain = competitorAnalyses.map((c) => c.captain).filter((c) => c !== null).reduce((acc, captainId) => {
        acc[captainId] = (acc[captainId] || 0) + 1;
        return acc;
      }, {});
      const topCaptainId = Object.entries(mostCommonCaptain).sort(([, a], [, b]) => b - a)[0]?.[0];
      if (topCaptainId) {
        const captainPlayer = players.find((p) => p.id === parseInt(topCaptainId));
        const captainCount = mostCommonCaptain[parseInt(topCaptainId)];
        insights.push(
          `${captainCount}/${competitorAnalyses.length} top managers are captaining ${captainPlayer?.web_name || "a popular player"}. Consider if this is a differential opportunity.`
        );
      }
      if (commonPicks.length > 0) {
        insights.push(
          `Essential picks among leaders: ${commonPicks.slice(0, 3).map((p) => p.playerName).join(", ")}. Missing these could hurt your ranking.`
        );
      }
      const avgPoints = entries.reduce((sum, e) => sum + e.total, 0) / entries.length;
      console.log(`[LEAGUE ANALYSIS] Analysis complete. User rank: ${userRank}, Gap to first: ${gapToFirst}`);
      return {
        userRank,
        leadersAnalysis: competitorAnalyses,
        commonPicks,
        differentials: potentialDifferentials,
        strategicInsights: insights,
        gapToFirst,
        averageLeaguePoints: Math.round(avgPoints)
      };
    } catch (error) {
      console.error("[LEAGUE ANALYSIS] Error analyzing league:", error);
      return null;
    }
  }
};
var leagueAnalysis = new LeagueAnalysisService();

// server/competitor-predictor.ts
init_fpl_api();
var CompetitorPredictorService = class {
  cache = /* @__PURE__ */ new Map();
  CACHE_DURATION = 30 * 60 * 1e3;
  // 30 minutes
  async predictCompetitorPoints(leagueId, competitorManagerIds, gameweek, players, fixtures, teams, gameweeks) {
    const cacheKey = `${leagueId}-${gameweek}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`[COMPETITOR PREDICTOR] Using cached predictions for league ${leagueId} GW${gameweek}`);
      return cached.data;
    }
    console.log(`[COMPETITOR PREDICTOR] Generating predictions for ${competitorManagerIds.length} competitors in GW${gameweek}`);
    const predictions2 = [];
    for (const managerId of competitorManagerIds) {
      try {
        const prediction = await this.predictSingleManager(
          managerId,
          gameweek,
          players,
          fixtures,
          teams,
          gameweeks
        );
        predictions2.push(prediction);
      } catch (error) {
        console.error(`[COMPETITOR PREDICTOR] Error predicting for manager ${managerId}:`, error);
      }
    }
    this.cache.set(cacheKey, {
      data: predictions2,
      timestamp: Date.now(),
      gameweek,
      leagueId
    });
    console.log(`[COMPETITOR PREDICTOR] Generated ${predictions2.length} predictions`);
    return predictions2;
  }
  async predictSingleManager(managerId, gameweek, players, fixtures, teams, gameweeks) {
    const managerDetails = await fplApi.getManagerDetails(managerId);
    let teamPicks;
    try {
      teamPicks = await fplApi.getManagerPicks(managerId, gameweek);
    } catch (error) {
      const currentGW = gameweeks.find((gw) => gw.is_current);
      if (currentGW && currentGW.id !== gameweek) {
        console.log(`[COMPETITOR PREDICTOR] GW${gameweek} picks not available for manager ${managerId}, falling back to GW${currentGW.id}`);
        teamPicks = await fplApi.getManagerPicks(managerId, currentGW.id);
      } else {
        throw error;
      }
    }
    const playerMap = new Map(players.map((p) => [p.id, p]));
    const teamMap = new Map(teams.map((t) => [t.id, t]));
    let totalPredictedPoints = 0;
    const teamPredictions = [];
    let captainId = null;
    let viceCaptainId = null;
    for (const pick of teamPicks.picks) {
      const player = playerMap.get(pick.element);
      if (!player) continue;
      if (pick.is_captain) captainId = pick.element;
      if (pick.is_vice_captain) viceCaptainId = pick.element;
      const basePPG = parseFloat(player.points_per_game) || 0;
      const fixtureAdjustment = this.getFixtureAdjustment(player.team, gameweek, fixtures, teams);
      const adjustedPPG = basePPG * (1 + fixtureAdjustment);
      let playerPrediction = adjustedPPG;
      if (pick.multiplier === 2) {
        playerPrediction *= 2;
      } else if (pick.multiplier === 3) {
        playerPrediction *= 3;
      }
      if (pick.multiplier > 0) {
        totalPredictedPoints += playerPrediction;
      }
      teamPredictions.push({
        playerId: pick.element,
        playerName: player.web_name,
        position: pick.position,
        isCaptain: pick.is_captain,
        isViceCaptain: pick.is_vice_captain,
        predictedPoints: Math.round(playerPrediction * 10) / 10
      });
    }
    return {
      managerId,
      managerName: `${managerDetails.player_first_name} ${managerDetails.player_last_name}`,
      teamName: managerDetails.entry_name,
      predictedPoints: Math.round(totalPredictedPoints),
      team: teamPredictions,
      captainId,
      viceCaptainId
    };
  }
  getFixtureAdjustment(teamId, gameweek, fixtures, teams) {
    const teamFixtures = fixtures.filter(
      (f) => f.event === gameweek && (f.team_h === teamId || f.team_a === teamId)
    );
    if (teamFixtures.length === 0) return 0;
    let totalAdjustment = 0;
    for (const fixture of teamFixtures) {
      const isHome = fixture.team_h === teamId;
      const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
      if (difficulty <= 2) {
        totalAdjustment += 0.2;
      } else if (difficulty >= 4) {
        totalAdjustment -= 0.2;
      }
    }
    return totalAdjustment / teamFixtures.length;
  }
  clearCache() {
    this.cache.clear();
  }
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        gameweek: value.gameweek,
        leagueId: value.leagueId,
        timestamp: value.timestamp,
        age: Date.now() - value.timestamp
      }))
    };
  }
};
var competitorPredictor = new CompetitorPredictorService();

// server/league-projection.ts
var LeagueProjectionService = class {
  calculateProjection(currentStandings, competitorPredictions, userManagerId, userAIPlanPoints) {
    const predictionMap = {};
    competitorPredictions.forEach((pred) => {
      predictionMap[pred.managerId] = {
        predictedPoints: pred.predictedPoints,
        managerName: pred.managerName,
        teamName: pred.teamName
      };
    });
    const projectedStandings = currentStandings.map((entry) => {
      const prediction = predictionMap[entry.entry];
      let predictedGWPoints = prediction?.predictedPoints || 0;
      if (entry.entry === userManagerId && userAIPlanPoints !== void 0) {
        predictedGWPoints = userAIPlanPoints;
      }
      const projectedPoints = entry.total + predictedGWPoints;
      return {
        managerId: entry.entry,
        managerName: entry.player_name,
        teamName: entry.entry_name,
        currentRank: entry.rank,
        currentPoints: entry.total,
        predictedGWPoints,
        projectedPoints,
        projectedRank: 0,
        rankChange: 0,
        gapToFirst: 0,
        gapToNext: 0,
        isUser: entry.entry === userManagerId
      };
    });
    projectedStandings.sort((a, b) => b.projectedPoints - a.projectedPoints);
    projectedStandings.forEach((standing, index2) => {
      standing.projectedRank = index2 + 1;
      standing.rankChange = standing.currentRank - standing.projectedRank;
    });
    const firstPlace = projectedStandings[0];
    projectedStandings.forEach((standing) => {
      standing.gapToFirst = firstPlace.projectedPoints - standing.projectedPoints;
      const nextRankIndex = standing.projectedRank - 2;
      if (nextRankIndex >= 0) {
        standing.gapToNext = projectedStandings[nextRankIndex].projectedPoints - standing.projectedPoints;
      }
    });
    const userStanding = projectedStandings.find((s) => s.isUser) || null;
    const insights = this.generateInsights(projectedStandings, userStanding);
    const winStrategy = this.generateWinStrategy(
      projectedStandings,
      userStanding,
      competitorPredictions
    );
    return {
      standings: projectedStandings,
      userStanding,
      insights,
      winStrategy
    };
  }
  generateInsights(standings, userStanding) {
    const insights = [];
    if (!userStanding) return insights;
    if (userStanding.rankChange > 0) {
      insights.push(
        `\u{1F4C8} You're projected to climb ${userStanding.rankChange} position${userStanding.rankChange > 1 ? "s" : ""} to ${this.getOrdinal(userStanding.projectedRank)} place!`
      );
    } else if (userStanding.rankChange < 0) {
      insights.push(
        `\u{1F4C9} You're at risk of dropping ${Math.abs(userStanding.rankChange)} position${Math.abs(userStanding.rankChange) > 1 ? "s" : ""} to ${this.getOrdinal(userStanding.projectedRank)} place.`
      );
    } else {
      insights.push(
        `\u{1F4CA} You're projected to maintain your current position at ${this.getOrdinal(userStanding.projectedRank)} place.`
      );
    }
    if (userStanding.projectedRank === 1) {
      insights.push("\u{1F3C6} You're projected to take the lead! Keep up the momentum!");
    } else if (userStanding.gapToFirst <= 10) {
      insights.push(
        `\u{1F3AF} You're only ${userStanding.gapToFirst} points behind 1st place. Victory is within reach!`
      );
    } else if (userStanding.gapToFirst <= 30) {
      insights.push(
        `\u26A1 ${userStanding.gapToFirst} points behind 1st. Consider differential picks to close the gap.`
      );
    } else {
      insights.push(
        `\u{1F680} ${userStanding.gapToFirst} points behind 1st. You'll need high-risk differentials to catch up.`
      );
    }
    if (userStanding.gapToNext < 0 && Math.abs(userStanding.gapToNext) <= 5) {
      insights.push(
        `\u26A0\uFE0F Only ${Math.abs(userStanding.gapToNext)} points ahead of the manager below. Don't lose ground!`
      );
    }
    const bigMovers = standings.filter((s) => Math.abs(s.rankChange) >= 3 && !s.isUser);
    if (bigMovers.length > 0) {
      const climber = bigMovers.find((s) => s.rankChange > 0);
      if (climber) {
        insights.push(
          `\u{1F525} Watch out for ${climber.teamName} - projected to climb ${climber.rankChange} positions!`
        );
      }
    }
    return insights;
  }
  generateWinStrategy(standings, userStanding, competitorPredictions) {
    const strategy = [];
    if (!userStanding) return strategy;
    const firstPlace = standings[0];
    const targetToFirst = userStanding.gapToFirst;
    if (userStanding.projectedRank === 1) {
      strategy.push(
        `\u2705 Maintain your lead by sticking with proven performers and avoiding unnecessary risks.`
      );
    } else if (targetToFirst <= 10) {
      strategy.push(
        `\u{1F3AF} To catch 1st place: You need ${targetToFirst} extra points. Focus on high-upside captains and players with great fixtures.`
      );
    } else if (targetToFirst <= 30) {
      strategy.push(
        `\u26A1 To catch 1st place: You need ${targetToFirst} points. Consider 1-2 differential picks that leaders don't own.`
      );
    } else {
      strategy.push(
        `\u{1F680} Big gap of ${targetToFirst} points to 1st. You need bold differentials and captaincy choices that your rivals don't have.`
      );
    }
    const nextRankUp = standings[userStanding.projectedRank - 2];
    if (nextRankUp && userStanding.projectedRank > 1) {
      const pointsNeeded = Math.abs(userStanding.gapToNext) + 1;
      strategy.push(
        `\u{1F4CA} To move up a position: Beat ${nextRankUp.teamName} who is predicted to score ${nextRankUp.predictedGWPoints} points. You need ${pointsNeeded}+ points.`
      );
    }
    const topCompetitors = competitorPredictions.slice(0, 3);
    if (topCompetitors.length > 0 && userStanding.projectedRank > 1) {
      const topCaptains = topCompetitors.map((c) => c.captainId ? c.team.find((p) => p.playerId === c.captainId)?.playerName : null).filter(Boolean);
      if (topCaptains.length > 0) {
        const uniqueCaptains = Array.from(new Set(topCaptains));
        strategy.push(
          `\u{1F451} Top managers are captaining: ${uniqueCaptains.slice(0, 2).join(", ")}. Consider if a differential captain could give you an edge.`
        );
      }
    }
    const commonPlayers = this.findCommonPlayers(competitorPredictions.slice(0, 5));
    if (commonPlayers.length > 0) {
      strategy.push(
        `\u{1F511} Essential picks among leaders: ${commonPlayers.slice(0, 3).join(", ")}. Make sure you have these covered.`
      );
    }
    return strategy;
  }
  findCommonPlayers(predictions2) {
    const playerCounts = /* @__PURE__ */ new Map();
    predictions2.forEach((pred) => {
      pred.team.forEach((player) => {
        const existing = playerCounts.get(player.playerId) || { count: 0, name: player.playerName };
        playerCounts.set(player.playerId, {
          count: existing.count + 1,
          name: player.playerName
        });
      });
    });
    const threshold = Math.ceil(predictions2.length * 0.6);
    return Array.from(playerCounts.entries()).filter(([_, data]) => data.count >= threshold).sort((a, b) => b[1].count - a[1].count).map(([_, data]) => data.name);
  }
  getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
};
var leagueProjection = new LeagueProjectionService();

// server/ai-learning-feedback.ts
init_storage();
var AILearningFeedbackService = class {
  /**
   * Generate learning context from past AI performance to improve future decisions
   * @param userId - User ID
   * @param players - Array of FPL players (from snapshot)
   */
  async generateLearningContext(userId, players) {
    console.log(`[AILearning] Generating learning context for user ${userId}`);
    const allPlans = await storage.getGameweekPlansByUser(userId);
    const analyzedPlans = allPlans.filter(
      (p) => p.analysisCompletedAt && p.actualPointsWithAI !== null && p.actualPointsWithoutAI !== null
    );
    const plansWithPredictions = allPlans.filter(
      (p) => p.predictedPoints !== null && p.actualPointsWithAI !== null
    );
    if (analyzedPlans.length === 0 && plansWithPredictions.length === 0) {
      console.log(`[AILearning] No analyzed gameweeks found for user ${userId}`);
      return this.getEmptyContext();
    }
    const totalPointsImpact = analyzedPlans.reduce((sum, p) => sum + (p.pointsDelta || 0), 0);
    const averageImpact = analyzedPlans.length > 0 ? totalPointsImpact / analyzedPlans.length : 0;
    const successfulGameweeks = analyzedPlans.filter((p) => (p.pointsDelta || 0) > 0).length;
    const successRate = analyzedPlans.length > 0 ? successfulGameweeks / analyzedPlans.length * 100 : 0;
    const predictionAccuracy = this.calculatePredictionAccuracy(plansWithPredictions);
    const recentMistakes = await this.identifyRecentMistakes(analyzedPlans.slice(-10), players);
    const captainPatterns = await this.analyzeCaptainPatterns(analyzedPlans, players);
    const transferPatterns = await this.analyzeTransferPatterns(analyzedPlans, players);
    const keyLessons = this.generateKeyLessons(recentMistakes, captainPatterns, transferPatterns, averageImpact);
    console.log(`[AILearning] Context generated: ${analyzedPlans.length} GWs analyzed, avg impact: ${averageImpact.toFixed(1)}, success rate: ${successRate.toFixed(1)}%, prediction MAE: ${predictionAccuracy.meanAbsoluteError.toFixed(1)}`);
    return {
      totalGameweeksAnalyzed: analyzedPlans.length,
      overallPerformance: {
        totalPointsImpact,
        averageImpact,
        successRate
      },
      predictionAccuracy,
      recentMistakes,
      captainPatterns,
      transferPatterns,
      keyLessons
    };
  }
  /**
   * Calculate prediction accuracy metrics from plans with tracked predictions
   */
  calculatePredictionAccuracy(plansWithPredictions) {
    if (plansWithPredictions.length === 0) {
      return {
        totalGameweeks: 0,
        meanAbsoluteError: 0,
        overallBias: 0,
        recentMisses: []
      };
    }
    let totalError = 0;
    let totalBias = 0;
    const recentMisses = [];
    for (const plan of plansWithPredictions) {
      const predicted = plan.predictedPoints;
      const actual = plan.actualPointsWithAI;
      const error = Math.abs(predicted - actual);
      const bias = predicted - actual;
      totalError += error;
      totalBias += bias;
      if (error > 10) {
        recentMisses.push({
          gameweek: plan.gameweek,
          predicted,
          actual,
          error
        });
      }
    }
    recentMisses.sort((a, b) => b.error - a.error);
    const topMisses = recentMisses.slice(0, 5);
    return {
      totalGameweeks: plansWithPredictions.length,
      meanAbsoluteError: totalError / plansWithPredictions.length,
      overallBias: totalBias / plansWithPredictions.length,
      recentMisses: topMisses
    };
  }
  /**
   * Identify specific mistakes from recent gameweeks
   * @param recentPlans - Recent gameweek plans
   * @param players - Array of FPL players (from snapshot)
   */
  async identifyRecentMistakes(recentPlans, players) {
    const insights = [];
    const playersMap = new Map(players.map((p) => [p.id, p]));
    for (const plan of recentPlans) {
      if (!plan.analysisCompletedAt || !plan.originalTeamSnapshot) continue;
      const impact = plan.pointsDelta || 0;
      if (impact >= 0) continue;
      if (plan.captainId !== plan.originalTeamSnapshot.captain_id) {
        const originalCaptain = playersMap.get(plan.originalTeamSnapshot.captain_id);
        const aiCaptain = playersMap.get(plan.captainId);
        if (originalCaptain && aiCaptain) {
          insights.push({
            gameweek: plan.gameweek,
            category: "captain",
            mistake: `Recommended ${aiCaptain.web_name} as captain instead of keeping ${originalCaptain.web_name}`,
            impact,
            lesson: `${originalCaptain.web_name} outperformed ${aiCaptain.web_name} in GW${plan.gameweek}. Consider ${originalCaptain.team} players' recent form and fixtures more carefully.`
          });
        }
      }
      if (plan.transfers.length > 0 && impact < -4) {
        const transferInNames = plan.transfers.map((t) => playersMap.get(t.player_in_id)?.web_name).filter(Boolean).join(", ");
        insights.push({
          gameweek: plan.gameweek,
          category: "transfer",
          mistake: `Transfers in GW${plan.gameweek} (brought in: ${transferInNames}) resulted in ${impact} points loss`,
          impact,
          lesson: `The transfers made in GW${plan.gameweek} did not pay off. Be more conservative with transfers and prioritize long-term value over short-term fixtures.`
        });
      }
    }
    return insights.sort((a, b) => a.impact - b.impact).slice(0, 5);
  }
  /**
   * Analyze patterns in captain decisions
   * @param analyzedPlans - Analyzed gameweek plans
   * @param players - Array of FPL players (from snapshot)
   */
  async analyzeCaptainPatterns(analyzedPlans, players) {
    const playersMap = new Map(players.map((p) => [p.id, p]));
    const captainResults = /* @__PURE__ */ new Map();
    for (const plan of analyzedPlans) {
      if (!plan.captainId || !plan.originalTeamSnapshot) continue;
      const captainId = plan.captainId;
      const impact = plan.pointsDelta || 0;
      if (!captainResults.has(captainId)) {
        captainResults.set(captainId, { successes: 0, failures: 0, totalImpact: 0 });
      }
      const result = captainResults.get(captainId);
      result.totalImpact += impact;
      if (impact > 0) {
        result.successes++;
      } else if (impact < 0) {
        result.failures++;
      }
    }
    const successfulPicks = Array.from(captainResults.entries()).filter(([_, result]) => result.totalImpact > 0 && result.successes > result.failures).sort((a, b) => b[1].totalImpact - a[1].totalImpact).slice(0, 3).map(([playerId]) => playersMap.get(playerId)?.web_name || `Player ${playerId}`);
    const failedPicks = Array.from(captainResults.entries()).filter(([_, result]) => result.totalImpact < 0 || result.failures > result.successes).sort((a, b) => a[1].totalImpact - b[1].totalImpact).slice(0, 3).map(([playerId]) => playersMap.get(playerId)?.web_name || `Player ${playerId}`);
    return { successfulPicks, failedPicks };
  }
  /**
   * Analyze patterns in transfer decisions
   * @param analyzedPlans - Analyzed gameweek plans
   * @param players - Array of FPL players (from snapshot)
   */
  async analyzeTransferPatterns(analyzedPlans, players) {
    const playersMap = new Map(players.map((p) => [p.id, p]));
    const goodTransfers = [];
    const badTransfers = [];
    for (const plan of analyzedPlans) {
      if (plan.transfers.length === 0) continue;
      const impact = plan.pointsDelta || 0;
      for (const transfer of plan.transfers) {
        const playerIn = playersMap.get(transfer.player_in_id)?.web_name;
        const playerOut = playersMap.get(transfer.player_out_id)?.web_name;
        if (!playerIn || !playerOut) continue;
        const transferDesc = `${playerOut} \u2192 ${playerIn} (GW${plan.gameweek})`;
        if (impact > 0) {
          goodTransfers.push(transferDesc);
        } else if (impact < -4) {
          badTransfers.push(transferDesc);
        }
      }
    }
    return {
      goodTransfers: goodTransfers.slice(0, 5),
      badTransfers: badTransfers.slice(0, 5)
    };
  }
  /**
   * Generate actionable lessons from the analysis
   */
  generateKeyLessons(recentMistakes, captainPatterns, transferPatterns, averageImpact) {
    const lessons = [];
    if (averageImpact < -2) {
      lessons.push("CRITICAL: AI recommendations are currently hurting performance. Be more conservative and prioritize safer, high-ownership picks.");
    } else if (averageImpact > 5) {
      lessons.push("AI recommendations are performing well. Continue with current strategy.");
    }
    if (captainPatterns.failedPicks.length > 0) {
      lessons.push(`Avoid captaining: ${captainPatterns.failedPicks.join(", ")}. These players have consistently underperformed AI expectations.`);
    }
    if (captainPatterns.successfulPicks.length > 0) {
      lessons.push(`Successful captain picks: ${captainPatterns.successfulPicks.join(", ")}. Prioritize these players when fixtures align.`);
    }
    if (transferPatterns.badTransfers.length > 0) {
      lessons.push(`Learn from failed transfers: ${transferPatterns.badTransfers.slice(0, 2).join("; ")}. Consider if similar patterns are repeating.`);
    }
    const captainMistakes = recentMistakes.filter((m) => m.category === "captain");
    if (captainMistakes.length > 0) {
      const worstMistake = captainMistakes[0];
      lessons.push(`LESSON FROM GW${worstMistake.gameweek}: ${worstMistake.lesson}`);
    }
    if (lessons.length === 0) {
      lessons.push("Continue monitoring AI performance and adjusting strategy based on outcomes.");
    }
    return lessons;
  }
  /**
   * Format learning context for inclusion in AI prompt
   */
  formatForPrompt(context) {
    let prompt = "\n\n=== AI PERFORMANCE HISTORY & LEARNING ===\n\n";
    prompt += `You have been analyzed across ${context.totalGameweeksAnalyzed} gameweeks.
`;
    prompt += `Overall Impact: ${context.overallPerformance.totalPointsImpact >= 0 ? "+" : ""}${context.overallPerformance.totalPointsImpact.toFixed(0)} points total (avg: ${context.overallPerformance.averageImpact >= 0 ? "+" : ""}${context.overallPerformance.averageImpact.toFixed(1)} per GW)
`;
    prompt += `Success Rate: ${context.overallPerformance.successRate.toFixed(0)}% of gameweeks had positive impact

`;
    if (context.predictionAccuracy.totalGameweeks > 0) {
      prompt += "**PREDICTION ACCURACY ANALYSIS:**\n";
      prompt += `Tracked predictions: ${context.predictionAccuracy.totalGameweeks} gameweeks
`;
      prompt += `Average prediction error: ${context.predictionAccuracy.meanAbsoluteError.toFixed(1)} points per gameweek
`;
      prompt += `Prediction bias: ${context.predictionAccuracy.overallBias >= 0 ? "+" : ""}${context.predictionAccuracy.overallBias.toFixed(1)} points (${context.predictionAccuracy.overallBias > 0 ? "OVER-PREDICTING" : context.predictionAccuracy.overallBias < 0 ? "UNDER-PREDICTING" : "NEUTRAL"})
`;
      if (context.predictionAccuracy.recentMisses.length > 0) {
        prompt += "\n**RECENT SIGNIFICANT PREDICTION FAILURES (error >10 pts):**\n";
        for (const miss of context.predictionAccuracy.recentMisses) {
          prompt += `- GW${miss.gameweek}: Predicted ${miss.predicted} pts, Actual ${miss.actual} pts (\xB1${miss.error} pts error)
`;
        }
        prompt += "\n";
      }
      if (context.predictionAccuracy.overallBias > 10) {
        prompt += `\u26A0\uFE0F CRITICAL: You are SEVERELY OVER-PREDICTING by an average of ${context.predictionAccuracy.overallBias.toFixed(1)} points per gameweek. You MUST:
`;
        prompt += "1. Apply a conservative bias correction to all predictions\n";
        prompt += "2. Be more realistic about captain points (reduce captain multiplier expectations)\n";
        prompt += "3. Account for rotation risk, especially in defense\n";
        prompt += "4. Reduce points expectations for players with tough fixtures\n\n";
      } else if (context.predictionAccuracy.overallBias > 5) {
        prompt += `\u26A0\uFE0F WARNING: You are over-predicting by ${context.predictionAccuracy.overallBias.toFixed(1)} points per gameweek. Be more conservative in your predictions.

`;
      }
    }
    if (context.recentMistakes.length > 0) {
      prompt += "**CRITICAL LESSONS FROM RECENT MISTAKES:**\n";
      for (const mistake of context.recentMistakes) {
        prompt += `- GW${mistake.gameweek} (${mistake.impact} pts): ${mistake.mistake}
`;
        prompt += `  \u2192 ${mistake.lesson}
`;
      }
      prompt += "\n";
    }
    if (context.keyLessons.length > 0) {
      prompt += "**KEY LESSONS TO APPLY:**\n";
      for (const lesson of context.keyLessons) {
        prompt += `- ${lesson}
`;
      }
      prompt += "\n";
    }
    if (context.captainPatterns.failedPicks.length > 0) {
      prompt += `**Captains to avoid** (historical failures): ${context.captainPatterns.failedPicks.join(", ")}
`;
    }
    if (context.captainPatterns.successfulPicks.length > 0) {
      prompt += `**Successful past captains**: ${context.captainPatterns.successfulPicks.join(", ")}
`;
    }
    prompt += "\n**INSTRUCTIONS:** Review this historical performance data carefully. Learn from past mistakes and adjust your recommendations accordingly. If you previously recommended a player who underperformed, explain why this time is different or choose someone else.\n";
    return prompt;
  }
  getEmptyContext() {
    return {
      totalGameweeksAnalyzed: 0,
      overallPerformance: {
        totalPointsImpact: 0,
        averageImpact: 0,
        successRate: 0
      },
      predictionAccuracy: {
        totalGameweeks: 0,
        meanAbsoluteError: 0,
        overallBias: 0,
        recentMisses: []
      },
      recentMistakes: [],
      captainPatterns: {
        successfulPicks: [],
        failedPicks: []
      },
      transferPatterns: {
        goodTransfers: [],
        badTransfers: []
      },
      keyLessons: ["No historical data available yet. Make recommendations based on current data and best practices."]
    };
  }
};
var aiLearningFeedback = new AILearningFeedbackService();

// server/snapshot-validator.ts
var SnapshotValidator = class {
  /**
   * Validate that all components of a gameweek plan reference the same snapshot
   * 
   * This method is the primary validation point before persisting AI outputs to the database.
   * It checks transfers, predictions, captain recommendations, and chip strategies to ensure
   * they all reference the same snapshot_id.
   * 
   * **Important:** This validation should be performed atomically - if any component fails
   * validation, the entire gameweek plan should be rejected.
   * 
   * @param snapshotId - The expected snapshot ID that all components should reference
   * @param components - Object containing the various AI output components to validate
   * @param components.transfers - Array of transfer recommendations
   * @param components.predictions - Array of player performance predictions
   * @param components.captainRecommendation - Captain selection recommendation
   * @param components.chipStrategy - Chip usage recommendation
   * 
   * @returns ValidationResult indicating success or failure with detailed error messages
   * 
   * @example
   * ```typescript
   * const validation = snapshotValidator.validateGameweekPlan(
   *   currentSnapshotId,
   *   {
   *     transfers: aiService.getTransfers(),
   *     predictions: aiService.getPredictions(),
   *     captainRecommendation: aiService.getCaptain(),
   *     chipStrategy: aiService.getChipStrategy()
   *   }
   * );
   * 
   * if (!validation.valid) {
   *   throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
   * }
   * 
   * // Safe to persist to database
   * await db.insert(gameweekPlans).values(...);
   * ```
   */
  validateGameweekPlan(snapshotId, components) {
    const errors = [];
    if (components.transfers) {
      for (const transfer of components.transfers) {
        if (transfer.snapshotId && transfer.snapshotId !== snapshotId) {
          errors.push(`Transfer snapshot mismatch: expected ${snapshotId}, got ${transfer.snapshotId}`);
        }
      }
    }
    if (components.predictions) {
      for (const prediction of components.predictions) {
        if (prediction.snapshotId && prediction.snapshotId !== snapshotId) {
          errors.push(`Prediction snapshot mismatch: expected ${snapshotId}, got ${prediction.snapshotId}`);
        }
      }
    }
    if (components.captainRecommendation?.snapshotId && components.captainRecommendation.snapshotId !== snapshotId) {
      errors.push(`Captain recommendation snapshot mismatch: expected ${snapshotId}, got ${components.captainRecommendation.snapshotId}`);
    }
    if (components.chipStrategy?.snapshotId && components.chipStrategy.snapshotId !== snapshotId) {
      errors.push(`Chip strategy snapshot mismatch: expected ${snapshotId}, got ${components.chipStrategy.snapshotId}`);
    }
    return {
      valid: errors.length === 0,
      errors,
      snapshotId
    };
  }
  /**
   * Validate a single component's snapshot ID
   * 
   * This is a utility method for validating individual components when you need
   * granular validation control or are processing components one at a time.
   * 
   * @param expectedSnapshotId - The snapshot ID that the component should reference
   * @param actualSnapshotId - The actual snapshot ID from the component (may be undefined/null)
   * 
   * @returns ValidationResult with success/failure and error details
   * 
   * @example
   * ```typescript
   * // Validate before processing a single prediction
   * const prediction = await aiService.getPrediction(playerId);
   * const validation = snapshotValidator.validateComponent(
   *   currentSnapshotId,
   *   prediction.snapshotId
   * );
   * 
   * if (!validation.valid) {
   *   console.warn('Prediction has wrong snapshot, discarding');
   *   return;
   * }
   * 
   * await processPrediction(prediction);
   * ```
   */
  validateComponent(expectedSnapshotId, actualSnapshotId) {
    if (!actualSnapshotId) {
      return {
        valid: false,
        errors: ["Missing snapshot ID"],
        snapshotId: expectedSnapshotId
      };
    }
    if (actualSnapshotId !== expectedSnapshotId) {
      return {
        valid: false,
        errors: [`Snapshot mismatch: expected ${expectedSnapshotId}, got ${actualSnapshotId}`],
        snapshotId: expectedSnapshotId
      };
    }
    return {
      valid: true,
      errors: [],
      snapshotId: expectedSnapshotId
    };
  }
};
var snapshotValidator = new SnapshotValidator();

// server/gameweek-analyzer.ts
var openai2 = new OpenAI2({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});
var aiPredictionService = new AIPredictionService();
function calculateSuspensionRisk(yellowCards, currentGameweek) {
  if (yellowCards >= 15) {
    return {
      risk: "critical",
      description: "At 15-yellow threshold",
      yellowsToSuspension: 0
    };
  }
  if (yellowCards === 14) {
    return {
      risk: "critical",
      description: "Next yellow = 3-match ban",
      yellowsToSuspension: 1
    };
  }
  if (yellowCards === 13) {
    return {
      risk: "high",
      description: "2 yellows from 3-match ban",
      yellowsToSuspension: 2
    };
  }
  if (currentGameweek <= 32) {
    if (yellowCards === 10) {
      return {
        risk: "critical",
        description: "At 10-yellow threshold",
        yellowsToSuspension: 0
      };
    }
    if (yellowCards === 9) {
      return {
        risk: "critical",
        description: "Next yellow = 2-match ban",
        yellowsToSuspension: 1
      };
    }
    if (yellowCards === 8) {
      return {
        risk: "high",
        description: "2 yellows from 2-match ban",
        yellowsToSuspension: 2
      };
    }
  }
  if (currentGameweek <= 19) {
    if (yellowCards === 5) {
      return {
        risk: "critical",
        description: "At 5-yellow threshold",
        yellowsToSuspension: 0
      };
    }
    if (yellowCards === 4) {
      return {
        risk: "critical",
        description: "Next yellow = 1-match ban",
        yellowsToSuspension: 1
      };
    }
    if (yellowCards === 3) {
      return {
        risk: "high",
        description: "2 yellows from 1-match ban",
        yellowsToSuspension: 2
      };
    }
  }
  if (yellowCards >= 11) {
    const yellowsTo15 = 15 - yellowCards;
    return {
      risk: "moderate",
      description: `${yellowsTo15} yellows from 3-match ban`,
      yellowsToSuspension: yellowsTo15
    };
  }
  if (yellowCards >= 6 && currentGameweek <= 32) {
    const yellowsTo10 = 10 - yellowCards;
    return {
      risk: "moderate",
      description: `${yellowsTo10} yellows from 2-match ban`,
      yellowsToSuspension: yellowsTo10
    };
  }
  if (yellowCards >= 2 && currentGameweek <= 19) {
    const yellowsTo5 = 5 - yellowCards;
    return {
      risk: "moderate",
      description: `${yellowsTo5} yellows from 1-match ban`,
      yellowsToSuspension: yellowsTo5
    };
  }
  return {
    risk: "low",
    description: "Low suspension risk",
    yellowsToSuspension: 0
  };
}
var GameweekAnalyzerService = class {
  async analyzeGameweek(userId, gameweek, targetPlayerId) {
    try {
      console.log(`[GameweekAnalyzer] Starting analysis for user ${userId}, gameweek ${gameweek}${targetPlayerId ? `, target player: ${targetPlayerId}` : ""}`);
      const inputData = await this.collectInputData(userId, gameweek);
      let previousPlan = null;
      try {
        previousPlan = await storage.getGameweekPlan(userId, gameweek);
        if (previousPlan) {
          console.log(`[GameweekAnalyzer] Found previous plan for GW${gameweek}, created at ${previousPlan.createdAt}`);
        } else {
          console.log(`[GameweekAnalyzer] No previous plan found for GW${gameweek}`);
        }
      } catch (error) {
        console.log(`[GameweekAnalyzer] Could not fetch previous plan:`, error instanceof Error ? error.message : "Unknown error");
      }
      const maxAttempts = 3;
      let aiResponse = null;
      let validation = null;
      let chipValidation = null;
      let transferCost = 0;
      let allValidationErrors = [];
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        console.log(`[GameweekAnalyzer] Attempt ${attempt}/${maxAttempts} to generate valid plan`);
        try {
          aiResponse = await this.generateAIRecommendations(userId, inputData, gameweek, targetPlayerId, previousPlan);
          validation = await this.validateFPLRules(
            inputData.currentTeam,
            aiResponse.transfers,
            inputData.allPlayers,
            inputData.budget,
            inputData.freeTransfers
          );
          transferCost = this.calculateTransferCost(
            aiResponse.transfers.length,
            inputData.freeTransfers,
            inputData.maxTransferHit
          );
          chipValidation = await this.validateChipUsage(
            userId,
            aiResponse.chip_to_play,
            inputData.chipsUsed
          );
          const allErrors = [...validation.errors, ...chipValidation.errors];
          if (validation.isValid && chipValidation.isValid) {
            console.log(`[GameweekAnalyzer] Validation passed on attempt ${attempt}`);
            break;
          } else {
            allValidationErrors = allErrors;
            console.error(`[GameweekAnalyzer] Validation failed on attempt ${attempt}:`, allErrors);
            if (attempt === maxAttempts) {
              throw new Error(
                `Failed to generate valid gameweek plan after ${maxAttempts} attempts. Validation errors: ${allErrors.join("; ")}`
              );
            } else {
              console.log(`[GameweekAnalyzer] Retrying...`);
            }
          }
        } catch (error) {
          if (attempt === maxAttempts || error instanceof Error && error.message.includes("Failed to generate valid gameweek plan")) {
            throw error;
          }
          console.error(`[GameweekAnalyzer] Error on attempt ${attempt}:`, error);
          if (attempt === maxAttempts) {
            throw error;
          }
        }
      }
      if (!aiResponse || !validation || !chipValidation) {
        throw new Error("Failed to generate gameweek plan - internal error");
      }
      const strategicInsights = [
        ...aiResponse.strategic_insights,
        ...validation.warnings,
        ...chipValidation.warnings
      ];
      if (transferCost > 0) {
        strategicInsights.push(`This plan will cost ${transferCost} points in transfer hits`);
      }
      let originalTeamSnapshot = void 0;
      if (inputData.userSettings?.manager_id) {
        try {
          console.log(`[GameweekAnalyzer] Capturing original team snapshot for manager ${inputData.userSettings.manager_id}, GW ${gameweek}`);
          const currentPicks = await fplApi.getManagerPicks(inputData.userSettings.manager_id, gameweek);
          const captainPick = currentPicks.picks.find((p) => p.is_captain);
          const viceCaptainPick = currentPicks.picks.find((p) => p.is_vice_captain);
          originalTeamSnapshot = {
            captain_id: captainPick?.element || 0,
            vice_captain_id: viceCaptainPick?.element || 0,
            players: currentPicks.picks.map((pick) => ({
              player_id: pick.element,
              position: pick.position,
              is_captain: pick.is_captain,
              is_vice_captain: pick.is_vice_captain,
              multiplier: pick.multiplier
            }))
          };
          console.log(`[GameweekAnalyzer] Original team snapshot captured: ${originalTeamSnapshot.players.length} players`);
        } catch (error) {
          console.error(`[GameweekAnalyzer] Failed to capture original team snapshot:`, error instanceof Error ? error.message : "Unknown error");
        }
      } else {
        console.log(`[GameweekAnalyzer] No manager_id set, skipping original team snapshot capture`);
      }
      console.log(`[GameweekAnalyzer] Validating snapshot consistency...`);
      const snapshotValidation = snapshotValidator.validateGameweekPlan(
        inputData.context.snapshotId,
        {
          transfers: aiResponse.transfers?.map((t) => ({ snapshotId: inputData.context.snapshotId })),
          predictions: void 0,
          // Predictions validated separately
          captainRecommendation: aiResponse.captain_id ? { snapshotId: inputData.context.snapshotId } : void 0,
          chipStrategy: aiResponse.chip_to_play ? { snapshotId: inputData.context.snapshotId } : void 0
        }
      );
      if (!snapshotValidation.valid) {
        console.error("[GameweekAnalyzer] Snapshot validation failed:", snapshotValidation.errors);
        throw new Error("Snapshot validation failed: " + snapshotValidation.errors.join(", "));
      }
      console.log(`[GameweekAnalyzer] Snapshot validation passed for ${inputData.context.snapshotId}`);
      let actualRecommendationsChanged = aiResponse.recommendations_changed;
      let actualChangeReasoning = aiResponse.change_reasoning;
      if (previousPlan) {
        console.log(`[GameweekAnalyzer] \u{1F50D} Validating continuity by comparing actual recommendations...`);
        const prevTransfers = previousPlan.transfers?.map(
          (t) => `${t.player_out_id}-${t.player_in_id}`
        ).sort().join(",") || "";
        const currTransfers = aiResponse.transfers.map(
          (t) => `${t.player_out_id}-${t.player_in_id}`
        ).sort().join(",");
        const transfersChanged = prevTransfers !== currTransfers;
        const captainChanged = previousPlan.captainId !== aiResponse.captain_id;
        const viceCaptainChanged = previousPlan.viceCaptainId !== aiResponse.vice_captain_id;
        const formationChanged = previousPlan.formation !== aiResponse.formation;
        const chipChanged = previousPlan.chipToPlay !== aiResponse.chip_to_play;
        if (transfersChanged || captainChanged || viceCaptainChanged || formationChanged || chipChanged) {
          console.log(`[GameweekAnalyzer] \u26A0\uFE0F  CONTINUITY OVERRIDE: AI said recommendations_changed=${aiResponse.recommendations_changed}, but actual comparison shows changes:`);
          console.log(`  - Transfers changed: ${transfersChanged} (prev: ${prevTransfers.substring(0, 50)}..., curr: ${currTransfers.substring(0, 50)}...)`);
          console.log(`  - Captain changed: ${captainChanged} (${previousPlan.captainId} \u2192 ${aiResponse.captain_id})`);
          console.log(`  - Vice captain changed: ${viceCaptainChanged} (${previousPlan.viceCaptainId} \u2192 ${aiResponse.vice_captain_id})`);
          console.log(`  - Formation changed: ${formationChanged} (${previousPlan.formation} \u2192 ${aiResponse.formation})`);
          console.log(`  - Chip changed: ${chipChanged} (${previousPlan.chipToPlay} \u2192 ${aiResponse.chip_to_play})`);
          actualRecommendationsChanged = true;
          actualChangeReasoning = `Recommendations updated based on latest analysis. Changes: ${[
            transfersChanged ? "different transfers" : null,
            captainChanged ? "captain changed" : null,
            viceCaptainChanged ? "vice captain changed" : null,
            formationChanged ? "formation adjusted" : null,
            chipChanged ? "chip strategy changed" : null
          ].filter(Boolean).join(", ")}.`;
        } else {
          console.log(`[GameweekAnalyzer] \u2705 Continuity confirmed: Recommendations genuinely unchanged`);
        }
      } else {
        console.log(`[GameweekAnalyzer] No previous plan - this is the first plan for GW${gameweek}`);
        if (!actualRecommendationsChanged) {
          actualRecommendationsChanged = true;
          actualChangeReasoning = `Initial plan for GW${gameweek} created.`;
        }
      }
      const plan = await storage.saveGameweekPlan({
        userId,
        gameweek,
        transfers: aiResponse.transfers,
        captainId: aiResponse.captain_id,
        viceCaptainId: aiResponse.vice_captain_id,
        chipToPlay: aiResponse.chip_to_play,
        formation: aiResponse.formation,
        predictedPoints: Math.round(aiResponse.predicted_points - transferCost),
        confidence: aiResponse.confidence,
        aiReasoning: JSON.stringify({
          reasoning: aiResponse.reasoning,
          insights: strategicInsights,
          validation: {
            isValid: validation.isValid && chipValidation.isValid,
            errors: [...validation.errors, ...chipValidation.errors],
            warnings: [...validation.warnings, ...chipValidation.warnings]
          },
          transferCost,
          snapshotId: inputData.context.snapshotId
        }),
        status: "pending",
        originalTeamSnapshot,
        recommendationsChanged: actualRecommendationsChanged,
        changeReasoning: actualChangeReasoning,
        snapshotId: inputData.context.snapshotId,
        snapshotGameweek: inputData.context.gameweek,
        snapshotTimestamp: new Date(inputData.context.timestamp),
        snapshotEnriched: inputData.context.enriched
      });
      if (plan.snapshotId !== inputData.context.snapshotId) {
        throw new Error(`Snapshot ID mismatch: plan has ${plan.snapshotId}, expected ${inputData.context.snapshotId}`);
      }
      const transferredOutIds = new Set(aiResponse.transfers.map((t) => t.player_out_id));
      const transferredInIds = new Set(aiResponse.transfers.map((t) => t.player_in_id));
      const currentPlayerIds = /* @__PURE__ */ new Set([
        ...inputData.currentTeam.players.filter((p) => p.player_id && !transferredOutIds.has(p.player_id)).map((p) => p.player_id),
        ...Array.from(transferredInIds)
      ]);
      console.log(`[GameweekAnalyzer] Current plan has ${currentPlayerIds.size} players (${inputData.currentTeam.players.length} original - ${transferredOutIds.size} out + ${transferredInIds.size} in)`);
      console.log(`
[GameweekAnalyzer] \u{1F52E} Generating predictions for ALL ${currentPlayerIds.size} current squad players...`);
      const existingSquadPlayerIds = inputData.currentTeam.players.filter((p) => p.player_id && !transferredOutIds.has(p.player_id)).map((p) => p.player_id);
      console.log(`[GameweekAnalyzer] Breaking down: ${existingSquadPlayerIds.length} existing players + ${transferredInIds.size} transferred-in = ${currentPlayerIds.size} total`);
      const existingPredictionsBeforeGeneration = await storage.getPredictionsByGameweek(userId, gameweek);
      const existingPredictionsSet = new Set(
        existingPredictionsBeforeGeneration.filter((p) => p.snapshotId === inputData.context.snapshotId).map((p) => p.playerId)
      );
      let predictionsGenerated = 0;
      let predictionsSkipped = 0;
      for (const playerId of Array.from(currentPlayerIds)) {
        if (existingPredictionsSet.has(playerId)) {
          console.log(`  \u23ED\uFE0F  Player ${playerId} already has prediction for this snapshot - skipping`);
          predictionsSkipped++;
          continue;
        }
        const player = inputData.context.snapshot.data.players.find((p) => p.id === playerId);
        if (!player) {
          console.warn(`  \u26A0\uFE0F  Player ${playerId} not found in snapshot - skipping`);
          continue;
        }
        const upcomingFixtures = inputData.upcomingFixtures.filter(
          (f) => !f.finished && f.event && f.event >= gameweek && (f.team_h === player.team || f.team_a === player.team)
        ).slice(0, 3);
        try {
          console.log(`  \u{1F3AF} Generating prediction for ${player.web_name} (ID: ${playerId})...`);
          await aiPredictionService.predictPlayerPoints({
            player,
            upcomingFixtures,
            userId,
            gameweek,
            snapshotId: inputData.context.snapshotId
          });
          predictionsGenerated++;
          console.log(`  \u2705 Prediction generated for ${player.web_name}`);
        } catch (error) {
          console.error(`  \u274C Failed to generate prediction for ${player.web_name} (ID: ${playerId}):`, error instanceof Error ? error.message : "Unknown error");
        }
      }
      console.log(`
[GameweekAnalyzer] \u{1F4CA} Prediction generation complete: ${predictionsGenerated} generated, ${predictionsSkipped} skipped (already existed), ${currentPlayerIds.size - predictionsGenerated - predictionsSkipped} failed`);
      const savedPredictions = await storage.getPredictionsByGameweek(userId, gameweek);
      const relevantPredictions = savedPredictions.filter((p) => currentPlayerIds.has(p.playerId));
      console.log(`[GameweekAnalyzer] Snapshot validation: checking ${relevantPredictions.length} predictions for current team players (ignoring ${savedPredictions.length - relevantPredictions.length} stale predictions from previous runs)`);
      const mismatchedPredictions = relevantPredictions.filter(
        (p) => p.snapshotId && p.snapshotId !== inputData.context.snapshotId
      );
      if (mismatchedPredictions.length > 0) {
        console.error("[GameweekAnalyzer] Snapshot mismatch in predictions:", {
          expected: inputData.context.snapshotId,
          found: mismatchedPredictions.map((p) => ({ playerId: p.playerId, snapshotId: p.snapshotId }))
        });
        throw new Error(`Snapshot validation failed: ${mismatchedPredictions.length} predictions have mismatched snapshot_id`);
      }
      console.log(`[GameweekAnalyzer] \u2713 All ${relevantPredictions.length} predictions for current team players match snapshot ${inputData.context.snapshotId.substring(0, 8)}...`);
      const predictionsMap = new Map(relevantPredictions.map((p) => [p.playerId, p.predictedPoints]));
      console.log(`[GameweekAnalyzer] Initial predictionsMap has ${predictionsMap.size} players before adding transferred-in estimates`);
      for (const transfer of aiResponse.transfers) {
        const playerInName = inputData.context.snapshot.data.players.find((p) => p.id === transfer.player_in_id)?.web_name || `Player ${transfer.player_in_id}`;
        const playerOutName = inputData.context.snapshot.data.players.find((p) => p.id === transfer.player_out_id)?.web_name || `Player ${transfer.player_out_id}`;
        if (!predictionsMap.has(transfer.player_in_id)) {
          const playerOutPrediction = predictionsMap.get(transfer.player_out_id) || 2;
          const estimatedPoints = Math.max(0, Math.round(playerOutPrediction + transfer.expected_points_gain));
          console.log(`[GameweekAnalyzer] \u2705 Adding estimate for transferred-in player ${playerInName} (ID: ${transfer.player_in_id}): ${estimatedPoints} pts (baseline from ${playerOutName}: ${playerOutPrediction}, gain: ${transfer.expected_points_gain})`);
          predictionsMap.set(transfer.player_in_id, estimatedPoints);
        } else {
          const existingPrediction = predictionsMap.get(transfer.player_in_id);
          console.log(`[GameweekAnalyzer] \u26A0\uFE0F Transferred-in player ${playerInName} (ID: ${transfer.player_in_id}) already has prediction: ${existingPrediction} pts - NOT adding estimate`);
        }
      }
      console.log(`[GameweekAnalyzer] \u{1F4CA} Final predictionsMap contents before enhancement loop (${predictionsMap.size} players):`);
      const predictionsArray = Array.from(predictionsMap.entries()).map(([playerId, pts]) => {
        const player = inputData.context.snapshot.data.players.find((p) => p.id === playerId);
        return { playerId, name: player?.web_name || "Unknown", predictedPoints: pts };
      }).sort((a, b) => b.predictedPoints - a.predictedPoints);
      console.log(predictionsArray.slice(0, 15).map((p) => `  ${p.name}: ${p.predictedPoints} pts`).join("\n"));
      console.log(`[GameweekAnalyzer] Generating current lineup (before transfers) for comparison...`);
      const currentLineup = await this.generateLineup(
        inputData.currentTeam,
        [],
        // No transfers - current lineup
        aiResponse.formation,
        aiResponse.captain_id,
        aiResponse.vice_captain_id,
        inputData.context.snapshot.data.players,
        Array.from(predictionsMap.entries()).map(([playerId, predictedPoints]) => ({ playerId, predictedPoints }))
      );
      console.log(`[GameweekAnalyzer] Generating starting XI lineup with ${predictionsMap.size} player predictions...`);
      const lineup = await this.generateLineup(
        inputData.currentTeam,
        aiResponse.transfers,
        aiResponse.formation,
        aiResponse.captain_id,
        aiResponse.vice_captain_id,
        inputData.context.snapshot.data.players,
        Array.from(predictionsMap.entries()).map(([playerId, predictedPoints]) => ({ playerId, predictedPoints }))
      );
      if (aiResponse.transfers.length > 0) {
        console.log(`
[GameweekAnalyzer] \u{1F504} Analyzing lineup changes for ${aiResponse.transfers.length} transfers...`);
        const currentLineupMap = new Map(currentLineup.map((p) => [p.player_id, p.position]));
        console.log(`[GameweekAnalyzer] Current lineup (before ANY transfers):`);
        const currentStartingXI = currentLineup.filter((p) => p.position <= 11);
        const currentBench = currentLineup.filter((p) => p.position > 11);
        console.log(`  Starting XI (${currentStartingXI.length}): ${currentStartingXI.map((p) => {
          const player = inputData.context.snapshot.data.players.find((pl) => pl.id === p.player_id);
          const prediction = predictionsMap.get(p.player_id) || 0;
          return `${player?.web_name}(${prediction}pts)`;
        }).join(", ")}`);
        console.log(`  Bench (${currentBench.length}): ${currentBench.map((p) => {
          const player = inputData.context.snapshot.data.players.find((pl) => pl.id === p.player_id);
          const prediction = predictionsMap.get(p.player_id) || 0;
          return `${player?.web_name}(${prediction}pts)`;
        }).join(", ")}`);
        const cumulativeTransfers = [];
        const transferredOutPlayerIds = new Set(aiResponse.transfers.map((t) => t.player_out_id));
        console.log(`[GameweekAnalyzer] Transferred-out players (${transferredOutPlayerIds.size}): ${Array.from(transferredOutPlayerIds).map((id) => {
          const player = inputData.context.snapshot.data.players.find((p) => p.id === id);
          return player?.web_name || id;
        }).join(", ")}`);
        let baselineStartingXI = inputData.currentTeam.players.filter((p) => p.position <= 11 && p.player_id).map((p) => p.player_id);
        console.log(`[GameweekAnalyzer] Baseline starting XI (${baselineStartingXI.length} players): ${baselineStartingXI.map((id) => {
          const player = inputData.context.snapshot.data.players.find((p) => p.id === id);
          return player?.web_name || id;
        }).join(", ")}`);
        for (const transfer of aiResponse.transfers) {
          const playerInName = inputData.context.snapshot.data.players.find((p) => p.id === transfer.player_in_id)?.web_name || `Player ${transfer.player_in_id}`;
          const playerOutName = inputData.context.snapshot.data.players.find((p) => p.id === transfer.player_out_id)?.web_name || `Player ${transfer.player_out_id}`;
          console.log(`
[GameweekAnalyzer] \u{1F50D} Analyzing transfer: ${playerOutName} (ID: ${transfer.player_out_id}) \u2192 ${playerInName} (ID: ${transfer.player_in_id})`);
          const playerOutPrediction = predictionsMap.get(transfer.player_out_id);
          const playerInPrediction = predictionsMap.get(transfer.player_in_id);
          console.log(`  ${playerOutName} prediction: ${playerOutPrediction !== void 0 ? playerOutPrediction + " pts" : "MISSING \u26A0\uFE0F"}`);
          console.log(`  ${playerInName} prediction: ${playerInPrediction !== void 0 ? playerInPrediction + " pts" : "MISSING \u26A0\uFE0F"}`);
          if (playerInPrediction === void 0) {
            console.error(`  \u274C ERROR: Missing prediction for transferred-in player ${playerInName}! This will cause lineup generation to fail.`);
          }
          const predictionsForLineup = Array.from(predictionsMap.entries()).map(([playerId, predictedPoints]) => ({ playerId, predictedPoints }));
          const transfersToApply = [...cumulativeTransfers, transfer];
          console.log(`  Generating lineup with ${transfersToApply.length} cumulative transfer(s) (${predictionsForLineup.length} predictions)...`);
          const lineupWithThisTransfer = await this.generateLineup(
            inputData.currentTeam,
            transfersToApply,
            // All cumulative transfers including this one
            aiResponse.formation,
            aiResponse.captain_id,
            aiResponse.vice_captain_id,
            inputData.context.snapshot.data.players,
            predictionsForLineup
          );
          console.log(`  New lineup (with ${playerOutName} \u2192 ${playerInName}):`);
          const newStartingXI = lineupWithThisTransfer.filter((p) => p.position <= 11);
          const newBench = lineupWithThisTransfer.filter((p) => p.position > 11);
          console.log(`    Starting XI (${newStartingXI.length}): ${newStartingXI.map((p) => {
            const player = inputData.context.snapshot.data.players.find((pl) => pl.id === p.player_id);
            const prediction = predictionsMap.get(p.player_id) || 0;
            return `${player?.web_name}(${prediction}pts)`;
          }).join(", ")}`);
          console.log(`    Bench (${newBench.length}): ${newBench.map((p) => {
            const player = inputData.context.snapshot.data.players.find((pl) => pl.id === p.player_id);
            const prediction = predictionsMap.get(p.player_id) || 0;
            return `${player?.web_name}(${prediction}pts)`;
          }).join(", ")}`);
          const lineupWithThisTransferMap = new Map(lineupWithThisTransfer.map((p) => [p.player_id, p.position]));
          const playerOutPosition = currentLineupMap.get(transfer.player_out_id);
          const playerInPosition = lineupWithThisTransferMap.get(transfer.player_in_id);
          console.log(`  Position check: ${playerOutName} was at position ${playerOutPosition || "NOT FOUND"}, ${playerInName} now at position ${playerInPosition || "NOT FOUND"}`);
          const playerOutWasBench = !playerOutPosition || playerOutPosition > 11;
          const playerInIsStarting = playerInPosition && playerInPosition <= 11;
          console.log(`  Transfer scenario: ${playerOutName} was ${playerOutWasBench ? "on BENCH" : "STARTING"}, ${playerInName} is ${playerInIsStarting ? "STARTING" : "on BENCH"}`);
          if (playerOutWasBench && playerInIsStarting) {
            console.log(`  \u2705 Bench \u2192 Starting transfer detected! Looking for benched player...`);
            const newStartingXI2 = lineupWithThisTransfer.filter((p) => p.position <= 11).map((p) => p.player_id);
            console.log(`  Baseline starting XI (${baselineStartingXI.length} players): ${baselineStartingXI.map((id) => {
              const player = inputData.context.snapshot.data.players.find((p) => p.id === id);
              return player?.web_name || id;
            }).join(", ")}`);
            console.log(`  New starting XI with this transfer (${newStartingXI2.length} players): ${newStartingXI2.map((id) => {
              const player = inputData.context.snapshot.data.players.find((p) => p.id === id);
              return player?.web_name || id;
            }).join(", ")}`);
            const benchedPlayerId = baselineStartingXI.find(
              (playerId) => !newStartingXI2.includes(playerId) && !transferredOutPlayerIds.has(playerId)
            );
            if (benchedPlayerId) {
              const benchedPlayerName = inputData.context.snapshot.data.players.find((p) => p.id === benchedPlayerId)?.web_name || `Player ${benchedPlayerId}`;
              console.log(`  \u{1F3AF} Found benched player: ${benchedPlayerName} (ID: ${benchedPlayerId})`);
            } else {
              console.log(`  \u2705 NO benched player found - no starter is displaced by this transfer.`);
              console.log(`  This is correct when transferring out a bench player and the new player fills their spot.`);
              console.log(`  Diagnosis: Baseline starting XI = ${baselineStartingXI.length}, New starting XI = ${newStartingXI2.length}`);
              const playersOnlyInBaseline = baselineStartingXI.filter((id) => !newStartingXI2.includes(id) && id !== transfer.player_out_id);
              const playersOnlyInNew = newStartingXI2.filter((id) => !baselineStartingXI.includes(id));
              console.log(`  Players only in baseline XI (excluding ${playerOutName}): ${playersOnlyInBaseline.map((id) => inputData.context.snapshot.data.players.find((p) => p.id === id)?.web_name || id).join(", ") || "NONE"}`);
              console.log(`  Players only in new XI: ${playersOnlyInNew.map((id) => inputData.context.snapshot.data.players.find((p) => p.id === id)?.web_name || id).join(", ") || "NONE"}`);
            }
            if (benchedPlayerId) {
              const benchedPlayer = inputData.context.snapshot.data.players.find((p) => p.id === benchedPlayerId);
              const transferredInPlayer = inputData.context.snapshot.data.players.find((p) => p.id === transfer.player_in_id);
              if (benchedPlayer && transferredInPlayer) {
                const positionNames = ["", "GK", "DEF", "MID", "FWD"];
                const benchedPlayerType = benchedPlayer.element_type;
                const incomingPlayerType = transferredInPlayer.element_type;
                const isValidSubstitution = benchedPlayerType === 1 && incomingPlayerType === 1 || // GK ↔ GK
                benchedPlayerType > 1 && incomingPlayerType > 1;
                if (!isValidSubstitution) {
                  console.log(`  \u26A0\uFE0F INVALID SUBSTITUTION DETECTED: ${benchedPlayer.web_name} (${positionNames[benchedPlayerType]}) cannot be benched for ${transferredInPlayer.web_name} (${positionNames[incomingPlayerType]})`);
                  console.log(`  \u23ED\uFE0F  Skipping this substitution - violates FPL position rules`);
                } else {
                  console.log(`  \u2705 Valid substitution: ${positionNames[benchedPlayerType]} \u2194 ${positionNames[incomingPlayerType]}`);
                  const benchedPrediction = predictionsMap.get(benchedPlayerId) || 0;
                  const transferredInPrediction = predictionsMap.get(transfer.player_in_id) || 0;
                  const reasons = [];
                  if (transferredInPrediction > benchedPrediction) {
                    const diff = (transferredInPrediction - benchedPrediction).toFixed(1);
                    reasons.push(`${transferredInPlayer.web_name} has higher predicted points (${transferredInPrediction.toFixed(1)} vs ${benchedPrediction.toFixed(1)}, +${diff})`);
                  } else if (benchedPrediction > 0) {
                    reasons.push(`lower predicted points (${benchedPrediction.toFixed(1)})`);
                  }
                  const benchedForm = parseFloat(benchedPlayer.form || "0");
                  const transferredInForm = parseFloat(transferredInPlayer.form || "0");
                  if (benchedForm < transferredInForm && benchedForm < 4) {
                    reasons.push(`poor form (${benchedForm.toFixed(1)})`);
                  } else if (transferredInForm > benchedForm) {
                    reasons.push(`better form for ${transferredInPlayer.web_name} (${transferredInForm.toFixed(1)} vs ${benchedForm.toFixed(1)})`);
                  }
                  if (benchedPlayer.chance_of_playing_next_round !== null && benchedPlayer.chance_of_playing_next_round < 100) {
                    reasons.push(`injury doubt (${benchedPlayer.chance_of_playing_next_round}% chance of playing)`);
                  }
                  const benchedTeam = inputData.context.snapshot.data.teams.find((t) => t.id === benchedPlayer.team);
                  const transferredInTeam = inputData.context.snapshot.data.teams.find((t) => t.id === transferredInPlayer.team);
                  if (benchedTeam && transferredInTeam) {
                    const nextFixtures = inputData.context.snapshot.data.fixtures.filter(
                      (f) => f.event === gameweek && !f.finished
                    );
                    const benchedFixture = nextFixtures.find(
                      (f) => f.team_h === benchedTeam.id || f.team_a === benchedTeam.id
                    );
                    const transferredInFixture = nextFixtures.find(
                      (f) => f.team_h === transferredInTeam.id || f.team_a === transferredInTeam.id
                    );
                    if (benchedFixture && transferredInFixture) {
                      const benchedDifficulty = benchedFixture.team_h === benchedTeam.id ? benchedFixture.team_h_difficulty : benchedFixture.team_a_difficulty;
                      const transferredInDifficulty = transferredInFixture.team_h === transferredInTeam.id ? transferredInFixture.team_h_difficulty : transferredInFixture.team_a_difficulty;
                      if (benchedDifficulty > transferredInDifficulty && benchedDifficulty >= 4) {
                        const difficultyNames = ["", "very easy", "easy", "moderate", "tough", "very tough"];
                        reasons.push(`tough fixture (${difficultyNames[benchedDifficulty]} vs ${difficultyNames[transferredInDifficulty]} for ${transferredInPlayer.web_name})`);
                      }
                    }
                  }
                  const benchedPlayerPosition = positionNames[benchedPlayer.element_type] || "Unknown";
                  const transferredInPlayerPosition = positionNames[transferredInPlayer.element_type] || "Unknown";
                  const benchReason = reasons.length > 0 ? reasons.join(", ") : "Tactical decision based on predicted points";
                  transfer.substitution_details = {
                    benched_player_id: benchedPlayerId,
                    benched_player_name: benchedPlayer.web_name,
                    benched_player_position: benchedPlayerPosition,
                    benched_player_predicted_points: benchedPrediction,
                    incoming_player_name: transferredInPlayer.web_name,
                    incoming_player_position: transferredInPlayerPosition,
                    incoming_player_predicted_points: transferredInPrediction,
                    bench_reason: benchReason
                  };
                  console.log(`  \u2705 Substitution details stored: ${benchedPlayer.web_name} (${benchedPlayerPosition}, ${benchedPrediction}pts) will be benched for ${transferredInPlayer.web_name} (${transferredInPlayerPosition}, ${transferredInPrediction}pts)`);
                  console.log(`[GameweekAnalyzer] Transfer ${transfer.player_out_id} \u2192 ${transfer.player_in_id}: ${benchedPlayer.web_name} will be benched for ${transferredInPlayer.web_name} (reasons: ${reasons.join("; ") || "none specified"})`);
                }
              }
            }
          } else {
            console.log(`  \u23ED\uFE0F  Skipping enhancement: Transfer doesn't bring player from bench to starting XI`);
          }
          cumulativeTransfers.push(transfer);
          baselineStartingXI = lineupWithThisTransfer.filter((p) => p.position <= 11).map((p) => p.player_id);
          console.log(`  \u{1F4CA} Updated baseline for next transfer: ${baselineStartingXI.length} players in starting XI`);
        }
        console.log(`
[GameweekAnalyzer] \u{1F50D} Checking for lineup changes from auto-pick optimization...`);
        const originalStartingXI = inputData.currentTeam.players.filter((p) => p.position <= 11 && p.player_id).map((p) => p.player_id);
        const finalStartingXI = lineup.filter((p) => p.position <= 11).map((p) => p.player_id);
        console.log(`  Original starting XI (${originalStartingXI.length}): ${originalStartingXI.map((id) => {
          const player = inputData.context.snapshot.data.players.find((p) => p.id === id);
          return player?.web_name || id;
        }).join(", ")}`);
        console.log(`  Final starting XI (${finalStartingXI.length}): ${finalStartingXI.map((id) => {
          const player = inputData.context.snapshot.data.players.find((p) => p.id === id);
          return player?.web_name || id;
        }).join(", ")}`);
        const benchedByAutoPick = originalStartingXI.filter(
          (playerId) => !finalStartingXI.includes(playerId) && !transferredOutPlayerIds.has(playerId)
        );
        const startingByAutoPick = finalStartingXI.filter(
          (playerId) => !originalStartingXI.includes(playerId) && !aiResponse.transfers.some((t) => t.player_in_id === playerId)
        );
        console.log(`  Players benched by auto-pick: ${benchedByAutoPick.map((id) => {
          const player = inputData.context.snapshot.data.players.find((p) => p.id === id);
          return player?.web_name || id;
        }).join(", ") || "NONE"}`);
        console.log(`  Players starting by auto-pick: ${startingByAutoPick.map((id) => {
          const player = inputData.context.snapshot.data.players.find((p) => p.id === id);
          return player?.web_name || id;
        }).join(", ") || "NONE"}`);
        if (benchedByAutoPick.length > 0 && startingByAutoPick.length > 0) {
          console.log(`  \u2705 Found ${benchedByAutoPick.length} benched, ${startingByAutoPick.length} starting by auto-pick!`);
          const availableStartingPlayers = [...startingByAutoPick];
          let pairingCount = 0;
          for (const benchedPlayerId of benchedByAutoPick) {
            const benchedPlayer = inputData.context.snapshot.data.players.find((p) => p.id === benchedPlayerId);
            if (!benchedPlayer) {
              console.log(`  \u26A0\uFE0F Skipping benched player ID ${benchedPlayerId} - not found in snapshot`);
              continue;
            }
            const matchingStartingPlayerId = availableStartingPlayers.find((startingId) => {
              const startingPlayer2 = inputData.context.snapshot.data.players.find((p) => p.id === startingId);
              if (!startingPlayer2) return false;
              return benchedPlayer.element_type === 1 && startingPlayer2.element_type === 1 || benchedPlayer.element_type > 1 && startingPlayer2.element_type > 1;
            });
            if (!matchingStartingPlayerId) {
              console.log(`  \u26A0\uFE0F No matching starting player found for benched ${benchedPlayer.web_name} (${benchedPlayer.element_type})`);
              continue;
            }
            const startingPlayer = inputData.context.snapshot.data.players.find((p) => p.id === matchingStartingPlayerId);
            if (!startingPlayer) {
              console.log(`  \u26A0\uFE0F Starting player ID ${matchingStartingPlayerId} not found in snapshot`);
              continue;
            }
            const positionNames = ["", "GK", "DEF", "MID", "FWD"];
            console.log(`  \u{1F504} Auto-pick change: ${benchedPlayer.web_name} (${positionNames[benchedPlayer.element_type]}) \u2192 ${startingPlayer.web_name} (${positionNames[startingPlayer.element_type]})`);
            const benchedPrediction = predictionsMap.get(benchedPlayerId) || 0;
            const startingPrediction = predictionsMap.get(matchingStartingPlayerId) || 0;
            const reasons = [];
            const benchedForm = parseFloat(benchedPlayer.form || "0");
            const startingForm = parseFloat(startingPlayer.form || "0");
            if (startingPrediction > benchedPrediction) {
              const diff = (startingPrediction - benchedPrediction).toFixed(1);
              reasons.push(`I recommend starting ${startingPlayer.web_name} over ${benchedPlayer.web_name} because ${startingPlayer.web_name} is predicted to score ${startingPrediction.toFixed(1)} points this gameweek compared to ${benchedPrediction.toFixed(1)} points for ${benchedPlayer.web_name}, which represents a ${diff} point advantage`);
            }
            if (startingForm > benchedForm && startingForm - benchedForm >= 1) {
              reasons.push(`${startingPlayer.web_name} is in significantly better form, averaging ${startingForm.toFixed(1)} points per game over recent matches compared to ${benchedForm.toFixed(1)} for ${benchedPlayer.web_name}`);
            } else if (startingForm > benchedForm) {
              reasons.push(`${startingPlayer.web_name} also has slightly better recent form at ${startingForm.toFixed(1)} points per game versus ${benchedForm.toFixed(1)}`);
            }
            if (benchedPlayer.chance_of_playing_next_round !== null && benchedPlayer.chance_of_playing_next_round < 100) {
              if (benchedPlayer.chance_of_playing_next_round < 50) {
                reasons.push(`Additionally, ${benchedPlayer.web_name} is a major injury concern with only a ${benchedPlayer.chance_of_playing_next_round}% chance of playing, making ${startingPlayer.web_name} the safer and more reliable choice`);
              } else {
                reasons.push(`${benchedPlayer.web_name} also carries injury doubt at ${benchedPlayer.chance_of_playing_next_round}% chance of playing, adding risk to starting them`);
              }
            }
            const benchReason = reasons.length > 0 ? reasons.join(". ") + "." : `I recommend starting ${startingPlayer.web_name} over ${benchedPlayer.web_name} based on superior predicted points for this gameweek.`;
            if (!aiResponse.lineupOptimizations) {
              aiResponse.lineupOptimizations = [];
            }
            aiResponse.lineupOptimizations.push({
              benched_player_id: benchedPlayerId,
              benched_player_name: benchedPlayer.web_name,
              benched_player_position: positionNames[benchedPlayer.element_type],
              benched_player_predicted_points: benchedPrediction,
              starting_player_id: matchingStartingPlayerId,
              starting_player_name: startingPlayer.web_name,
              starting_player_position: positionNames[startingPlayer.element_type],
              starting_player_predicted_points: startingPrediction,
              reasoning: benchReason
            });
            console.log(`  \u2705 Created lineup optimization: ${benchedPlayer.web_name} (${benchedPrediction.toFixed(1)} pts) benched for ${startingPlayer.web_name} (${startingPrediction.toFixed(1)} pts)`);
            pairingCount++;
            const index2 = availableStartingPlayers.indexOf(matchingStartingPlayerId);
            if (index2 > -1) {
              availableStartingPlayers.splice(index2, 1);
              console.log(`  \u{1F504} Removed ${startingPlayer.web_name} from available pool (${availableStartingPlayers.length} remaining)`);
            }
          }
          console.log(`  \u2705 Created ${pairingCount} lineup optimization card(s)`);
        }
        console.log(`
[GameweekAnalyzer] \u{1F50D} Extracting lineup optimizations from transfers...`);
        if (!aiResponse.lineupOptimizations) {
          aiResponse.lineupOptimizations = [];
        }
        const transfersToKeep = [];
        for (const transfer of aiResponse.transfers) {
          if (transfer.substitution_details) {
            console.log(`  \u{1F4E4} Extracting lineup optimization from transfer ${transfer.player_out_id} \u2192 ${transfer.player_in_id}`);
            aiResponse.lineupOptimizations.push({
              benched_player_id: transfer.substitution_details.benched_player_id,
              benched_player_name: transfer.substitution_details.benched_player_name,
              benched_player_position: transfer.substitution_details.benched_player_position,
              benched_player_predicted_points: transfer.substitution_details.benched_player_predicted_points,
              starting_player_id: transfer.player_in_id,
              starting_player_name: transfer.substitution_details.incoming_player_name,
              starting_player_position: transfer.substitution_details.incoming_player_position,
              starting_player_predicted_points: transfer.substitution_details.incoming_player_predicted_points,
              reasoning: transfer.substitution_details.bench_reason
            });
            console.log(`    \u2705 Added: ${transfer.substitution_details.benched_player_name} benched for ${transfer.substitution_details.incoming_player_name}`);
            delete transfer.substitution_details;
          }
          transfersToKeep.push(transfer);
        }
        aiResponse.transfers = transfersToKeep;
        console.log(`  \u2705 Extracted ${aiResponse.lineupOptimizations.length} total lineup optimization(s)`);
        await storage.updateGameweekPlanTransfers(plan.id, aiResponse.transfers);
        console.log(`[GameweekAnalyzer] Transfer recommendations saved to database for plan ${plan.id}`);
        if (aiResponse.lineupOptimizations && aiResponse.lineupOptimizations.length > 0) {
          await storage.updateGameweekPlanLineupOptimizations(plan.id, aiResponse.lineupOptimizations);
          console.log(`[GameweekAnalyzer] Lineup optimizations saved to database for plan ${plan.id}`);
        }
      }
      const isBenchBoostActive = aiResponse.chip_to_play === "benchboost";
      console.log(`[GameweekAnalyzer] Calculating GROSS predicted points from lineup (Bench Boost: ${isBenchBoostActive})...`);
      let calculatedGrossPoints = 0;
      let missingPredictionCount = 0;
      const missingPlayers = [];
      for (const pick of lineup) {
        const shouldInclude = pick.position <= 11 || isBenchBoostActive || pick.multiplier > 1;
        if (shouldInclude) {
          const prediction = predictionsMap.get(pick.player_id);
          if (prediction !== void 0) {
            const points = prediction * pick.multiplier;
            calculatedGrossPoints += points;
            const player = inputData.context.snapshot.data.players.find((p) => p.id === pick.player_id);
            const posLabel = pick.position <= 11 ? "XI" : "Bench";
            console.log(`  [${posLabel}] ${player?.web_name}: ${prediction} pts \xD7 ${pick.multiplier} = ${points}`);
          } else {
            const player = inputData.context.snapshot.data.players.find((p) => p.id === pick.player_id);
            const playerName = player?.web_name || `Player ${pick.player_id}`;
            missingPredictionCount++;
            missingPlayers.push(playerName);
            console.warn(`  \u26A0\uFE0F  Missing prediction for ${playerName} (position ${pick.position})`);
          }
        }
      }
      console.log(`[GameweekAnalyzer] Calculated GROSS points: ${calculatedGrossPoints}`);
      console.log(`[GameweekAnalyzer] AI predicted_points: ${aiResponse.predicted_points}`);
      console.log(`[GameweekAnalyzer] Missing predictions: ${missingPredictionCount}`);
      let finalGrossPoints;
      let predictionReliable;
      if (missingPredictionCount > 0) {
        console.error(`[GameweekAnalyzer] \u{1F6A8} ${missingPredictionCount} prediction(s) missing: ${missingPlayers.join(", ")}`);
        console.error(`[GameweekAnalyzer]    Calculated GROSS is incomplete (${calculatedGrossPoints})`);
        console.warn(`[GameweekAnalyzer]    Cannot reliably determine if AI value is GROSS or NET - keeping AI value unchanged`);
        console.warn(`[GameweekAnalyzer]    \u26A0\uFE0F  WARNING: If AI set NET instead of GROSS, double deduction may occur`);
        finalGrossPoints = aiResponse.predicted_points;
        predictionReliable = false;
      } else {
        const pointsDifference = Math.abs(aiResponse.predicted_points - calculatedGrossPoints);
        if (pointsDifference > 2) {
          console.warn(`[GameweekAnalyzer] \u26A0\uFE0F  AI predicted_points (${aiResponse.predicted_points}) differs from calculated (${calculatedGrossPoints}) by ${pointsDifference} points`);
          console.warn(`[GameweekAnalyzer]    Using calculated GROSS value: ${calculatedGrossPoints}`);
        } else {
          console.log(`[GameweekAnalyzer] \u2705 AI and calculated values match (difference: ${pointsDifference})`);
        }
        aiResponse.predicted_points = calculatedGrossPoints;
        finalGrossPoints = calculatedGrossPoints;
        predictionReliable = true;
      }
      if (transferCost > 0 && predictionReliable) {
        const grossPoints = Math.round(finalGrossPoints);
        const netPoints = Math.round(finalGrossPoints - transferCost);
        const transferCount = aiResponse.transfers?.length || 0;
        const extraTransfers = transferCount - inputData.freeTransfers;
        console.log(`[GameweekAnalyzer] Generating correct transfer cost explanation...`);
        const correctExplanation = `This plan is projected to deliver ${grossPoints} points this gameweek before accounting for transfer costs. With ${transferCount} transfer${transferCount !== 1 ? "s" : ""} recommended and ${inputData.freeTransfers} free transfer${inputData.freeTransfers !== 1 ? "s" : ""} available, you will incur a ${transferCost}-point deduction for the ${extraTransfers} additional transfer${extraTransfers !== 1 ? "s" : ""} (${extraTransfers} \xD7 4 points). This brings the final predicted points to ${netPoints} for this gameweek.`;
        let cleanedReasoning = aiResponse.reasoning.trim();
        const incorrectPatterns = [
          /This plan is projected to deliver \d+ points this gameweek with no transfer cost deduction[^.]+\./gi,
          /This plan is projected to deliver \d+ points this gameweek before accounting for transfer costs[^.]+\./gi
        ];
        for (const pattern of incorrectPatterns) {
          cleanedReasoning = cleanedReasoning.replace(pattern, "").trim();
        }
        const updatedReasoning = correctExplanation + "\n\n" + cleanedReasoning;
        aiResponse.reasoning = updatedReasoning;
        await storage.updateGameweekPlanReasoning(plan.id, updatedReasoning);
        console.log(`[GameweekAnalyzer] \u2705 Replaced AI transfer explanation with calculated GROSS: ${grossPoints} \u2192 NET: ${netPoints}`);
      } else if (transferCost > 0 && !predictionReliable) {
        console.warn(`[GameweekAnalyzer] \u26A0\uFE0F  Cannot add transfer cost explanation - predictions incomplete, cannot verify GROSS value`);
      }
      await storage.updateGameweekPlanLineup(plan.id, lineup);
      plan.lineup = lineup;
      const correctNetPoints = Math.round(finalGrossPoints - transferCost);
      console.log(`[GameweekAnalyzer] Updating plan predicted points:`);
      console.log(`  Final GROSS: ${finalGrossPoints} \u2192 ${Math.round(finalGrossPoints)} (rounded)`);
      console.log(`  Transfer cost: ${transferCost}`);
      console.log(`  Correct NET: ${correctNetPoints}`);
      await storage.updateGameweekPlanPredictedPoints(plan.id, correctNetPoints);
      plan.predictedPoints = correctNetPoints;
      console.log(`[GameweekAnalyzer] Analysis complete, plan ID: ${plan.id}`);
      await decisionLogger.logGameweekPlan(
        userId,
        plan.id,
        inputData.context,
        inputData,
        aiResponse,
        aiResponse.confidence,
        void 0
        // uncertaintyReasons not currently in AI response
      );
      return plan;
    } catch (error) {
      console.error("[GameweekAnalyzer] Error analyzing gameweek:", error);
      throw new Error(`Failed to analyze gameweek: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }
  async collectInputData(userId, gameweek) {
    console.log(`[GameweekAnalyzer] Collecting input data...`);
    const context = await snapshotContext.getContext(gameweek, true);
    console.log(`[GameweekAnalyzer] Using snapshot ${context.snapshotId} from ${new Date(context.timestamp).toISOString()} (age: ${Math.round((Date.now() - context.timestamp) / 1e3)}s)`);
    const [
      userSettings,
      automationSettings2,
      currentTeam,
      managerData,
      chipsUsed2,
      transferHistory
    ] = await Promise.all([
      storage.getUserSettings(userId),
      storage.getAutomationSettings(userId),
      this.getCurrentTeam(userId, gameweek),
      this.getManagerData(userId),
      storage.getChipsUsed(userId),
      storage.getTransfersByUser(userId)
    ]);
    const allPlayers = context.snapshot.data.players;
    const teams = context.snapshot.data.teams;
    const fixtures = context.snapshot.data.fixtures;
    const gameweeks = context.snapshot.data.gameweeks;
    const upcomingFixtures = fixtures.filter(
      (f) => f.event && f.event >= gameweek && f.event <= gameweek + 5
    );
    const freeTransfers = this.calculateFreeTransfers(transferHistory, gameweek, currentTeam);
    const budget = this.calculateBudget(currentTeam, allPlayers);
    let setPieceTakers = null;
    let dreamTeam = null;
    let leagueInsights = null;
    let leagueProjectionData = null;
    try {
      [setPieceTakers, dreamTeam] = await Promise.all([
        fplApi.getSetPieceTakers().catch(() => null),
        fplApi.getDreamTeam(gameweek - 1).catch(() => null)
      ]);
      if (userSettings?.manager_id && userSettings?.primary_league_id) {
        leagueInsights = await leagueAnalysis.analyzeLeague(
          userSettings.primary_league_id,
          userId,
          userSettings.manager_id,
          gameweek,
          allPlayers
        ).catch((err) => {
          console.log("[GameweekAnalyzer] League analysis unavailable:", err.message);
          return null;
        });
        try {
          const standings = await fplApi.getLeagueStandings(userSettings.primary_league_id);
          const entries = standings.standings?.results || [];
          if (entries.length > 0) {
            const topEntries = entries.slice(0, 10);
            const userEntry = entries.find((e) => e.entry === userSettings.manager_id);
            let competitorIds = topEntries.map((e) => e.entry);
            if (userEntry && !competitorIds.includes(userSettings.manager_id)) {
              competitorIds.push(userSettings.manager_id);
            }
            const predictions2 = await competitorPredictor.predictCompetitorPoints(
              userSettings.primary_league_id,
              competitorIds,
              gameweek,
              allPlayers,
              upcomingFixtures,
              teams,
              gameweeks
            );
            leagueProjectionData = leagueProjection.calculateProjection(
              entries,
              predictions2,
              userSettings.manager_id
            );
          }
        } catch (err) {
          console.log("[GameweekAnalyzer] League projection unavailable:", err instanceof Error ? err.message : "Unknown error");
        }
      }
    } catch (error) {
      console.log("[GameweekAnalyzer] Error fetching additional data:", error);
    }
    return {
      userSettings: userSettings || { risk_tolerance: "balanced", manager_id: null, auto_captain: false },
      automationSettings: automationSettings2,
      currentTeam,
      managerData,
      allPlayers,
      teams,
      upcomingFixtures,
      chipsUsed: chipsUsed2,
      freeTransfers,
      budget,
      maxTransferHit: automationSettings2?.maxTransferHit || 8,
      setPieceTakers,
      dreamTeam,
      leagueInsights,
      leagueProjectionData,
      context
      // Include full snapshot context for validation and metadata
    };
  }
  async getCurrentTeam(userId, gameweek) {
    let team = await storage.getTeam(userId, gameweek);
    if (!team) {
      team = await storage.getTeam(userId, gameweek - 1);
    }
    if (!team) {
      const userSettings = await storage.getUserSettings(userId);
      if (userSettings?.manager_id) {
        const picks = await fplApi.getManagerPicks(userSettings.manager_id, gameweek);
        const players = picks.picks.map((p, idx) => ({
          player_id: p.element,
          position: p.position,
          is_captain: p.is_captain,
          is_vice_captain: p.is_vice_captain
        }));
        team = await storage.saveTeam({
          userId,
          gameweek,
          players,
          formation: "4-4-2",
          // Default, will be determined by AI
          teamValue: picks.entry_history.value,
          bank: picks.entry_history.bank,
          transfersMade: picks.entry_history.event_transfers,
          lastDeadlineBank: picks.entry_history.bank
        });
      } else {
        throw new Error("No team found and no manager ID set to fetch from FPL API");
      }
    }
    return team;
  }
  async getManagerData(userId) {
    const userSettings = await storage.getUserSettings(userId);
    if (userSettings?.manager_id) {
      return await fplApi.getManagerDetails(userSettings.manager_id);
    }
    return null;
  }
  calculateFreeTransfers(transferHistory, gameweek, currentTeam) {
    const previousGWTransfers = transferHistory.filter((t) => t.gameweek === gameweek - 1);
    if (previousGWTransfers.length === 0 && currentTeam.transfersMade === 0) {
      return 2;
    }
    return 1;
  }
  calculateBudget(currentTeam, allPlayers) {
    const teamValue = currentTeam.teamValue || 1e3;
    const bank = currentTeam.bank || 0;
    let totalCurrentValue = 0;
    for (const pick of currentTeam.players) {
      if (pick.player_id) {
        const player = allPlayers.find((p) => p.id === pick.player_id);
        if (player) {
          totalCurrentValue += player.now_cost;
        }
      }
    }
    return (bank + totalCurrentValue) / 10;
  }
  async generateAIRecommendations(userId, inputData, gameweek, targetPlayerId, previousPlan) {
    const { currentTeam, allPlayers, teams, upcomingFixtures, userSettings, chipsUsed: chipsUsed2, freeTransfers, budget, setPieceTakers, dreamTeam, leagueInsights, leagueProjectionData } = inputData;
    let targetPlayerInfo = "";
    if (targetPlayerId) {
      const targetPlayer = allPlayers.find((p) => p.id === targetPlayerId);
      if (targetPlayer) {
        const team = teams.find((t) => t.id === targetPlayer.team);
        targetPlayerInfo = `

\u{1F3AF} SPECIAL REQUEST: GET ${targetPlayer.web_name.toUpperCase()} INTO THE TEAM
Target Player: ID:${targetPlayer.id} ${targetPlayer.web_name} (${team?.short_name})
Position: ${targetPlayer.element_type === 1 ? "GK" : targetPlayer.element_type === 2 ? "DEF" : targetPlayer.element_type === 3 ? "MID" : "FWD"}
Price: \xA3${(targetPlayer.now_cost / 10).toFixed(1)}m
Form: ${targetPlayer.form} | PPG: ${targetPlayer.points_per_game} | Total: ${targetPlayer.total_points}pts

**YOUR PRIMARY OBJECTIVE**: Create the MOST EFFICIENT multi-transfer plan to bring ${targetPlayer.web_name} into the squad.
- Show EXACTLY which players to transfer out (with their selling prices)
- Calculate PRECISELY how much budget is available after each transfer
- Prioritize the CHEAPEST downgrade options to free up funds
- MINIMIZE point hits - aim for 1-2 transfers if possible
- Provide a CLEAR STEP-BY-STEP transfer sequence
- Show the TOTAL cost in points hits
- Explain WHY this is the most efficient path to get ${targetPlayer.web_name}
`;
      }
    }
    let previousPlanContext = "";
    if (previousPlan) {
      console.log(`[GameweekAnalyzer] Building previous plan context for continuity awareness`);
      const prevCaptain = allPlayers.find((p) => p.id === previousPlan.captainId);
      const prevViceCaptain = allPlayers.find((p) => p.id === previousPlan.viceCaptainId);
      let prevTransfersText = "None (keep current squad)";
      if (previousPlan.transfers && Array.isArray(previousPlan.transfers) && previousPlan.transfers.length > 0) {
        prevTransfersText = previousPlan.transfers.map((t) => {
          const pOut = allPlayers.find((p) => p.id === t.player_out_id);
          const pIn = allPlayers.find((p) => p.id === t.player_in_id);
          return `  - OUT: ${pOut?.web_name || "Unknown"} (ID:${t.player_out_id}) \u2192 IN: ${pIn?.web_name || "Unknown"} (ID:${t.player_in_id}) [${t.priority} priority, +${t.expected_points_gain} pts]`;
        }).join("\n");
      }
      previousPlanContext = `

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u{1F504} CONTINUITY AWARENESS - PREVIOUS PLAN REVIEW \u{1F504}
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

**CRITICAL INSTRUCTION**: You previously generated a plan for this gameweek. Your new recommendations should maintain CONTINUITY unless there's a SIGNIFICANT change in the data.

**PREVIOUS PLAN DETAILS** (GW${previousPlan.gameweek}):
Formation: ${previousPlan.formation}
Captain: ${prevCaptain?.web_name || "Unknown"} (ID:${previousPlan.captainId})
Vice Captain: ${prevViceCaptain?.web_name || "Unknown"} (ID:${previousPlan.viceCaptainId})
Chip: ${previousPlan.chipToPlay || "None"}
Predicted Points: ${previousPlan.predictedPoints}
Confidence: ${previousPlan.confidence}%

Transfers Recommended:
${prevTransfersText}

**CONTINUITY RULES** - READ CAREFULLY:
1. \u2705 MAINTAIN PREVIOUS RECOMMENDATIONS if data hasn't changed significantly
   - Minor stat fluctuations (\xB10.1 form, \xB10.05 xG) are NOT significant
   - Small price changes (\xB10.1m) are NOT significant
   - Normal ownership fluctuations (\xB12%) are NOT significant

\u26A0\uFE0F **CRITICAL EXCEPTION - CAPTAIN SELECTION**:
   - Captain choice must ALWAYS be re-evaluated using the expected points framework (see "DATA-DRIVEN CAPTAIN SELECTION STRATEGY" section)
   - You MUST explicitly calculate expected points for top 3-5 captain candidates each time
   - Previous captain choice can be maintained ONLY if your analysis confirms it's still the highest expected points
   - Show your calculation in reasoning: "Haaland: 15 pts expected vs Salah: 12 pts vs Semenyo: 9 pts \u2192 Captain Haaland"
   - DO NOT simply maintain previous captain due to continuity without recalculating

2. \u{1F6A8} ONLY CHANGE recommendations if there's a SIGNIFICANT data change:
   - **Injury News**: Player status changed to 'injured' or 'doubtful' with <50% chance of playing
   - **Suspensions**: Player received red card or accumulated yellow cards leading to ban
   - **Major Form Shifts**: Player's form changed by \u22651.0 points (e.g., 4.5 \u2192 5.5 or 6.0 \u2192 5.0)
   - **Fixture Changes**: Match postponed, rescheduled, or difficulty changed significantly
   - **Team News**: Manager confirmed player is starting/benched, role changed (e.g., striker moved to wing)
   - **Price Trends**: Player's price about to drop/rise affecting your budget significantly (\xB10.2m+)
   - **League Strategy**: League leaders' ownership patterns changed dramatically (20%+ shift)

3. \u{1F4DD} EXPLICITLY STATE IN YOUR RESPONSE:
   - Set "previous_plan_reviewed": true
   - Set "recommendations_changed": true ONLY if you're making different recommendations
   - In "change_reasoning", provide SPECIFIC DATA that changed (with before/after values)
   
   Examples of GOOD change reasoning:
   \u274C BAD: "Form has changed slightly" 
   \u2705 GOOD: "Salah's status changed from 'available' to 'doubtful' with only 25% chance of playing this week due to hamstring injury reported on October 21st"
   
   \u274C BAD: "Better options available"
   \u2705 GOOD: "Haaland has returned from injury and played 90 minutes in last match scoring twice. His status changed from 'injured' to 'available' and his form jumped from 0.0 to 8.5 in one gameweek"
   
   \u274C BAD: "Stats updated"
   \u2705 GOOD: "Palmer's fixture difficulty for next 3 gameweeks dropped from average 4.2 to 2.1 due to opponent injuries. Chelsea now face Bournemouth (2), Luton (1), and Sheffield United (2)"

4. \u{1F3AF} DEFAULT BEHAVIOR: If in doubt, MAINTAIN CONTINUITY
   - The previous plan was carefully analyzed with the same data
   - Changing recommendations frequently creates instability
   - Users expect consistency unless something truly changed
   - If you can't identify a SPECIFIC, SIGNIFICANT change \u2192 keep previous recommendations

**YOUR TASK**: Analyze the current data and determine if any SIGNIFICANT changes warrant different recommendations.
If no significant changes occurred \u2192 Recommend THE SAME transfers, captain, and chip as before.
If significant changes occurred \u2192 Explain EXACTLY what changed (with specific before/after data) in "change_reasoning".

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
`;
    } else {
      console.log(`[GameweekAnalyzer] No previous plan exists - this is the first plan for GW${gameweek}`);
      previousPlanContext = `

**NOTE**: This is your FIRST plan for GW${gameweek}. No previous recommendations exist to maintain continuity with.
`;
    }
    const squadDetails = currentTeam.players.map((pick) => {
      const player = allPlayers.find((p) => p.id === pick.player_id);
      const team = teams.find((t) => t.id === player?.team);
      if (!player) return null;
      const playerFixtures = upcomingFixtures.filter((f) => f.team_h === player.team || f.team_a === player.team).slice(0, 6).map((f) => {
        const isHome = f.team_h === player.team;
        const opponent = teams.find((t) => t.id === (isHome ? f.team_a : f.team_h));
        const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
        return `GW${f.event}: ${isHome ? "H" : "A"} vs ${opponent?.short_name} (Diff: ${difficulty})`;
      });
      const suspensionRisk = calculateSuspensionRisk(player.yellow_cards, gameweek);
      return {
        id: player.id,
        name: player.web_name,
        team: team?.short_name || "Unknown",
        position: player.element_type === 1 ? "GK" : player.element_type === 2 ? "DEF" : player.element_type === 3 ? "MID" : "FWD",
        price: player.now_cost / 10,
        form: parseFloat(player.form),
        ppg: parseFloat(player.points_per_game),
        total_points: player.total_points,
        selected_by: player.selected_by_percent,
        status: player.status,
        chance_of_playing: player.chance_of_playing_this_round,
        news: player.news || "None",
        xG: parseFloat(player.expected_goals || "0"),
        xA: parseFloat(player.expected_assists || "0"),
        ict: parseFloat(player.ict_index || "0"),
        yellow_cards: player.yellow_cards,
        red_cards: player.red_cards,
        suspension_risk: suspensionRisk.description,
        influence: parseFloat(player.influence || "0"),
        creativity: parseFloat(player.creativity || "0"),
        threat: parseFloat(player.threat || "0"),
        fixtures: playerFixtures.join(", ") || "No upcoming fixtures"
      };
    }).filter(Boolean);
    const topPlayersByPosition = {
      GK: allPlayers.filter((p) => p.element_type === 1).sort((a, b) => b.total_points - a.total_points).slice(0, 20),
      DEF: allPlayers.filter((p) => p.element_type === 2).sort((a, b) => b.total_points - a.total_points).slice(0, 30),
      MID: allPlayers.filter((p) => p.element_type === 3).sort((a, b) => b.total_points - a.total_points).slice(0, 30),
      FWD: allPlayers.filter((p) => p.element_type === 4).sort((a, b) => b.total_points - a.total_points).slice(0, 20)
    };
    const topPlayersInfo = Object.entries(topPlayersByPosition).map(([position, players]) => {
      const playerList = players.map((p) => {
        const team = teams.find((t) => t.id === p.team);
        const suspensionRisk = calculateSuspensionRisk(p.yellow_cards, gameweek);
        const riskWarning = suspensionRisk.risk === "critical" || suspensionRisk.risk === "high" ? ` \u26A0\uFE0F${suspensionRisk.description}` : p.yellow_cards >= 2 ? ` [${p.yellow_cards}YC]` : "";
        return `ID:${p.id} ${p.web_name} (${team?.short_name}) \xA3${(p.now_cost / 10).toFixed(1)}m PPG:${p.points_per_game} Form:${p.form}${riskWarning}`;
      }).join("\n");
      return `${position}:
${playerList}`;
    }).join("\n\n");
    console.log(`[GameweekAnalyzer] Generated top players list: ${topPlayersInfo.length} characters`);
    console.log(`[GameweekAnalyzer] Sample - First 500 chars:`, topPlayersInfo.substring(0, 500));
    const availableChips = ["wildcard", "freehit", "benchboost", "triplecaptain"].filter(
      (chip) => !chipsUsed2.some((c) => c.chipType === chip)
    );
    let setPieceInfo = "";
    if (setPieceTakers) {
      setPieceInfo = "\n\nSET PIECE TAKERS (Penalties, Corners, Free Kicks):\n";
      for (const team of Object.keys(setPieceTakers)) {
        const data = setPieceTakers[team];
        if (data.penalties || data.corners || data.free_kicks) {
          setPieceInfo += `${team}: `;
          const details = [];
          if (data.penalties) details.push(`Pens: ${data.penalties.join(", ")}`);
          if (data.corners) details.push(`Corners: ${data.corners.join(", ")}`);
          if (data.free_kicks) details.push(`FKs: ${data.free_kicks.join(", ")}`);
          setPieceInfo += details.join(" | ") + "\n";
        }
      }
    }
    let dreamTeamInfo = "";
    if (dreamTeam?.team) {
      dreamTeamInfo = `

LAST GAMEWEEK DREAM TEAM (Top Performers):
`;
      dreamTeamInfo += dreamTeam.team.map((p) => {
        const player = allPlayers.find((pl) => pl.id === p.element);
        return `${player?.web_name || "Unknown"} (${p.points} pts)`;
      }).join(", ");
    }
    let leagueInfo = "";
    if (leagueInsights) {
      leagueInfo = `

=== LEAGUE COMPETITIVE ANALYSIS ===
Your League Position: ${leagueInsights.userRank}
Gap to 1st Place: ${leagueInsights.gapToFirst} points
Average League Score: ${leagueInsights.averageLeaguePoints} pts

TOP MANAGERS' COMMON PICKS (Essential Assets):
${leagueInsights.commonPicks.map((p) => `- ${p.playerName}: Owned by ${p.count}/${leagueInsights.leadersAnalysis.length} top managers (${Math.round(p.count / leagueInsights.leadersAnalysis.length * 100)}%)`).join("\n")}

DIFFERENTIAL OPPORTUNITIES (Low ownership among leaders):
${leagueInsights.differentials.map((d) => `- ${d.playerName}: ${d.reason}`).join("\n")}

STRATEGIC LEAGUE INSIGHTS:
${leagueInsights.strategicInsights.map((insight) => `- ${insight}`).join("\n")}
`;
    }
    let projectionInfo = "";
    if (leagueProjectionData?.userStanding) {
      const user = leagueProjectionData.userStanding;
      projectionInfo = `

=== PROJECTED LEAGUE STANDINGS (After GW${gameweek}) ===
YOUR PROJECTED POSITION: ${user.currentRank} \u2192 ${user.projectedRank} ${user.rankChange > 0 ? `(UP ${user.rankChange})` : user.rankChange < 0 ? `(DOWN ${Math.abs(user.rankChange)})` : "(NO CHANGE)"}
Your Predicted GW Points: ${user.predictedGWPoints} pts
Your Projected Total: ${user.projectedPoints} pts
Gap to 1st Place: ${user.gapToFirst} pts

TOP COMPETITORS' PREDICTED POINTS:
${leagueProjectionData.standings.slice(0, 5).map((s) => `- ${s.teamName} (${s.managerName}): ${s.predictedGWPoints} pts predicted \u2192 ${s.projectedRank}${s.projectedRank === 1 ? " \u{1F3C6}" : ""}`).join("\n")}

WIN STRATEGY RECOMMENDATIONS:
${leagueProjectionData.winStrategy?.map((strategy) => `- ${strategy}`).join("\n") || "N/A"}

KEY INSIGHTS:
${leagueProjectionData.insights?.map((insight) => `- ${insight}`).join("\n") || "N/A"}
`;
    }
    const prompt = `You are an expert Fantasy Premier League strategist with access to comprehensive data. Analyze the team and provide EXTREMELY DETAILED, DATA-DRIVEN recommendations with VERBOSE reasoning.

CURRENT GAMEWEEK: ${gameweek}

CURRENT SQUAD (15 players WITH THEIR IDS):
${squadDetails.map((p, i) => `ID:${p.id} ${p.name} (${p.position}) - ${p.team}
   Price: \xA3${p.price}m | Form: ${p.form.toFixed(1)} | PPG: ${p.ppg}
   Total Points: ${p.total_points} | Selected: ${p.selected_by}%
   Status: ${p.status}${p.chance_of_playing !== null ? ` (${p.chance_of_playing}% chance)` : ""}
   News: ${p.news}
   xG: ${p.xG.toFixed(2)} | xA: ${p.xA.toFixed(2)} | ICT: ${p.ict.toFixed(1)}
   Fixtures: ${p.fixtures}
`).join("\n")}

TOP AVAILABLE PLAYERS BY POSITION (with PLAYER IDS you MUST use):
${topPlayersInfo}

BUDGET & TRANSFERS:
- Bank Balance: \xA3${(inputData.currentTeam.bank / 10).toFixed(1)}m (CASH AVAILABLE NOW)
- Free Transfers: ${freeTransfers}
- Team Value: \xA3${(inputData.currentTeam.teamValue / 10).toFixed(1)}m (total squad value)
${targetPlayerInfo}
${previousPlanContext}

\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u{1F6A8}\u{1F6A8}\u{1F6A8} CRITICAL - THESE ARE HARD CONSTRAINTS THAT MUST BE FOLLOWED \u{1F6A8}\u{1F6A8}\u{1F6A8}
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

\u26D4 YOUR RESPONSE WILL BE REJECTED IF YOU VIOLATE ANY OF THESE RULES \u26D4

1. \u2705 SQUAD COMPOSITION (EXACT NUMBERS REQUIRED):
   - Must have EXACTLY 15 players total
   - Must have EXACTLY 2 Goalkeepers (GK)
   - Must have EXACTLY 5 Defenders (DEF)
   - Must have EXACTLY 5 Midfielders (MID)
   - Must have EXACTLY 3 Forwards (FWD)
   
2. \u{1F534} MAXIMUM 3 PLAYERS FROM SAME TEAM \u{1F534}
   \u26A0\uFE0F THIS IS THE MOST COMMONLY VIOLATED RULE - DOUBLE CHECK YOUR SQUAD \u26A0\uFE0F
   - After ALL transfers are complete, NO TEAM can have more than 3 players
   - Count players by team AFTER applying all your recommended transfers
   - If you recommend multiple transfers, verify the FINAL squad composition
   
3. \u{1F4B0} BUDGET CONSTRAINTS ARE HARD LIMITS \u{1F4B0}
   - For a SINGLE transfer: Available budget = Bank + selling price of OUT player
   - For MULTI-TRANSFER plans: Available budget = Bank + sum of ALL OUT players' selling prices
   - Example: Bank \xA30.5m + sell Player A \xA36.0m + sell Player B \xA38.0m = \xA314.5m total available
   - You CANNOT exceed the available budget under any circumstances
   - If a transfer plan doesn't fit the budget, you MUST find cheaper alternatives
   
4. \u{1F4CA} TRANSFER HIT LIMITS:
   - Each transfer beyond free transfers costs -4 points
   - Maximum transfer hit allowed: ${inputData.maxTransferHit} points
   - Point hits ARE strategic investments if long-term ROI justifies it
   - Calculate: (Expected points gain over next 6 GWs) - (Point hit cost) = Net benefit
   
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550
\u26A0\uFE0F VALIDATION WILL FAIL IF ANY OF THESE RULES ARE BROKEN \u26A0\uFE0F
\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550

AVAILABLE CHIPS:
${availableChips.length > 0 ? availableChips.join(", ") : "None available (all used)"}

CHIP DESCRIPTIONS:
- Wildcard: Unlimited free transfers for this gameweek only (best for major team overhaul)
- Free Hit: Make unlimited transfers for one gameweek, team reverts next week (best for blank/double gameweeks)
- Bench Boost: Points from bench players count this gameweek (best when bench has good fixtures)
- Triple Captain: Captain points count 3x instead of 2x (best for premium captains with great fixtures)

USER RISK TOLERANCE: ${userSettings.risk_tolerance}
- Conservative: Prioritize safe picks, take hits ONLY when long-term ROI is clear (e.g., premium player with 6 green fixtures)
- Balanced: Mix of safe and differential picks, take hits when expected return exceeds cost over 3-4 gameweeks
- Aggressive: Consider differentials, accept larger hits for high upside plays (e.g., premium captains with double gameweeks)

**STRATEGIC PLANNING MINDSET**:
- THINK LONG-TERM: Don't just optimize for this gameweek - consider fixture runs for the next 6+ gameweeks
- CALCULATE ROI ON HITS: A -8 point hit NOW is worth it if the new player(s) will gain 15+ points over the next 4-6 gameweeks
- PREMIUM PLAYERS: Players like Haaland, Salah, Son often justify multi-transfer plans due to their consistent high returns
- FIXTURE SWINGS: Identify teams with favorable fixture runs (GW${gameweek} to GW${gameweek + 6}) and prioritize their assets
- TEAM STRUCTURE: Sometimes restructuring the squad (e.g., downgrading bench to upgrade starters) creates long-term value

FIXTURE DIFFICULTY (1=easiest, 5=hardest):
${teams.map((t) => {
      const teamFixtures = upcomingFixtures.filter((f) => f.team_h === t.id || f.team_a === t.id).slice(0, 6).map((f) => {
        const isHome = f.team_h === t.id;
        const opponent = teams.find((team) => team.id === (isHome ? f.team_a : f.team_h));
        const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
        return `GW${f.event}:${difficulty}`;
      });
      return `${t.short_name}: ${teamFixtures.join(", ")}`;
    }).join("\n")}
${setPieceInfo}
${dreamTeamInfo}
${leagueInfo}
${projectionInfo}

=== CRITICAL: PURE NATURAL LANGUAGE REASONING ===

Write ALL reasoning in PURE NATURAL LANGUAGE - like you're explaining to a friend. NO parentheses, NO abbreviations, NO technical formatting. Just clear, conversational sentences with data woven naturally into the narrative.

For EACH TRANSFER, write a natural paragraph like:
"I recommend transferring out [Player Name] who costs 6.5 million because he has only averaged 2.1 points per game which is well below the squad average of 3.5. His upcoming fixtures are difficult with matches against Tottenham and Manchester City where the average difficulty rating is 4.5 out of 5. His price is also falling by 0.1 million. Instead, bring in [Player Name] who costs 7.0 million. With your current bank of 0.5 million plus selling [Out Player] for 6.5 million, you will have exactly 7.0 million available which covers the cost. He is in excellent form with 8.2 points in recent matches, his next six fixtures are favorable with an average difficulty of just 2.1, he takes penalties for his team, and 65 percent of league leaders already own him."

**CRITICAL FOR TRANSFERS**: You MUST explicitly calculate and state BOTH the budget AND the 6-gameweek points gain in EVERY transfer reasoning:

**BUDGET CALCULATION (REQUIRED):**
- State OUT player's selling price
- State current bank balance  
- Calculate available funds (bank + selling price)
- State IN player's cost
- Confirm the transfer is affordable OR if recommending expensive players like Haaland, provide a MULTI-STEP plan showing which 2-3 additional players need downgrading

**6-GAMEWEEK POINTS CALCULATION (REQUIRED):**
- State the NEW player's expected points per gameweek AND total over 6 gameweeks
- State the OLD player's expected points per gameweek AND total over 6 gameweeks
- Calculate the difference: "New player will score approximately X points per gameweek over the next 6 gameweeks totalling Y points. Old player would score approximately A points per gameweek totalling B points. This gives a gain of C points over 6 gameweeks."
- This calculation MUST appear in the reasoning text
- The expected_points_gain field MUST match this 6-gameweek calculation
- ALWAYS set expected_points_gain_timeframe to "6 gameweeks"

For CAPTAIN CHOICE, write naturally:
"Captain [Player Name] this week. He is playing at home against Bournemouth who have conceded an average of 2.3 goals per game recently. His expected goals rate over the last five matches is 0.8 per game and he has scored in four out of his last five appearances. Importantly, 80 percent of league leaders are also captaining him. Last season against Bournemouth he scored 12 points."

For CHIP STRATEGY, write conversationally:
"I recommend saving your Wildcard until gameweeks 12 through 14 because that is when several top teams have favorable fixture runs and player prices typically stabilize. You should use your Bench Boost during the double gameweek when your bench players have two matches each. For example, if your bench includes players from teams with doubles against weaker opponents."

For STRATEGIC INSIGHTS, you MUST include:
1. **Multi-Gameweek ROI Analysis**: Identify if any premium players (Haaland, Salah, etc.) justify point hits based on their fixture run for the next 6 gameweeks
   - Example: "Haaland has 6 green fixtures (avg difficulty 2.0) over the next 6 gameweeks and averages 9.5 points per game. Taking a -8 hit to bring him in will likely return 57 points over 6 games, making the hit worth 49 net points."
2. **League Competitive Analysis**: What leaders are doing differently - especially their premium player ownership
3. **Fixture Swings**: Identify teams transitioning from hard to easy fixtures (or vice versa) in the next 4-6 gameweeks
4. **Differential Opportunities**: Low-owned players with excellent upcoming fixtures
5. **Squad Structure Improvements**: Opportunities to downgrade bench fodder to upgrade key starters (long-term value plays)

**CRITICAL: PROACTIVE PREMIUM PLAYER ANALYSIS**:
Before finalizing your recommendations, YOU MUST explicitly analyze whether premium players (\xA312m+) should be brought in:
- Check if Haaland, Salah, Son, Palmer, or other premium assets have excellent fixture runs (next 6 gameweeks avg difficulty < 2.5)
- Calculate if their expected points over 6 gameweeks justify a -4 or -8 point hit
- Consider if league leaders own them (you need coverage to avoid falling behind)
- If a premium player makes mathematical sense, RECOMMEND THE MULTI-TRANSFER PLAN even if it requires hits
- Show the full calculation: "Player X will score ~15pts/gw over 6 GWs = 90pts total. Current player scores ~6pts/gw = 36pts. Gain: 54pts. Cost: -8 hit. Net benefit: +46pts over 6 gameweeks."

**DO NOT** be conservative just to avoid point hits - if the math shows clear long-term benefit, RECOMMEND IT.

**\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550**
**\u{1F6A8} CRITICAL: TRANSFER COST EXPLANATION IN REASONING \u{1F6A8}**
**\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550**

You have ${inputData.freeTransfers} free transfer(s) available this gameweek. Any transfers beyond this will cost 4 points each.

**MANDATORY: Your "reasoning" field MUST include a CLEAR explanation of transfer costs:**

If making MORE transfers than free transfers available:
- State total gross predicted points (before transfer cost deduction)
- State number of transfers and the cost (number of extra transfers \xD7 4 points)
- State final net predicted points (after deducting transfer cost)
- Explain why the point hit is justified based on 6-gameweek ROI

**EXAMPLE (3 transfers with 1 free transfer):**
"This plan is projected to deliver 66 points this gameweek before accounting for transfer costs. With 3 transfers recommended and only 1 free transfer available, you will incur an 8-point deduction for the 2 additional transfers (2 \xD7 4 points). This brings the final predicted points to 58 for this gameweek. However, these transfers are strategically justified because the new players are expected to gain 42 additional points over the next 6 gameweeks compared to the outgoing players, meaning the 8-point hit will be recovered within 2 gameweeks and deliver a net benefit of 34 points over the medium term."

**EXAMPLE (1 transfer with 1 free transfer):**
"This plan is projected to deliver 58 points this gameweek with no transfer cost deduction since you have 1 free transfer available and are only making 1 transfer."

**This explanation MUST appear at the start or end of your "reasoning" text so users understand the point deduction.**

**CRITICAL: DIFFERENTIAL STRATEGY - YOU MUST ACT ON THESE**:
When differential opportunities are identified in the league analysis, you MUST incorporate them into your actual transfer recommendations based on league position:

\u{1F3AF} **IF GAP TO 1ST PLACE > 50 POINTS**: Be AGGRESSIVE with differentials
   - Prioritize 2-3 differential picks in your transfers (low ownership among leaders but high form/fixtures)
   - Template picks alone won't close the gap - you NEED differentials to gain ground
   - Accept calculated risks on high-upside players that leaders don't own
   - Example: "You are 75 points behind first place. Bringing in the differential Isak who is owned by zero of the top five managers but has excellent fixtures will help you gain ground. If he outscores their template pick by even 3 points per week you will close the gap."

\u2696\uFE0F **IF GAP TO 1ST PLACE 20-50 POINTS**: BALANCED approach
   - Keep 1-2 essential template picks that leaders own (to avoid falling further behind)
   - Add 1-2 differential picks to gain ground without excessive risk
   - Focus differentials on players with strong underlying stats (high xG, xA, ICT)
   - Example: "You need both coverage with Salah who 4 out of 5 leaders own and a differential edge with Bowen who none of them own but has the best fixtures in his price range."

\u{1F6E1}\uFE0F **IF GAP TO 1ST PLACE < 20 POINTS**: Be CONSERVATIVE but not rigid
   - Prioritize template picks that leaders own (maintain coverage)
   - Only take differential risks if they have exceptional fixtures AND strong form
   - Avoid high-risk punts - consistency beats variance when you're close to top
   - Example: "You are only 8 points behind first place. Focus on matching the template with Haaland and Palmer who all leaders own. Save differential moves for when the gap grows."

**IMPORTANT**: If differential opportunities exist in the league analysis data, you MUST either:
1. Include at least one differential in your transfer recommendations with clear justification, OR
2. Explicitly explain in your reasoning why you chose template picks over available differentials

DO NOT just mention differentials in strategic insights - ACT ON THEM by recommending specific differential transfers based on the league position strategy above.

**CRITICAL: DATA-DRIVEN CAPTAIN SELECTION STRATEGY**:
Captaincy is the SINGLE BIGGEST points swing in any gameweek (2x multiplier). Your captain choice must MAXIMIZE EXPECTED POINTS while considering league position.

\u{1F3AF} **CAPTAIN SELECTION FRAMEWORK - USE ALL AVAILABLE DATA**:

**STEP 1: Identify Best Captain Candidates (Based on Stats ONLY)**
   - Analyze xG, form, fixtures, minutes, home/away, opponent defense for ALL premium options
   - Calculate expected points for top 3-5 candidates
   - Ignore ownership and league leaders at this stage - focus purely on data

**STEP 2: Evaluate League Context (If Gap > 100 Points)**
   - Check who leaders are captaining (from league projection data)
   - If your #1 choice (from Step 1) is DIFFERENT from leaders \u2192 PERFECT, captain them
   - If your #1 choice is SAME as leaders \u2192 Compare with your #2 and #3 choices:
     * If #2 has similar expected points (within 2-3 pts) \u2192 Choose #2 as differential
     * If #2 is significantly worse (4+ pts less) \u2192 STILL choose #1 even though leaders have him
   
**STEP 3: Make Final Decision**
   - \u2705 ALWAYS prioritize higher expected points
   - \u26A0\uFE0F ONLY choose differential if expected points are competitive (within 2-3 pts of best option)
   - \u274C NEVER sacrifice 4+ expected points just to be different

**MATHEMATICAL EXAMPLES**:
\u{1F4CA} Scenario A (Gap: 120 pts behind):
   - Haaland (leaders' captain): 12 pts expected, xG 1.8, home vs relegation team (difficulty 2)
   - Salah (differential): 11 pts expected, xG 1.5, home vs mid-table (difficulty 3)
   - **VERDICT**: Captain Salah. Similar expected points (1 pt difference), but differential opportunity to close gap
   
\u{1F4CA} Scenario B (Gap: 120 pts behind):
   - Haaland (leaders' captain): 15 pts expected, xG 2.4, home vs relegation team (difficulty 2), on penalties
   - Semenyo (differential): 9 pts expected, xG 0.8, away vs City (difficulty 5)
   - **VERDICT**: Captain Haaland. Despite being template, he's 6 pts better than next option. Sacrificing 6 expected points to be different would WORSEN your position
   
\u{1F4CA} Scenario C (Gap: 120 pts behind):
   - Palmer (leaders' captain): 12 pts expected
   - Salah (differential, you own): 13 pts expected
   - **VERDICT**: Captain Salah. Higher expected points AND differential = perfect choice

**KEY PRINCIPLE**: When far behind, PREFER differentials when stats are comparable. But NEVER choose differential if it means sacrificing significant expected points.

\u{1F4C8} **IF GAP TO 1ST PLACE 50-100 POINTS**: 
   - Same data-driven approach, but can tolerate slightly smaller differential advantage (within 3-4 pts of best)

\u2705 **IF GAP TO 1ST PLACE < 50 POINTS**: 
   - Choose highest expected points candidate regardless of ownership
   - Safe to match leaders' captain if he's genuinely the best option

**CAPTAIN SELECTION REASONING EXAMPLES**:
\u274C BAD: "Captain Semenyo as differential because we're 120 pts behind leaders who captain Haaland"
\u2705 GOOD: "Captain Haaland. While 80% of leaders captain him (gap: 120 pts), his expected points (15) are significantly higher than alternatives: Salah (11), Palmer (10), Semenyo (8). At home vs Bournemouth with 2.4 xG and on penalties, he offers the highest ceiling. Choosing a weaker differential would reduce our expected points and worsen our position."

\u2705 ALSO GOOD: "Captain Salah over Haaland. Leaders' consensus is Haaland (expected: 12 pts), but Salah has higher expected points (13) with Liverpool at home vs Wolves. This gives us both the best statistical choice AND a differential opportunity (gap: 120 pts). If Salah outscores Haaland by even 2 points, we gain 4 points through captaincy alone."

**YOU MUST ALWAYS**: Explicitly compare expected points for top captain candidates in your reasoning, showing your calculation process.

DO NOT just mention differentials in strategic insights - ACT ON THEM by recommending specific differential transfers based on the league position strategy above.

**\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550**
**\u{1F6A8} CRITICAL: PLAYER AVAILABILITY RULES - HIGHEST PRIORITY \u{1F6A8}**
**\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550**

**THESE RULES OVERRIDE ALL OTHER CONSIDERATIONS - CHECK AVAILABILITY FIRST!**

1. **NEVER transfer IN players with status='i' (injured), 'u' (unavailable), or 's' (suspended)**
2. **NEVER transfer IN players with chance_of_playing=0% or null with injury news**
3. **NEVER captain players with status='i', 'u', 's' or chance_of_playing=0%**
4. **NEVER captain players with chance_of_playing <25%** - they likely won't play
5. **ALWAYS transfer OUT injured/suspended players in your current squad** (unless they're back next GW)
6. **Player status codes:**
   - 'a' = available (OK to use)
   - 'd' = doubtful (risky, discount expected points heavily)
   - 'i' = injured (DO NOT USE)
   - 'u' = unavailable (DO NOT USE)
   - 's' = suspended (DO NOT USE)

7. **Expected points for unavailable players MUST be 0** - if status='i'/'u'/'s' or chance_of_playing=0%, they score ZERO points

**AVAILABILITY MUST BE CHECKED BEFORE:**
- Transfer recommendations (don't bring in injured players)
- Captain selection (don't captain injured players)
- Predicted points calculations (injured = 0 pts)
- Team composition (replace injured starters)

**IF IN DOUBT**: Check player status and chance_of_playing FIRST, before analyzing form/fixtures/xG.

**\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550**
**\u26A0\uFE0F DISCIPLINARY RISK MANAGEMENT - SUSPENSION RULES \u26A0\uFE0F**
**\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550**

**PREMIER LEAGUE SUSPENSION RULES (2024-25):**

**YELLOW CARD ACCUMULATION BANS:**
1. **5 yellow cards by GW19** = 1-match ban (threshold expires after GW19)
2. **10 yellow cards by GW32** = 2-match ban (threshold expires after GW32)
3. **15 yellow cards total** = 3-match ban (applies all season)
4. Yellow cards ACCUMULATE all season, only thresholds expire
5. Bans are automatic and apply to all domestic competitions

**RED CARD SUSPENSION RULES:**
1. **Two yellows in same game** \u2192 Sent off with red card = 1-match ban (automatic, cannot appeal)
   - The two yellows still count towards 5/10/15 accumulation thresholds
   - Example: Player on 3 yellows gets 2 more yellows in one game \u2192 1-match ban PLUS now at 5 yellows total

2. **Straight red card ban lengths** (vary by offense severity):
   - **Professional foul (DOGSO - Denying Obvious Goal-Scoring Opportunity)**: 1-match ban
   - **Dissent**: 2-match ban
   - **Violent conduct / Serious foul play**: 3-match ban (minimum)
   - **Spitting at opponent**: 6-match ban (minimum)
   - **Multiple reds in season**: Additional game added per subsequent red (2nd red = base + 1 extra match)

3. **DATA LIMITATION - IMPORTANT**: The FPL API only provides total 'red_cards' count, NOT the type of red or ban length
   - You CANNOT determine from the data whether a red was from 2 yellows or straight red
   - You CANNOT calculate exact ban length from API data alone
   - ALWAYS check the 'news' field for details about recent red cards and current ban status
   - If 'status=s' (suspended), the player is CURRENTLY serving a ban

**YOUR DISCIPLINARY RISK ANALYSIS:**
Each player includes:
- yellow_cards: Total yellow cards this season
- red_cards: Total red cards this season (cannot distinguish type from data alone)
- suspension_risk: Yellow card threshold description (e.g., "Next yellow = 1-match ban")
- news: Player news often mentions recent red cards, ban length, and return date
- status: 's' means currently suspended, 'a' means available
- influence, creativity, threat: Playing style metrics

**YELLOW CARD RISK RULES:**
1. **CRITICAL RISK (1 yellow from ban)**: AVOID transferring in, AVOID captaining, STRONGLY CONSIDER transferring out
   - These players will miss a match if they receive one yellow card
   - Expected points for next 6 GWs MUST factor in likely suspension
   - Example: "Palmer has 4 yellows (critical risk: next yellow = 1-match ban). Reduce his 6-GW expected points by approximately 1 gameweek's worth (e.g., if 7 pts/game, reduce total by 7 pts)"

2. **HIGH RISK (2 yellows from ban)**: Consider carefully, factor risk into expected points
   - Discount 6-GW expected points by 20-30% for suspension probability
   - Example: "Salah has 3 yellows (2 from ban). Expected 48 pts over 6 GWs, but adjust to ~40 pts accounting for suspension risk"

3. **MODERATE RISK (3+ yellows from ban)**: Monitor but can still recommend
   - Mention in reasoning if recommending transfer or captain
   - Example: "Haaland has 2 yellows (3 from ban) - manageable risk given his output"

4. **Calculate adjusted expected points:**
   - Critical risk (1 from ban): Reduce by 1 full gameweek's expected points
   - High risk (2 from ban): Reduce total by 20-30%
   - Moderate risk (3 from ban): Reduce total by 5-10%

**RED CARD TEMPERAMENT RISK:**
- **Players with red_cards > 0**: Flag temperament concerns and increased disciplinary risk
- **Players with red_cards >= 2**: SERIOUS temperament issues - significantly increase expected yellow card probability
- Example: "Avoid Bruno Fernandes despite fixtures. He has 2 red cards this season showing poor discipline. His temperament issues increase both yellow card risk (currently 3 yellows) and future red card risk"
- **Special consideration for 2-yellow reds**: If a player's red came from 2 yellows in one game, they likely play on the edge and carry higher yellow card risk
- ALWAYS check 'news' field to understand context of recent red cards

**DISCIPLINARY REASONING EXAMPLES:**
\u274C BAD: "Transfer in Palmer (excellent form)"
\u2705 GOOD: "Avoid Palmer despite excellent form (7.5 PPG). He has 4 yellow cards and is one booking away from a 1-match ban. Over the next 6 gameweeks, his expected 45 points must be reduced to approximately 38 points accounting for likely suspension. Better alternatives exist with similar output and lower risk."

\u274C BAD: "Captain Salah (best expected points)"
\u2705 GOOD: "Captain Haaland over Salah. While Salah has slightly better fixtures (expected 14 pts vs Haaland's 13), Salah carries 3 yellow cards and is 2 bookings from a 1-match ban which increases suspension risk. Haaland has only 1 yellow card and presents lower disciplinary risk for the same expected output."

**YOU MUST:** Factor disciplinary risk into ALL transfer recommendations and captain selections by adjusting expected points calculations.

**\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550**

YOUR TASK:
Provide a strategic gameweek plan in this EXACT JSON format with VERBOSE, DATA-DRIVEN reasoning:

{
  "transfers": [
    {
      "player_out_id": <NUMERIC ID>,
      "player_in_id": <NUMERIC ID>,
      "expected_points_gain": <number>,
      "expected_points_gain_timeframe": "6 gameweeks",
      "reasoning": "<VERBOSE explanation with specific stats, fixtures, ownership, prices, AND THE FULL CALCULATION showing new player's expected points over 6 GWs minus old player's expected points over 6 GWs. IMPORTANT: Focus ONLY on comparing the player being transferred OUT vs the player being transferred IN (their points, form, fixtures, etc). DO NOT mention which starting XI player will be benched or lineup changes - this is handled automatically by the system and will be appended to your reasoning.>",
      "priority": "high|medium|low",
      "cost_impact": <number>
    }
  ],
  "captain_id": <NUMERIC ID from squad>,
  "vice_captain_id": <NUMERIC ID from squad>,
  "chip_to_play": <"wildcard"|"freehit"|"benchboost"|"triplecaptain"|null>,
  "formation": "<e.g., 3-4-3, 4-4-2>",
  "predicted_points": <number - this is the GROSS expected points for your starting XI BEFORE transfer penalties. Do NOT deduct transfer costs here - the system will calculate the net points automatically>,
  "confidence": <0-100>,
  "strategic_insights": [
    "<DETAILED insight with data - e.g., 'Top 3 managers all own Haaland (\xA314.0m, Form 9.5, 3 green fixtures) - essential coverage'>",
    "<DETAILED insight with data - e.g., 'Differential pick: Isak (owned by 0/5 leaders, Form 7.2, vs SHU/BUR/LUT avg diff 1.8)'>",
    "<DETAILED insight with data - e.g., 'GW15-18 fixture swing: Sell Arsenal assets (4 red fixtures), buy Liverpool (4 green fixtures)'>"
  ],
  "reasoning": "<OVERALL STRATEGY with specific data, league context, fixture analysis, and risk assessment. 
  
  \u{1F6A8} CRITICAL INSTRUCTION FOR PREDICTED POINTS IN REASONING \u{1F6A8}
  When stating predicted points in your reasoning text, you MUST calculate and state the NET points after deducting transfer penalties.
  
  **TRANSFER PENALTY CALCULATION:**
  - You have ${freeTransfers} free transfer${freeTransfers !== 1 ? "s" : ""}
  - Each additional transfer beyond free transfers costs -4 points
  - Formula: Transfer penalty = max(0, (number of transfers - free transfers) \xD7 4)
  - **IMPORTANT**: If you're using Wildcard or Free Hit chip, ALL transfers are free (transfer penalty = 0)
  
  **Example calculations:**
  - 1 transfer with 1 free transfer = 0 penalty
  - 2 transfers with 1 free transfer = (2-1) \xD7 4 = -4 points
  - 3 transfers with 1 free transfer = (3-1) \xD7 4 = -8 points
  
  \u2705 CORRECT EXAMPLES (assuming starting XI scores 66 points):
  - 0 transfers: 'This plan will deliver 66 points this gameweek'
  - 1 transfer (with 1 free): 'This plan will deliver 66 points this gameweek'
  - 2 transfers (with 1 free): 'This plan will deliver 62 points this gameweek (66 points from the starting XI minus the 4-point transfer penalty)'
  - 3 transfers (with 1 free): 'This plan will deliver 58 points this gameweek (66 points from the starting XI minus the 8-point transfer penalty)'
  
  \u274C WRONG EXAMPLES:
  - DO NOT say '66 points' when you're recommending 2 transfers with 1 free transfer (should be 62 points)
  - DO NOT forget to deduct the transfer penalty from your stated points
  - DO NOT say 'before penalties' or 'after penalties' - just state the FINAL NET points
  
  The key rule: Always calculate the NET points (gross points - transfer penalty) and state that FINAL number in your reasoning.>",
  "previous_plan_reviewed": <true|false - true if a previous plan existed, false if this is first plan>,
  "recommendations_changed": <true|false - true ONLY if your recommendations differ from previous plan>,
  "change_reasoning": "<REQUIRED if recommendations_changed=true: SPECIFIC data that changed with before/after values. Examples: 'Salah injured (75% chance \u2192 25% chance)' or 'Haaland returned from injury (unavailable \u2192 available, form 0.0 \u2192 8.5)'. If recommendations_changed=false, write 'No significant data changes - maintaining previous recommendations for consistency'>"
}

CRITICAL REQUIREMENTS:
- **PLAYER IDS**: You MUST use the ACTUAL PLAYER IDs from the "CURRENT SQUAD" and "TOP AVAILABLE PLAYERS BY POSITION" lists above
  - For player_out_id: Use the ID from your CURRENT SQUAD list (e.g., if removing "ID:469 Leno", use player_out_id: 469)
  - For player_in_id: Use the ID from the TOP AVAILABLE PLAYERS list (e.g., if bringing in "ID:220 Raya", use player_in_id: 220)
  - For captain_id/vice_captain_id: Use IDs from your CURRENT SQUAD ONLY
  - **NEVER MAKE UP OR INVENT PLAYER IDs** - always use the exact IDs provided in the lists above
- In ALL "reasoning" and "strategic_insights" text fields: ALWAYS use PLAYER NAMES, NEVER use IDs or numbers to refer to players
- ALL reasoning text must be PURE NATURAL LANGUAGE - no parentheses, no abbreviations, no technical formatting
- Write reasoning like you're talking to a friend - clear conversational sentences with data woven naturally
- Include league competitive insights in strategic thinking
- Reference set piece takers when relevant by using their names
- Consider dream team performers as form indicators
- Every recommendation must include specific stats and numbers but written naturally into sentences`;
    let learningPrompt = "";
    try {
      console.log(`[GameweekAnalyzer] Fetching AI learning context for user ${userId}...`);
      const learningContext = await aiLearningFeedback.generateLearningContext(userId, allPlayers);
      console.log(`[GameweekAnalyzer] Learning context fetched: ${learningContext.totalGameweeksAnalyzed} gameweeks analyzed`);
      if (learningContext.keyLessons.length > 0) {
        console.log(`[GameweekAnalyzer] Key lessons to apply:`, learningContext.keyLessons);
      }
      if (learningContext.recentMistakes.length > 0) {
        console.log(`[GameweekAnalyzer] Recent mistakes to avoid:`, learningContext.recentMistakes.map((m) => `GW${m.gameweek}: ${m.mistake}`));
      }
      learningPrompt = aiLearningFeedback.formatForPrompt(learningContext);
      console.log(`[GameweekAnalyzer] Learning prompt generated successfully`);
    } catch (error) {
      console.error(`[GameweekAnalyzer] Failed to fetch learning context:`, error instanceof Error ? error.message : "Unknown error");
      console.log(`[GameweekAnalyzer] Continuing with plan generation without learning context`);
    }
    const finalPromptWithLearning = prompt + learningPrompt;
    const maxRetries = 1;
    let lastError = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const finalPrompt = attempt > 0 ? `${finalPromptWithLearning}

IMPORTANT: Previous response exceeded token limit. Please be more concise while maintaining all required fields and key insights. Limit strategic_insights to 2-3 items and keep reasoning focused.` : finalPromptWithLearning;
        console.log(`[GameweekAnalyzer] Calling OpenAI API (attempt ${attempt + 1}/${maxRetries + 1})`);
        const response = await openai2.chat.completions.create({
          model: "gpt-4o",
          messages: [{ role: "user", content: finalPrompt }],
          response_format: { type: "json_object" },
          max_completion_tokens: 16384,
          temperature: 0,
          // Deterministic predictions for consistency
          seed: 42
          // Perfect reproducibility for same inputs
        });
        const finishReason = response.choices[0].finish_reason;
        console.log("[GameweekAnalyzer] OpenAI response received. Finish reason:", finishReason);
        if (finishReason === "length") {
          if (attempt < maxRetries) {
            console.warn("[GameweekAnalyzer] Response truncated - retrying with conciseness instruction");
            continue;
          } else {
            console.error("[GameweekAnalyzer] Response truncated even after retry");
            throw new Error("AI response too long even with conciseness instruction. Please try again or contact support if this persists.");
          }
        }
        const messageContent = response.choices[0].message.content;
        if (!messageContent) {
          console.error("[GameweekAnalyzer] Empty AI response content");
          throw new Error("AI returned empty response. Please try again.");
        }
        console.log("[GameweekAnalyzer] Parsing AI response...");
        let result;
        try {
          result = JSON.parse(messageContent);
        } catch (parseError) {
          console.error("[GameweekAnalyzer] Failed to parse AI response as JSON:", parseError);
          console.error("[GameweekAnalyzer] Response content preview:", messageContent.substring(0, 500));
          throw new Error("AI returned invalid response format. Please try again.");
        }
        console.log("[GameweekAnalyzer] AI response parsed successfully");
        if (!result.captain_id || !result.vice_captain_id) {
          console.error("[GameweekAnalyzer] Missing required fields in AI response:", Object.keys(result));
          throw new Error("AI response incomplete - missing captain selections. Please try again.");
        }
        if (!Array.isArray(result.transfers)) {
          console.log("[GameweekAnalyzer] No transfers in response, initializing empty array");
          result.transfers = [];
        }
        console.log("[GameweekAnalyzer] Validating player IDs in transfers...");
        for (const transfer of result.transfers) {
          let fixed = false;
          const outPlayerExists = currentTeam.players.some((p) => p.player_id === transfer.player_out_id);
          if (!outPlayerExists) {
            console.warn(`[GameweekAnalyzer] Invalid player_out_id: ${transfer.player_out_id} - attempting to fix from reasoning`);
            const reasoning = transfer.reasoning || "";
            for (const pick of currentTeam.players) {
              const player = allPlayers.find((p) => p.id === pick.player_id);
              if (player && reasoning.includes(player.web_name)) {
                transfer.player_out_id = player.id;
                console.log(`[GameweekAnalyzer] Fixed player_out_id to ${player.id} (${player.web_name})`);
                fixed = true;
                break;
              }
            }
          }
          const inPlayerExists = allPlayers.some((p) => p.id === transfer.player_in_id);
          if (!inPlayerExists) {
            console.warn(`[GameweekAnalyzer] Invalid player_in_id: ${transfer.player_in_id} - attempting to fix from reasoning`);
            const reasoning = transfer.reasoning || "";
            for (const player of allPlayers) {
              if (reasoning.includes(player.web_name) && !currentTeam.players.some((p) => p.player_id === player.id)) {
                transfer.player_in_id = player.id;
                console.log(`[GameweekAnalyzer] Fixed player_in_id to ${player.id} (${player.web_name})`);
                fixed = true;
                break;
              }
            }
          }
          if (!fixed && (!outPlayerExists || !inPlayerExists)) {
            console.error(`[GameweekAnalyzer] Could not fix invalid player IDs for transfer:`, transfer);
          }
          if (!transfer.expected_points_gain_timeframe) {
            console.warn(`[GameweekAnalyzer] Missing expected_points_gain_timeframe for transfer, defaulting to "6 gameweeks"`);
            transfer.expected_points_gain_timeframe = "6 gameweeks";
          }
        }
        console.log("[GameweekAnalyzer] Post-processing AI reasoning to ensure transfer cost explanation...");
        const transferCount = result.transfers?.length || 0;
        const transferCost = transferCount > freeTransfers ? (transferCount - freeTransfers) * 4 : 0;
        const chipUsed = result.chip_to_play;
        const isChipActive = chipUsed === "wildcard" || chipUsed === "freehit";
        const finalTransferCost = isChipActive ? 0 : transferCost;
        console.log(`[GameweekAnalyzer] Transfer analysis: ${transferCount} transfers, ${freeTransfers} free, chip: ${chipUsed || "none"}, cost: ${finalTransferCost} points`);
        if (result.reasoning && finalTransferCost > 0) {
          const mentionsTransferCost = result.reasoning.includes("point") && (result.reasoning.includes("transfer cost") || result.reasoning.includes("point hit") || result.reasoning.includes("point deduction") || result.reasoning.includes("transfer penalty") || result.reasoning.includes("additional transfer"));
          console.log(`[GameweekAnalyzer] Reasoning validation: mentionsTransferCost=${mentionsTransferCost}`);
          if (!mentionsTransferCost) {
            console.log(`[GameweekAnalyzer] \u2139\uFE0F  AI reasoning doesn't explain transfer costs - will add after GROSS calculation`);
            result._needsTransferCostExplanation = true;
          } else {
            console.log(`[GameweekAnalyzer] \u2705 Reasoning already mentions transfer costs`);
          }
        }
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");
        if (!(error instanceof Error && error.message.includes("too long"))) {
          break;
        }
      }
    }
    console.error("[GameweekAnalyzer] AI API error after retries:", lastError);
    throw new Error(`AI analysis failed: ${lastError?.message || "Unknown error"}`);
  }
  async generateLineup(currentTeam, transfers2, formation, captainId, viceCaptainId, allPlayers, predictions2) {
    const transferredOutIds = new Set(transfers2.map((t) => t.player_out_id));
    const transferredInIds = transfers2.map((t) => t.player_in_id);
    const finalSquad = currentTeam.players.filter((p) => p.player_id && !transferredOutIds.has(p.player_id)).map((p) => p.player_id);
    finalSquad.push(...transferredInIds);
    const formationParts = formation.split("-").map(Number);
    const [defenders, midfielders, forwards] = formationParts;
    const playersByPosition = {
      1: [],
      // GK
      2: [],
      // DEF
      3: [],
      // MID
      4: []
      // FWD
    };
    for (const playerId of finalSquad) {
      const player = allPlayers.find((p) => p.id === playerId);
      if (!player) continue;
      const prediction = predictions2.find((p) => p.playerId === playerId);
      const predictedPoints = prediction?.predictedPoints || 0;
      playersByPosition[player.element_type].push({
        id: playerId,
        predictedPoints
      });
    }
    for (const posType in playersByPosition) {
      playersByPosition[posType].sort((a, b) => b.predictedPoints - a.predictedPoints);
    }
    const lineup = [];
    let position = 1;
    if (playersByPosition[1].length > 0) {
      lineup.push({
        player_id: playersByPosition[1][0].id,
        position: position++,
        is_captain: playersByPosition[1][0].id === captainId,
        is_vice_captain: playersByPosition[1][0].id === viceCaptainId,
        multiplier: playersByPosition[1][0].id === captainId ? 2 : 1
      });
    }
    for (let i = 0; i < defenders && i < playersByPosition[2].length; i++) {
      lineup.push({
        player_id: playersByPosition[2][i].id,
        position: position++,
        is_captain: playersByPosition[2][i].id === captainId,
        is_vice_captain: playersByPosition[2][i].id === viceCaptainId,
        multiplier: playersByPosition[2][i].id === captainId ? 2 : 1
      });
    }
    for (let i = 0; i < midfielders && i < playersByPosition[3].length; i++) {
      lineup.push({
        player_id: playersByPosition[3][i].id,
        position: position++,
        is_captain: playersByPosition[3][i].id === captainId,
        is_vice_captain: playersByPosition[3][i].id === viceCaptainId,
        multiplier: playersByPosition[3][i].id === captainId ? 2 : 1
      });
    }
    for (let i = 0; i < forwards && i < playersByPosition[4].length; i++) {
      lineup.push({
        player_id: playersByPosition[4][i].id,
        position: position++,
        is_captain: playersByPosition[4][i].id === captainId,
        is_vice_captain: playersByPosition[4][i].id === viceCaptainId,
        multiplier: playersByPosition[4][i].id === captainId ? 2 : 1
      });
    }
    console.log(`[GameweekAnalyzer] Generated starting XI with ${lineup.length} players in ${formation} formation`);
    return lineup;
  }
  async validateFPLRules(currentTeam, transfers2, allPlayers, budget, freeTransfers) {
    const errors = [];
    const warnings = [];
    const updatedSquad = [...currentTeam.players];
    let remainingBudget = budget;
    for (const transfer of transfers2) {
      const playerOutIndex = updatedSquad.findIndex((p) => p.player_id === transfer.player_out_id);
      if (playerOutIndex === -1) {
        errors.push(`Player ${transfer.player_out_id} not found in current squad`);
        continue;
      }
      const playerIn = allPlayers.find((p) => p.id === transfer.player_in_id);
      if (!playerIn) {
        errors.push(`Player ${transfer.player_in_id} does not exist in FPL database`);
        continue;
      }
      const playerOut = allPlayers.find((p) => p.id === transfer.player_out_id);
      if (playerOut) {
        const sellPrice = playerOut.now_cost / 10;
        const buyPrice = playerIn.now_cost / 10;
        remainingBudget += sellPrice - buyPrice;
        updatedSquad[playerOutIndex] = {
          ...updatedSquad[playerOutIndex],
          player_id: playerIn.id
        };
      }
    }
    if (remainingBudget < 0) {
      errors.push(`Budget exceeded by \xA3${Math.abs(remainingBudget).toFixed(1)}m`);
    }
    const positionCounts = { 1: 0, 2: 0, 3: 0, 4: 0 };
    const teamCounts = {};
    console.log("[Validation] Squad after transfers:");
    for (const pick of updatedSquad) {
      if (pick.player_id) {
        const player = allPlayers.find((p) => p.id === pick.player_id);
        if (player) {
          const posNames = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };
          console.log(`  - ${player.web_name} (${posNames[player.element_type]})`);
          positionCounts[player.element_type] = (positionCounts[player.element_type] || 0) + 1;
          teamCounts[player.team] = (teamCounts[player.team] || 0) + 1;
        } else {
          console.warn(`  - Player ID ${pick.player_id} not found in allPlayers!`);
        }
      }
    }
    console.log("[Validation] Position counts:", positionCounts);
    if (positionCounts[1] !== 2) {
      errors.push(`Must have exactly 2 goalkeepers (currently ${positionCounts[1]})`);
    }
    if (positionCounts[2] !== 5) {
      errors.push(`Must have exactly 5 defenders (currently ${positionCounts[2]})`);
    }
    if (positionCounts[3] !== 5) {
      errors.push(`Must have exactly 5 midfielders (currently ${positionCounts[3]})`);
    }
    if (positionCounts[4] !== 3) {
      errors.push(`Must have exactly 3 forwards (currently ${positionCounts[4]})`);
    }
    for (const [teamId, count] of Object.entries(teamCounts)) {
      if (count > 3) {
        errors.push(`Maximum 3 players from same team (Team ${teamId} has ${count})`);
      }
    }
    if (transfers2.length > freeTransfers) {
      const hits = (transfers2.length - freeTransfers) * 4;
      warnings.push(`${transfers2.length - freeTransfers} extra transfers will cost ${hits} points`);
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
  calculateTransferCost(transferCount, freeTransfers, maxHit) {
    if (transferCount <= freeTransfers) {
      return 0;
    }
    const extraTransfers = transferCount - freeTransfers;
    const cost = extraTransfers * 4;
    if (cost > maxHit) {
      throw new Error(`Transfer cost (${cost} points) exceeds maximum allowed hit (${maxHit} points)`);
    }
    return cost;
  }
  async validateChipUsage(userId, chipToPlay, chipsUsed2) {
    const errors = [];
    const warnings = [];
    if (chipToPlay) {
      const alreadyUsed = chipsUsed2.some((c) => c.chipType === chipToPlay);
      if (alreadyUsed) {
        errors.push(`${chipToPlay} chip has already been used this season`);
      } else {
        warnings.push(`Planning to use ${chipToPlay} chip this gameweek`);
      }
    }
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
};
var gameweekAnalyzer = new GameweekAnalyzerService();

// server/transfer-application.ts
init_storage();
init_fpl_api();
init_gameweek_data_snapshot();
var FPL_BASE_URL2 = "https://fantasy.premierleague.com/api";
var TransferApplicationService = class {
  async applyGameweekPlan(userId, gameweekPlanId) {
    console.log(`[Transfer Application] Starting application for user ${userId}, plan ${gameweekPlanId}`);
    const result = {
      success: false,
      transfersApplied: false,
      captainSet: false,
      chipPlayed: false,
      errors: [],
      details: {}
    };
    try {
      const plan = await storage.getGameweekPlanById(gameweekPlanId);
      if (!plan) {
        result.errors.push("Gameweek plan not found");
        return result;
      }
      if (plan.userId !== userId) {
        result.errors.push("Unauthorized: Plan belongs to different user");
        return result;
      }
      if (plan.status === "applied") {
        result.errors.push("Plan has already been applied");
        return result;
      }
      if (plan.status !== "pending" && plan.status !== "previewed") {
        result.errors.push(`Cannot apply plan with status: ${plan.status}`);
        return result;
      }
      const isAuthenticated = await fplAuth.isAuthenticated(userId);
      if (!isAuthenticated) {
        result.errors.push("User is not authenticated with FPL. Please login first.");
        return result;
      }
      const userSettings = await storage.getUserSettings(userId);
      if (!userSettings || !userSettings.manager_id) {
        result.errors.push("Manager ID not found in user settings. Please configure your settings.");
        return result;
      }
      const managerId = userSettings.manager_id;
      const snapshot = await gameweekSnapshot.getSnapshot(plan.gameweek);
      const players = snapshot.data.players;
      await this.validatePlan(plan, managerId, players);
      if (plan.transfers && Array.isArray(plan.transfers) && plan.transfers.length > 0) {
        const transferSuccess = await this.makeTransfers(
          userId,
          plan.transfers,
          plan.gameweek,
          managerId,
          plan.chipToPlay === "wildcard" || plan.chipToPlay === "freehit" ? plan.chipToPlay : null,
          players
        );
        result.transfersApplied = transferSuccess;
        result.details.transfersCount = plan.transfers.length;
        if (!transferSuccess) {
          result.errors.push("Failed to apply transfers");
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
          result.errors.push("Failed to set captain");
        }
      } else {
        result.captainSet = true;
      }
      if (plan.chipToPlay && plan.chipToPlay !== "wildcard" && plan.chipToPlay !== "freehit") {
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
        await storage.updateGameweekPlanStatus(gameweekPlanId, "applied");
        result.success = true;
        console.log(`[Transfer Application] \u2713 Successfully applied plan ${gameweekPlanId}`);
      } else {
        console.error(`[Transfer Application] \u2717 Partial failure for plan ${gameweekPlanId}`, result.errors);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Transfer Application] \u2717 Error applying plan ${gameweekPlanId}:`, error);
      result.errors.push(errorMessage);
      await storage.saveChangeHistory({
        userId,
        gameweek: 0,
        changeType: "transfer",
        changeData: { error: errorMessage },
        appliedSuccessfully: false,
        errorMessage
      });
    }
    return result;
  }
  async makeTransfers(userId, transfers2, gameweek, managerId, chipToUse, players) {
    console.log(`[Transfer Application] Making ${transfers2.length} transfers for user ${userId}, gameweek ${gameweek}`);
    try {
      const userSettings = await storage.getUserSettings(userId);
      const teamId = managerId || userSettings?.manager_id;
      if (!teamId) {
        throw new Error("Manager ID not found");
      }
      const sessionCookies = await fplAuth.getSessionCookies(userId);
      const csrfToken = await fplAuth.getCsrfToken(userId);
      if (!players) {
        const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
        players = snapshot.data.players;
      }
      if (!players) {
        throw new Error("Players data not available");
      }
      const transferPayloads = transfers2.map((transfer) => {
        const playerIn = players.find((p) => p.id === transfer.player_in_id);
        const playerOut = players.find((p) => p.id === transfer.player_out_id);
        if (!playerIn || !playerOut) {
          throw new Error(`Player not found: in=${transfer.player_in_id}, out=${transfer.player_out_id}`);
        }
        return {
          element_in: transfer.player_in_id,
          element_out: transfer.player_out_id,
          purchase_price: playerIn.now_cost,
          selling_price: playerOut.now_cost
        };
      });
      const requestBody = {
        chip: chipToUse || null,
        transfers: transferPayloads,
        entry: teamId,
        event: gameweek
      };
      console.log(`[Transfer Application] Sending transfer request to FPL API for team ${teamId}`);
      const response = await fetch(`${FPL_BASE_URL2}/my-team/${teamId}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "Cookie": sessionCookies,
          "X-CSRFToken": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://fantasy.premierleague.com/"
        },
        body: JSON.stringify(requestBody)
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
        console.error(`[Transfer Application] \u2717 Transfer request failed:`, errorMessage);
        await storage.saveChangeHistory({
          userId,
          gameweek,
          changeType: "transfer",
          changeData: { transfers: transfers2, response: errorText },
          appliedSuccessfully: false,
          errorMessage
        });
        if (response.status === 401) {
          console.log(`[Transfer Application] Session expired, attempting refresh...`);
          await fplAuth.refreshSession(userId);
        }
        throw new Error(errorMessage);
      }
      const responseData = await response.json();
      console.log(`[Transfer Application] \u2713 Transfers applied successfully`);
      await storage.saveChangeHistory({
        userId,
        gameweek,
        changeType: "transfer",
        changeData: {
          transfers: transfers2,
          response: responseData,
          chip: chipToUse
        },
        appliedSuccessfully: true,
        errorMessage: null
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Transfer Application] \u2717 Error making transfers:`, error);
      await storage.saveChangeHistory({
        userId,
        gameweek,
        changeType: "transfer",
        changeData: { transfers: transfers2, error: errorMessage },
        appliedSuccessfully: false,
        errorMessage
      });
      return false;
    }
  }
  async setCaptain(userId, captainId, viceCaptainId, gameweek, managerId) {
    console.log(`[Transfer Application] Setting captain ${captainId} and vice-captain ${viceCaptainId} for user ${userId}`);
    try {
      const userSettings = await storage.getUserSettings(userId);
      const teamId = managerId || userSettings?.manager_id;
      if (!teamId) {
        throw new Error("Manager ID not found");
      }
      const sessionCookies = await fplAuth.getSessionCookies(userId);
      const csrfToken = await fplAuth.getCsrfToken(userId);
      const currentPicks = await fplApi.getManagerPicks(teamId, gameweek);
      const updatedPicks = currentPicks.picks.map((pick) => ({
        element: pick.element,
        position: pick.position,
        is_captain: pick.element === captainId,
        is_vice_captain: pick.element === viceCaptainId
      }));
      const requestBody = {
        picks: updatedPicks
      };
      console.log(`[Transfer Application] Sending captain update to FPL API for team ${teamId}`);
      const response = await fetch(`${FPL_BASE_URL2}/my-team/${teamId}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "Cookie": sessionCookies,
          "X-CSRFToken": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://fantasy.premierleague.com/"
        },
        body: JSON.stringify(requestBody)
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
        console.error(`[Transfer Application] \u2717 Captain update failed:`, errorMessage);
        await storage.saveChangeHistory({
          userId,
          gameweek,
          changeType: "captain",
          changeData: { captainId, viceCaptainId, response: errorText },
          appliedSuccessfully: false,
          errorMessage
        });
        if (response.status === 401) {
          console.log(`[Transfer Application] Session expired, attempting refresh...`);
          await fplAuth.refreshSession(userId);
        }
        throw new Error(errorMessage);
      }
      const responseData = await response.json();
      console.log(`[Transfer Application] \u2713 Captain set successfully`);
      await storage.saveChangeHistory({
        userId,
        gameweek,
        changeType: "captain",
        changeData: {
          captainId,
          viceCaptainId,
          response: responseData
        },
        appliedSuccessfully: true,
        errorMessage: null
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Transfer Application] \u2717 Error setting captain:`, error);
      await storage.saveChangeHistory({
        userId,
        gameweek,
        changeType: "captain",
        changeData: { captainId, viceCaptainId, error: errorMessage },
        appliedSuccessfully: false,
        errorMessage
      });
      return false;
    }
  }
  async playChip(userId, chipType, gameweek, managerId) {
    console.log(`[Transfer Application] Playing chip ${chipType} for user ${userId}, gameweek ${gameweek}`);
    try {
      const userSettings = await storage.getUserSettings(userId);
      const teamId = managerId || userSettings?.manager_id;
      if (!teamId) {
        throw new Error("Manager ID not found");
      }
      const chipMap = {
        "wildcard": "wildcard",
        "freehit": "freehit",
        "benchboost": "bboost",
        "triplecaptain": "3xc"
      };
      const fplChipName = chipMap[chipType] || chipType;
      const sessionCookies = await fplAuth.getSessionCookies(userId);
      const csrfToken = await fplAuth.getCsrfToken(userId);
      const currentPicks = await fplApi.getManagerPicks(teamId, gameweek);
      const requestBody = {
        picks: currentPicks.picks.map((pick) => ({
          element: pick.element,
          position: pick.position,
          is_captain: pick.is_captain,
          is_vice_captain: pick.is_vice_captain
        })),
        chip: fplChipName
      };
      console.log(`[Transfer Application] Sending chip activation to FPL API for team ${teamId}`);
      const response = await fetch(`${FPL_BASE_URL2}/my-team/${teamId}/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json;charset=UTF-8",
          "Cookie": sessionCookies,
          "X-CSRFToken": csrfToken,
          "X-Requested-With": "XMLHttpRequest",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          "Referer": "https://fantasy.premierleague.com/"
        },
        body: JSON.stringify(requestBody)
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
        console.error(`[Transfer Application] \u2717 Chip activation failed:`, errorMessage);
        await storage.saveChangeHistory({
          userId,
          gameweek,
          changeType: "chip",
          changeData: { chipType, fplChipName, response: errorText },
          appliedSuccessfully: false,
          errorMessage
        });
        if (response.status === 401) {
          console.log(`[Transfer Application] Session expired, attempting refresh...`);
          await fplAuth.refreshSession(userId);
        }
        throw new Error(errorMessage);
      }
      const responseData = await response.json();
      console.log(`[Transfer Application] \u2713 Chip played successfully`);
      await storage.saveChangeHistory({
        userId,
        gameweek,
        changeType: "chip",
        changeData: {
          chipType,
          fplChipName,
          response: responseData
        },
        appliedSuccessfully: true,
        errorMessage: null
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Transfer Application] \u2717 Error playing chip:`, error);
      await storage.saveChangeHistory({
        userId,
        gameweek,
        changeType: "chip",
        changeData: { chipType, error: errorMessage },
        appliedSuccessfully: false,
        errorMessage
      });
      return false;
    }
  }
  async validatePlan(plan, managerId, players) {
    const playerIds = new Set(players.map((p) => p.id));
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
    console.log(`[Transfer Application] \u2713 Plan validation passed for manager ${managerId}`);
  }
};
var transferApplication = new TransferApplicationService();

// server/ai-impact-analysis.ts
init_fpl_api();
init_storage();
init_gameweek_data_snapshot();
var AIImpactAnalysisService = class {
  /**
   * Analyze the impact of AI recommendations for a completed gameweek
   * Calculates actual points WITH AI vs WITHOUT AI recommendations
   */
  async analyzeGameweekImpact(planId) {
    console.log(`[AIImpactAnalysis] Starting analysis for plan ${planId}`);
    const plan = await storage.getGameweekPlanById(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }
    if (plan.status !== "applied") {
      throw new Error(`Plan ${planId} was not applied (status: ${plan.status})`);
    }
    if (!plan.originalTeamSnapshot) {
      throw new Error(`Plan ${planId} missing original team snapshot - cannot calculate impact`);
    }
    const snapshot = await gameweekSnapshot.getSnapshot(plan.gameweek);
    const gameweeks = snapshot.data.gameweeks;
    const allPlayers = snapshot.data.players;
    const targetGameweek = gameweeks.find((gw) => gw.id === plan.gameweek);
    if (!targetGameweek?.finished) {
      throw new Error(`Gameweek ${plan.gameweek} is not finished yet`);
    }
    const playerPoints = await this.fetchGameweekPlayerPoints(plan.gameweek);
    const actualPointsWithAI = await this.calculateTeamPoints(
      plan.userId,
      plan.gameweek,
      playerPoints
    );
    const actualPointsWithoutAI = await this.calculateHypotheticalPoints(
      plan.originalTeamSnapshot,
      playerPoints
    );
    const pointsDelta = actualPointsWithAI - actualPointsWithoutAI;
    const captainComparison = await this.analyzeCaptainImpact(
      plan,
      playerPoints,
      allPlayers
    );
    const transfersImpact = plan.transfers.length > 0 ? await this.analyzeTransfersImpact(plan, playerPoints, allPlayers) : void 0;
    await storage.updateGameweekPlanAnalysis(planId, {
      actualPointsWithAI,
      actualPointsWithoutAI,
      pointsDelta,
      analysisCompletedAt: /* @__PURE__ */ new Date()
    });
    console.log(`[AIImpactAnalysis] Analysis complete for plan ${planId}: ${pointsDelta >= 0 ? "+" : ""}${pointsDelta} points impact`);
    return {
      planId: plan.id,
      gameweek: plan.gameweek,
      actualPointsWithAI,
      actualPointsWithoutAI,
      pointsDelta,
      captainComparison,
      transfersImpact
    };
  }
  /**
   * Fetch actual points for all players in a gameweek from FPL API
   */
  async fetchGameweekPlayerPoints(gameweek) {
    console.log(`[AIImpactAnalysis] Fetching player points for gameweek ${gameweek}`);
    const liveData = await fplApi.getLiveGameweekData(gameweek);
    const pointsMap = /* @__PURE__ */ new Map();
    if (liveData.elements && Array.isArray(liveData.elements)) {
      for (const element of liveData.elements) {
        if (element.id && element.stats) {
          pointsMap.set(element.id, {
            playerId: element.id,
            points: element.stats.total_points || 0,
            minutesPlayed: element.stats.minutes || 0
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
  async calculateTeamPoints(userId, gameweek, playerPoints) {
    const team = await storage.getTeam(userId, gameweek);
    if (!team) {
      throw new Error(`No team found for user ${userId} gameweek ${gameweek}`);
    }
    const userSettings = await storage.getUserSettings(userId);
    if (!userSettings?.manager_id) {
      throw new Error("Manager ID not set");
    }
    const picks = await fplApi.getManagerPicks(userSettings.manager_id, gameweek);
    return picks.entry_history.points;
  }
  /**
   * Calculate hypothetical points using original team snapshot (what would have happened without AI)
   */
  async calculateHypotheticalPoints(originalSnapshot, playerPoints) {
    let totalPoints = 0;
    const captainData = playerPoints.get(originalSnapshot.captain_id);
    const viceCaptainData = playerPoints.get(originalSnapshot.vice_captain_id);
    const captainPlayed = captainData && captainData.minutesPlayed > 0;
    const effectiveCaptain = captainPlayed ? originalSnapshot.captain_id : originalSnapshot.vice_captain_id;
    for (const pick of originalSnapshot.players) {
      if (!pick.player_id) continue;
      const playerData = playerPoints.get(pick.player_id);
      if (!playerData) continue;
      let points = playerData.points;
      if (pick.player_id === effectiveCaptain) {
        const captainMultiplier = pick.multiplier === 3 ? 3 : 2;
        points = playerData.points * captainMultiplier;
      } else if (pick.multiplier === 0) {
        continue;
      }
      totalPoints += points;
    }
    return totalPoints;
  }
  /**
   * Analyze the impact of captain change
   */
  async analyzeCaptainImpact(plan, playerPoints, players) {
    const playersMap = new Map(players.map((p) => [p.id, p]));
    const originalCaptainId = plan.originalTeamSnapshot.captain_id;
    const aiCaptainId = plan.captainId;
    const originalCaptainPoints = playerPoints.get(originalCaptainId)?.points || 0;
    const aiCaptainPoints = playerPoints.get(aiCaptainId)?.points || 0;
    const deltaFromCaptainChange = (aiCaptainPoints - originalCaptainPoints) * 2;
    return {
      original: {
        playerId: originalCaptainId,
        playerName: playersMap.get(originalCaptainId)?.web_name || `Player ${originalCaptainId}`,
        points: originalCaptainPoints
      },
      ai: {
        playerId: aiCaptainId,
        playerName: playersMap.get(aiCaptainId)?.web_name || `Player ${aiCaptainId}`,
        points: aiCaptainPoints
      },
      deltaFromCaptainChange
    };
  }
  /**
   * Analyze the impact of transfers
   */
  async analyzeTransfersImpact(plan, playerPoints, players) {
    const playersMap = new Map(players.map((p) => [p.id, p]));
    const playersAdded = plan.transfers.map((t) => {
      const points = playerPoints.get(t.player_in_id)?.points || 0;
      return {
        playerId: t.player_in_id,
        playerName: playersMap.get(t.player_in_id)?.web_name || `Player ${t.player_in_id}`,
        points
      };
    });
    const playersRemoved = plan.transfers.map((t) => {
      const points = playerPoints.get(t.player_out_id)?.points || 0;
      return {
        playerId: t.player_out_id,
        playerName: playersMap.get(t.player_out_id)?.web_name || `Player ${t.player_out_id}`,
        points
      };
    });
    const pointsGained = playersAdded.reduce((sum, p) => sum + p.points, 0);
    const pointsLost = playersRemoved.reduce((sum, p) => sum + p.points, 0);
    const netTransferImpact = pointsGained - pointsLost;
    return {
      playersAdded,
      playersRemoved,
      netTransferImpact
    };
  }
  /**
   * Analyze impact for all completed gameweeks for a user
   */
  async analyzeAllCompletedGameweeks(userId) {
    console.log(`[AIImpactAnalysis] Analyzing all completed gameweeks for user ${userId}`);
    const plans = await storage.getGameweekPlansByUser(userId);
    const appliedPlans = plans.filter((p) => p.status === "applied" && p.originalTeamSnapshot);
    const planningGameweek = await fplApi.getPlanningGameweek();
    const currentGw = planningGameweek?.id || 1;
    const snapshot = await gameweekSnapshot.getSnapshot(currentGw);
    const gameweeks = snapshot.data.gameweeks;
    const finishedGameweeks = new Set(gameweeks.filter((gw) => gw.finished).map((gw) => gw.id));
    const results = [];
    for (const plan of appliedPlans) {
      if (plan.analysisCompletedAt) {
        console.log(`[AIImpactAnalysis] Plan ${plan.id} (GW${plan.gameweek}) already analyzed`);
        continue;
      }
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
};
var aiImpactAnalysis = new AIImpactAnalysisService();

// server/prediction-accuracy.ts
init_storage();
init_fpl_api();
var PredictionAccuracyService = class {
  async updateActualPoints(userId, gameweek) {
    const settings = await storage.getUserSettings(userId);
    if (!settings?.manager_id) {
      throw new Error("Manager ID not configured");
    }
    const managerHistory = await fplApi.getManagerHistory(settings.manager_id);
    const gwHistory = managerHistory.current.find((gw) => gw.event === gameweek);
    if (!gwHistory) {
      console.log(`[ACCURACY] No history found for GW${gameweek}`);
      return;
    }
    const actualPoints = gwHistory.points - gwHistory.event_transfers_cost;
    const plan = await storage.getGameweekPlan(userId, gameweek);
    if (!plan) {
      console.log(`[ACCURACY] No plan found for GW${gameweek}`);
      return;
    }
    await storage.updateGameweekPlanActualPoints(plan.id, actualPoints);
    console.log(`[ACCURACY] Updated GW${gameweek}: Predicted ${plan.predictedPoints}, Actual ${actualPoints}, Error: ${Math.abs(plan.predictedPoints - actualPoints)}`);
  }
  async getAccuracyHistory(userId, startGameweek) {
    const plans = await storage.getGameweekPlansByUser(userId);
    const filteredPlans = startGameweek ? plans.filter((p) => p.gameweek >= startGameweek) : plans;
    const latestPlansByGameweek = /* @__PURE__ */ new Map();
    for (const plan of filteredPlans) {
      const existing = latestPlansByGameweek.get(plan.gameweek);
      if (!existing || plan.createdAt > existing.createdAt) {
        latestPlansByGameweek.set(plan.gameweek, plan);
      }
    }
    const uniquePlans = Array.from(latestPlansByGameweek.values());
    const history = uniquePlans.map((plan) => {
      const error = plan.actualPointsWithAI !== null ? Math.abs(plan.predictedPoints - plan.actualPointsWithAI) : null;
      return {
        gameweek: plan.gameweek,
        predictedPoints: plan.predictedPoints,
        actualPoints: plan.actualPointsWithAI,
        error,
        status: plan.actualPointsWithAI !== null ? "completed" : "pending",
        applied: true,
        analysis: plan.predictionAnalysis || null
      };
    });
    const completedRecords = history.filter((h) => h.status === "completed" && h.error !== null);
    const metrics = {
      totalGameweeks: history.length,
      completedGameweeks: completedRecords.length,
      meanAbsoluteError: completedRecords.length > 0 ? completedRecords.reduce((sum, h) => sum + (h.error || 0), 0) / completedRecords.length : null,
      accuracyWithin5: completedRecords.length > 0 ? completedRecords.filter((h) => (h.error || 0) <= 5).length / completedRecords.length * 100 : null,
      accuracyWithin10: completedRecords.length > 0 ? completedRecords.filter((h) => (h.error || 0) <= 10).length / completedRecords.length * 100 : null,
      totalPredictedPoints: completedRecords.reduce((sum, h) => sum + h.predictedPoints, 0),
      totalActualPoints: completedRecords.reduce((sum, h) => sum + (h.actualPoints || 0), 0),
      overallBias: completedRecords.length > 0 ? completedRecords.reduce((sum, h) => sum + (h.predictedPoints - (h.actualPoints || 0)), 0) / completedRecords.length : null
    };
    return {
      history: history.sort((a, b) => a.gameweek - b.gameweek),
      metrics
    };
  }
  async backfillActualPoints(userId, fromGameweek, toGameweek) {
    const settings = await storage.getUserSettings(userId);
    if (!settings?.manager_id) {
      throw new Error("Manager ID not configured");
    }
    let updated = 0;
    for (let gw = fromGameweek; gw <= toGameweek; gw++) {
      try {
        await this.updateActualPoints(userId, gw);
        updated++;
      } catch (error) {
        console.error(`[ACCURACY] Failed to backfill GW${gw}:`, error);
      }
    }
    return updated;
  }
};
var predictionAccuracyService = new PredictionAccuracyService();

// server/prediction-analysis-service.ts
init_storage();
init_fpl_api();
import OpenAI3 from "openai";
var openai3 = new OpenAI3({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});
var PredictionAnalysisService = class {
  /**
   * Generate AI-powered analysis explaining why a prediction missed
   */
  async analyzePredictionFailure(planId) {
    console.log(`[PredictionAnalysis] Analyzing prediction failure for plan ${planId}`);
    const plan = await storage.getGameweekPlanById(planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }
    if (plan.predictedPoints === null || plan.actualPointsWithAI === null) {
      throw new Error(`Plan ${planId} missing prediction or actual points`);
    }
    const error = Math.abs(plan.predictedPoints - plan.actualPointsWithAI);
    if (error < 5) {
      console.log(`[PredictionAnalysis] Skipping analysis for GW${plan.gameweek} - prediction was accurate (error: ${error} pts)`);
      return {
        gameweek: plan.gameweek,
        predicted: plan.predictedPoints,
        actual: plan.actualPointsWithAI,
        error,
        analysis: "\u2705 Prediction was accurate (error < 5 pts)"
      };
    }
    const gameweekData = await this.getGameweekContext(plan.gameweek, plan.userId, plan);
    const analysis = await this.generateAIAnalysis(plan, gameweekData, error);
    await storage.updatePredictionAnalysis(planId, analysis);
    console.log(`[PredictionAnalysis] Analysis complete for GW${plan.gameweek}: ${error} pts error`);
    return {
      gameweek: plan.gameweek,
      predicted: plan.predictedPoints,
      actual: plan.actualPointsWithAI,
      error,
      analysis
    };
  }
  /**
   * Aggregate scoring breakdown across all fixtures from FPL explain array
   * CRITICAL FOR DOUBLE GAMEWEEKS - must sum, not overwrite
   * PUBLIC for testing to prevent regression bugs
   */
  aggregateExplainArray(explainArray) {
    const scoringBreakdown = {};
    for (const fixture of explainArray) {
      for (const stat of fixture.stats) {
        if (!scoringBreakdown[stat.identifier]) {
          scoringBreakdown[stat.identifier] = {
            points: 0,
            value: 0
          };
        }
        scoringBreakdown[stat.identifier].points += stat.points;
        scoringBreakdown[stat.identifier].value += stat.value;
      }
    }
    return scoringBreakdown;
  }
  /**
   * Format scoring breakdown into human-readable strings
   * Handles ALL FPL identifiers to prevent silent data loss
   * PUBLIC for testing to ensure regression prevention
   */
  formatScoringBreakdown(scoringBreakdown) {
    const breakdown = [];
    for (const [identifier, data] of Object.entries(scoringBreakdown)) {
      const points = data.points;
      const value = data.value;
      switch (identifier) {
        case "minutes":
          breakdown.push(`${value} mins: ${points > 0 ? "+" : ""}${points}`);
          break;
        case "goals_scored":
          breakdown.push(`${value}G: +${points}`);
          break;
        case "assists":
          breakdown.push(`${value}A: +${points}`);
          break;
        case "clean_sheets":
          breakdown.push(`CS: +${points}`);
          break;
        case "defensive_contribution":
          breakdown.push(`Def: +${points}`);
          break;
        case "yellow_cards":
          breakdown.push(`${value}YC: ${points}`);
          break;
        case "red_cards":
          breakdown.push(`${value}RC: ${points}`);
          break;
        case "bonus":
          breakdown.push(`Bonus: +${points}`);
          break;
        case "saves":
          breakdown.push(`${value} saves: +${points}`);
          break;
        case "goals_conceded":
          breakdown.push(`${value} GC: ${points}`);
          break;
        case "penalties_saved":
          breakdown.push(`${value} pen saved: +${points}`);
          break;
        case "penalties_missed":
          breakdown.push(`${value} pen missed: ${points}`);
          break;
        case "own_goals":
          breakdown.push(`${value}OG: ${points}`);
          break;
        case "penalties_conceded":
          breakdown.push(`${value} pen conceded: ${points}`);
          break;
        default:
          breakdown.push(`${identifier}: ${points > 0 ? "+" : ""}${points}`);
          break;
      }
    }
    return breakdown;
  }
  /**
   * Get gameweek context for AI analysis with REAL data
   */
  async getGameweekContext(gameweek, userId, plan) {
    try {
      const { gameweekSnapshot: gameweekSnapshot2 } = await Promise.resolve().then(() => (init_gameweek_data_snapshot(), gameweek_data_snapshot_exports));
      const snapshot = await gameweekSnapshot2.getSnapshot(gameweek, false);
      console.log(`[PredictionAnalysis] Using snapshot from ${new Date(snapshot.timestamp).toISOString()}`);
      const liveData = await fplApi.getLiveGameweekData(gameweek);
      console.log(`[PredictionAnalysis] Fetched live data for GW${gameweek} with ${liveData.elements?.length || 0} player records`);
      const gameweeks = snapshot.data.gameweeks;
      const gw = gameweeks.find((g) => g.id === gameweek);
      const avgScore = gw?.average_entry_score || 0;
      const allPlayers = snapshot.data.players;
      const allTeams = snapshot.data.teams;
      const fixtures = snapshot.data.fixtures;
      const userTeam = await storage.getTeam(userId, gameweek);
      if (!userTeam) {
        return {
          avgScore,
          captain: null,
          topUnderperformers: [],
          fixtureResults: [],
          teamSummary: "No team data found for this gameweek",
          planWasApplied: false,
          recommendedCaptainFollowed: false,
          implementationNote: "No team data available for this gameweek"
        };
      }
      const livePlayerData = /* @__PURE__ */ new Map();
      if (liveData.elements) {
        for (const element of liveData.elements) {
          livePlayerData.set(element.id, element);
        }
      }
      const captainInfo = userTeam.players.find((p) => p.is_captain);
      const teamPerformance = userTeam.players.filter((p) => p.player_id).map((p) => {
        const playerData = allPlayers.find((pl) => pl.id === p.player_id);
        const liveElement = livePlayerData.get(p.player_id);
        const eventPoints = liveElement?.stats.total_points || 0;
        const scoringBreakdown = liveElement?.explain && liveElement.explain.length > 0 ? this.aggregateExplainArray(liveElement.explain) : {};
        return {
          name: playerData?.web_name || "Unknown",
          points: eventPoints,
          position: ["GKP", "DEF", "MID", "FWD"][(playerData?.element_type || 1) - 1] || "Unknown",
          isCaptain: p.is_captain,
          lineupPosition: p.position,
          // 1-15 lineup slot
          playedFromBench: p.position > 11 && eventPoints > 0,
          // Bench player who came on
          // Use the actual scoring breakdown from the explain array
          scoringBreakdown,
          // Keep basic stats for reference
          minutes: liveElement?.stats.minutes || 0,
          goalsScored: liveElement?.stats.goals_scored || 0,
          assists: liveElement?.stats.assists || 0
        };
      }).filter(
        (p) => p.lineupPosition <= 11 || // Starting XI
        p.lineupPosition > 11 && p.points > 0
        // Bench player who actually played
      );
      let captain = null;
      const captainPlayer = teamPerformance.find((p) => p.isCaptain);
      if (captainPlayer) {
        console.log(`[PredictionAnalysis] Captain player found: ${captainPlayer.name} with ${Object.keys(captainPlayer.scoringBreakdown).length} breakdown items`);
        console.log(`[PredictionAnalysis] Captain object created: ${captainPlayer.name} ${captainPlayer.points} pts, breakdown: ${JSON.stringify(captainPlayer.scoringBreakdown)}`);
        captain = {
          name: captainPlayer.name,
          points: captainPlayer.points * 2,
          // Captain gets double points
          scoringBreakdown: captainPlayer.scoringBreakdown,
          position: captainPlayer.position
        };
      }
      const underperformers = teamPerformance.filter((p) => p.points <= 2).sort((a, b) => a.points - b.points).slice(0, 5);
      console.log(`[PredictionAnalysis] Found ${underperformers.length} underperformers for GW${gameweek}:`);
      for (const player of underperformers) {
        console.log(`[PredictionAnalysis]   - ${player.name}: ${player.points} pts, breakdown: ${JSON.stringify(player.scoringBreakdown)}`);
      }
      const relevantTeamIds = new Set(
        teamPerformance.map((p) => {
          const playerData = allPlayers.find((pl) => pl.name === p.name);
          return playerData?.team;
        }).filter(Boolean)
      );
      const gwFixtures = fixtures.filter((f) => f.event === gameweek && f.finished).filter(
        (f) => relevantTeamIds.has(f.team_h) || relevantTeamIds.has(f.team_a)
      ).slice(0, 8).map((f) => {
        const homeTeam = allTeams.find((t) => t.id === f.team_h);
        const awayTeam = allTeams.find((t) => t.id === f.team_a);
        return {
          team: homeTeam?.name || "Unknown",
          opponent: awayTeam?.name || "Unknown",
          result: `${f.team_h_score}-${f.team_a_score}`
        };
      });
      const totalPoints = teamPerformance.reduce((sum, p) => {
        return sum + (p.isCaptain ? p.points * 2 : p.points);
      }, 0);
      const teamSummary = `${teamPerformance.length} players who played, ${totalPoints} total points`;
      const planWasApplied = plan.status === "applied" && plan.appliedAt !== null;
      const actualCaptainId = captainInfo?.player_id;
      const recommendedCaptainId = plan.captainId;
      const recommendedCaptainFollowed = actualCaptainId === recommendedCaptainId;
      let implementationNote = "";
      if (!planWasApplied) {
        implementationNote = "Plan was NOT applied - user did not implement these recommendations.";
      } else if (!recommendedCaptainFollowed && recommendedCaptainId) {
        const recommendedCaptainPlayer = allPlayers.find((p) => p.id === recommendedCaptainId);
        const recommendedCaptainName = recommendedCaptainPlayer?.web_name || "Unknown";
        implementationNote = `Plan applied, but captain choice differed: Recommended ${recommendedCaptainName}, actual ${captain?.name || "Unknown"}.`;
      } else {
        implementationNote = "Plan was fully applied as recommended.";
      }
      return {
        avgScore,
        captain,
        topUnderperformers: underperformers,
        fixtureResults: gwFixtures,
        teamSummary,
        planWasApplied,
        recommendedCaptainFollowed,
        implementationNote
      };
    } catch (error) {
      console.error(`[PredictionAnalysis] Error fetching gameweek context:`, error);
      return {
        avgScore: 0,
        captain: null,
        topUnderperformers: [],
        fixtureResults: [],
        teamSummary: "Unable to load team data",
        planWasApplied: false,
        recommendedCaptainFollowed: false,
        implementationNote: "Unable to verify implementation status"
      };
    }
  }
  /**
   * Generate AI analysis of why prediction missed
   */
  async generateAIAnalysis(plan, context, error) {
    const bias = plan.predictedPoints - plan.actualPointsWithAI;
    const biasDirection = bias > 0 ? "over-predicted" : "under-predicted";
    let captainText = "Captain: Unknown";
    if (context.captain) {
      const breakdown = this.formatScoringBreakdown(context.captain.scoringBreakdown);
      const basePoints = context.captain.points / 2;
      const breakdownText = breakdown.join(", ");
      const totalPts = breakdown.length > 0 ? `= ${basePoints} pts` : "";
      captainText = `Captain: ${context.captain.name} scored ${context.captain.points} pts (with captaincy) [base points: ${breakdownText} ${totalPts}]`;
      console.log(`[PredictionAnalysis] Captain breakdown for GW${plan.gameweek}: ${captainText}`);
    }
    const underperformersText = context.topUnderperformers.length > 0 ? `Players who scored \u22642 pts (with exact breakdown):
${context.topUnderperformers.map((p) => {
      const breakdown = this.formatScoringBreakdown(p.scoringBreakdown);
      return `  - ${p.name} (${p.position}): ${p.points} pts [${breakdown.join(", ")}]`;
    }).join("\n")}` : "No major underperformers";
    const fixturesText = context.fixtureResults.length > 0 ? `Key fixtures:
${context.fixtureResults.map((f) => `  - ${f.team} vs ${f.opponent}: ${f.result}`).join("\n")}` : "Fixtures data unavailable";
    const prompt = `Analyze why this FPL prediction missed the mark. Focus ONLY on explaining prediction errors for the actual decisions that were made.

PREDICTION vs REALITY:
- Gameweek: ${plan.gameweek}
- Predicted: ${plan.predictedPoints} pts \u2192 Actual: ${plan.actualPointsWithAI} pts
- Difference: ${error} pts (${biasDirection} by ${Math.abs(bias)} pts)
- League Average: ${context.avgScore} pts

WHAT ACTUALLY HAPPENED:
${captainText}
${context.teamSummary}

${underperformersText}

${fixturesText}

YOUR TASK: In 2-4 bullet points, explain WHY predictions were inaccurate using ONLY definitive statements based on exact data.

REQUIRED FORMAT - Use these patterns:
1. Start with player name and exact score with breakdown: "Player scored X pts [breakdown]"
2. State exact point impacts: "yellow card cost him 1 point", "no clean sheet cost him 4 points"
3. For defenders/goalkeepers, use the EXACT DATA from scoringBreakdown to determine what happened:
   - If "goals_conceded" appears: Team conceded X goals (use exact value from breakdown)
   - If NO "goals_conceded" AND player has 60+ minutes: Team kept a clean sheet
   - If NO "goals_conceded" AND player has <60 minutes: Cannot state team conceded - player simply didn't reach 60-min threshold for clean sheet points
4. Use match results with exact scores: "Team vs Opponent: X-Y"
5. State exact prediction differences: "expected X pts but scored Y pts"
6. ${!context.recommendedCaptainFollowed && context.planWasApplied ? "Note: Different captain was chosen than recommended" : "Focus on actual performance vs prediction"}

FPL SCORING RULES (2025/26):
\u2022 Minutes: 60+ mins = +2 pts, 1-59 mins = +1 pt
\u2022 Goals: FWD +4, MID +5, DEF +6
\u2022 Assists: +3 pts
\u2022 Clean Sheet: GKP/DEF +4 pts, MID +1 pt (requires BOTH 60+ mins AND no goals conceded)
\u2022 Defensive Contribution (NEW): DEF 10+ CBITs = +2 pts, MID/FWD 12+ CBIRTs = +2 pts
\u2022 Yellow Card: -1 pt
\u2022 Red Card: -3 pts
\u2022 Bonus: +1/+2/+3 pts
\u2022 Saves: GKP +1 pt per 3 saves

CRITICAL CLEAN SHEET LOGIC:
\u2022 If scoringBreakdown contains "goals_conceded": Team conceded goals (state exact number)
\u2022 If scoringBreakdown has NO "goals_conceded" entry AND player played 60+ minutes: Team kept a clean sheet
\u2022 If scoringBreakdown has NO "goals_conceded" entry AND player played <60 minutes: Player missed clean sheet points due to insufficient playing time (team may or may not have conceded - don't assume!)

WRITE ONLY DEFINITIVE STATEMENTS:
\u2022 Never use: "likely", "probably", "may have", "might have", "appears to", "seems to", "could have", "would have", "potentially", "possibly"
\u2022 Always include exact point values for every factor
\u2022 Use the exact point breakdown provided [90 mins: +2, Def: +2, 1YC: -1, etc.]
\u2022 For missing clean sheets DUE TO GOALS CONCEDED: state "no clean sheet cost him 4 points" (DEF/GKP)
\u2022 For missing clean sheets DUE TO <60 MINUTES: state "missed clean sheet points due to insufficient playing time" (DEF/GKP)
\u2022 For yellow cards: always state "yellow card cost him 1 point"
\u2022 "Def: +2" means defensive contribution bonus (10+ defensive actions for DEF, 12+ for MID/FWD)

CORRECT EXAMPLES (copy these patterns):
"Leno scored 2 pts [90 mins: +2, 2 GC: -1]. Fulham conceded 2 goals, no clean sheet cost him 4 points. The prediction overestimated by 4 points, expecting a clean sheet."

"Cucurella scored 1 pt [90 mins: +2, 2 GC: -1, 1YC: -1]. Chelsea conceded 2 goals, no clean sheet cost him 4 points, and the yellow card cost him 1 point. The prediction overestimated by 5 points."

"Semenyo (captain) scored 6 pts [90 mins: +2, 1G: +4]. The prediction overestimated by 6 points, expecting 2 goal involvements (12 pts) but only 1 goal involvement (6 pts) was delivered."

"Saliba scored 2 pts [90 mins: +2, 1 GC: -1]. Arsenal conceded 1 goal, no clean sheet cost him 4 points. The prediction overestimated by 5 points, expecting a clean sheet."

"Mitoma scored 1 pt [45 mins: +1]. Subbed off at halftime (45 minutes), missing the 60-minute threshold for +2 appearance points. He also missed clean sheet points (+4) due to insufficient playing time."

Format as bullet points starting with "\u2022 ". Max 4 bullets.`;
    try {
      const response = await openai3.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: 'You are a precise FPL data analyst. You ONLY make definitive statements based on exact data. You NEVER use speculation words like "likely", "probably", "may have", or "could have". Every statement must be a provable fact from the provided data. If you use any banned speculation words, your analysis fails. Be factual, direct, and educational.'
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.1,
        // Extremely low temperature for purely factual analysis
        max_tokens: 400
      });
      const analysis = response.choices[0]?.message?.content || "Unable to generate analysis";
      return analysis.trim();
    } catch (error2) {
      console.error(`[PredictionAnalysis] AI analysis failed:`, error2);
      return `\u2022 Prediction missed by ${error2} pts
\u2022 ${biasDirection} by ${Math.abs(bias)} pts
\u2022 Analysis unavailable due to error`;
    }
  }
  /**
   * Batch analyze all completed gameweeks for a user
   */
  async analyzeAllCompletedGameweeks(userId) {
    console.log(`[PredictionAnalysis] Analyzing all completed gameweeks for user ${userId}`);
    const allPlans = await storage.getGameweekPlansByUser(userId);
    const completedPlans = allPlans.filter(
      (p) => p.predictedPoints !== null && p.actualPointsWithAI !== null
    );
    completedPlans.sort((a, b) => a.gameweek - b.gameweek);
    const results = [];
    for (const plan of completedPlans) {
      if (plan.predictionAnalysis) {
        console.log(`[PredictionAnalysis] Plan ${plan.id} (GW${plan.gameweek}) already analyzed`);
        continue;
      }
      try {
        const result = await this.analyzePredictionFailure(plan.id);
        results.push(result);
      } catch (error) {
        console.error(`[PredictionAnalysis] Error analyzing plan ${plan.id}:`, error);
      }
    }
    console.log(`[PredictionAnalysis] Analyzed ${results.length} gameweeks`);
    return results;
  }
};
var predictionAnalysisService = new PredictionAnalysisService();

// server/routes.ts
init_gameweek_data_snapshot();

// server/precomputation-cache.ts
init_storage();
var PrecomputationCache = class {
  cacheHits = 0;
  cacheMisses = 0;
  /**
   * Lookup precomputed result from cache
   * Returns cached result or null if not found
   */
  async lookup(context, computationType, playerId) {
    const result = await storage.getPrecomputation(
      context.snapshotId,
      computationType,
      playerId
    );
    if (result) {
      this.cacheHits++;
      return result.result;
    } else {
      this.cacheMisses++;
      return null;
    }
  }
  /**
   * Get cache hit rate percentage
   */
  getCacheHitRate() {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? this.cacheHits / total * 100 : 0;
  }
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      total: this.cacheHits + this.cacheMisses,
      hitRate: this.getCacheHitRate().toFixed(2) + "%"
    };
  }
  /**
   * Reset cache statistics
   */
  resetStats() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
};
var precomputationCache = new PrecomputationCache();

// server/routes.ts
init_schema();
import { z as z2 } from "zod";
async function registerRoutes(app2) {
  app2.get("/api/fpl/bootstrap", async (req, res) => {
    try {
      const planningGameweek = await fplApi.getPlanningGameweek();
      const gameweek = planningGameweek?.id || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      res.json({
        elements: snapshot.data.players,
        teams: snapshot.data.teams,
        events: snapshot.data.gameweeks,
        element_types: snapshot.data.element_types,
        // Include snapshot metadata for debugging data consistency
        _snapshot: {
          gameweek: snapshot.gameweek,
          timestamp: snapshot.timestamp,
          enriched: snapshot.data.players.some((p) => p.understat !== void 0)
        }
      });
    } catch (error) {
      console.error("Error fetching bootstrap data:", error);
      res.status(500).json({ error: "Failed to fetch FPL data" });
    }
  });
  app2.get("/api/fpl/players", async (req, res) => {
    try {
      const planningGameweek = await fplApi.getPlanningGameweek();
      const gameweek = planningGameweek?.id || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      res.json(snapshot.data.players);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });
  app2.get("/api/fpl/teams", async (req, res) => {
    try {
      const planningGameweek = await fplApi.getPlanningGameweek();
      const gameweek = planningGameweek?.id || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      res.json(snapshot.data.teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });
  app2.get("/api/fpl/gameweeks", async (req, res) => {
    try {
      const planningGameweek = await fplApi.getPlanningGameweek();
      const gameweek = planningGameweek?.id || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      res.json(snapshot.data.gameweeks);
    } catch (error) {
      console.error("Error fetching gameweeks:", error);
      res.status(500).json({ error: "Failed to fetch gameweeks" });
    }
  });
  app2.get("/api/fpl/planning-gameweek", async (req, res) => {
    try {
      const gameweek = await fplApi.getPlanningGameweek();
      if (!gameweek) {
        return res.status(404).json({ error: "No planning gameweek found" });
      }
      res.json(gameweek);
    } catch (error) {
      console.error("Error fetching planning gameweek:", error);
      res.status(500).json({ error: "Failed to fetch planning gameweek" });
    }
  });
  app2.get("/api/fpl/fixtures", async (req, res) => {
    try {
      const planningGameweek = await fplApi.getPlanningGameweek();
      const defaultGameweek = planningGameweek?.id || 1;
      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek) : defaultGameweek;
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      const fixtures = req.query.gameweek ? snapshot.data.fixtures.filter((f) => f.event === gameweek) : snapshot.data.fixtures;
      res.json(fixtures);
    } catch (error) {
      console.error("Error fetching fixtures:", error);
      res.status(500).json({ error: "Failed to fetch fixtures" });
    }
  });
  app2.get("/api/fpl/positions", async (req, res) => {
    try {
      const positions = await fplApi.getPositionTypes();
      res.json(positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      res.status(500).json({ error: "Failed to fetch positions" });
    }
  });
  app2.get("/api/fpl/player/:id", async (req, res) => {
    try {
      const playerId = parseInt(req.params.id);
      const playerDetails = await fplApi.getPlayerDetails(playerId);
      res.json(playerDetails);
    } catch (error) {
      console.error("Error fetching player details:", error);
      res.status(500).json({ error: "Failed to fetch player details" });
    }
  });
  app2.get("/api/fpl/manager/:id", async (req, res) => {
    try {
      const managerId = parseInt(req.params.id);
      const manager = await fplApi.getManagerDetails(managerId);
      res.json(manager);
    } catch (error) {
      console.error("Error fetching manager:", error);
      res.status(500).json({ error: "Failed to fetch manager details" });
    }
  });
  app2.get("/api/fpl/manager/:id/picks/:gameweek", async (req, res) => {
    try {
      const managerId = parseInt(req.params.id);
      const gameweek = parseInt(req.params.gameweek);
      const picks = await fplApi.getManagerPicks(managerId, gameweek);
      res.json(picks);
    } catch (error) {
      console.error("Error fetching manager picks:", error);
      res.status(500).json({ error: "Failed to fetch manager picks" });
    }
  });
  app2.get("/api/fpl/manager/:id/transfers", async (req, res) => {
    try {
      const managerId = parseInt(req.params.id);
      const transfers2 = await fplApi.getManagerTransfers(managerId);
      res.json(transfers2);
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ error: "Failed to fetch transfers" });
    }
  });
  app2.get("/api/fpl/manager/:id/history", async (req, res) => {
    try {
      const managerId = parseInt(req.params.id);
      const history = await fplApi.getManagerHistory(managerId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching manager history:", error);
      res.status(500).json({ error: "Failed to fetch manager history" });
    }
  });
  app2.get("/api/fpl/league/:leagueId/standings", async (req, res) => {
    try {
      const leagueId = parseInt(req.params.leagueId);
      const page = req.query.page ? parseInt(req.query.page) : 1;
      const standings = await fplApi.getLeagueStandings(leagueId, page);
      res.json(standings);
    } catch (error) {
      console.error("Error fetching league standings:", error);
      res.status(500).json({ error: "Failed to fetch league standings" });
    }
  });
  app2.get("/api/fpl/set-piece-takers", async (req, res) => {
    try {
      const setPieceTakers = await fplApi.getSetPieceTakers();
      res.json(setPieceTakers);
    } catch (error) {
      console.error("Error fetching set piece takers:", error);
      res.status(500).json({ error: "Failed to fetch set piece takers" });
    }
  });
  app2.get("/api/fpl/dream-team/:gameweek", async (req, res) => {
    try {
      const gameweek = parseInt(req.params.gameweek);
      const dreamTeam = await fplApi.getDreamTeam(gameweek);
      res.json(dreamTeam);
    } catch (error) {
      console.error("Error fetching dream team:", error);
      res.status(500).json({ error: "Failed to fetch dream team" });
    }
  });
  app2.get("/api/fpl/event-status", async (req, res) => {
    try {
      const status = await fplApi.getEventStatus();
      res.json(status);
    } catch (error) {
      console.error("Error fetching event status:", error);
      res.status(500).json({ error: "Failed to fetch event status" });
    }
  });
  app2.post("/api/manager/sync/:managerId", async (req, res) => {
    try {
      const managerId = parseInt(req.params.managerId);
      if (isNaN(managerId)) {
        return res.status(400).json({ error: "Invalid manager ID" });
      }
      const managerDetails = await fplApi.getManagerDetails(managerId);
      if (!managerDetails) {
        return res.status(404).json({ error: "Manager not found" });
      }
      const user = await storage.getOrCreateUser(managerId);
      const syncResult = await managerSync.syncManagerTeam(managerId, user.id);
      if (!syncResult.success) {
        return res.status(500).json({ error: syncResult.error || "Failed to sync team" });
      }
      res.json(syncResult);
    } catch (error) {
      console.error("Error syncing manager:", error);
      res.status(500).json({ error: "Failed to sync manager team" });
    }
  });
  app2.get("/api/manager/:managerId/status", async (req, res) => {
    try {
      const managerId = parseInt(req.params.managerId);
      if (isNaN(managerId)) {
        return res.status(400).json({ error: "Invalid manager ID" });
      }
      const user = await storage.getOrCreateUser(managerId);
      const status = await managerSync.getManagerStatus(managerId, user.id);
      if (!status) {
        return res.status(404).json({ error: "No team data found. Please sync first." });
      }
      res.json(status);
    } catch (error) {
      console.error("Error fetching manager status:", error);
      res.status(500).json({ error: "Failed to fetch manager status" });
    }
  });
  app2.post("/api/ai/predict-player", async (req, res) => {
    try {
      const { player, fixtures } = req.body;
      if (!player || !fixtures) {
        return res.status(400).json({ error: "Missing player or fixtures data" });
      }
      const prediction = await aiPredictions.predictPlayerPoints({ player, upcomingFixtures: fixtures });
      res.json(prediction);
    } catch (error) {
      console.error("Error predicting player points:", error);
      res.status(500).json({ error: "Failed to predict player points" });
    }
  });
  app2.post("/api/ai/transfer-recommendations", async (req, res) => {
    try {
      const { currentPlayers, budget } = req.body;
      if (!currentPlayers || budget === void 0) {
        return res.status(400).json({ error: "Missing required data" });
      }
      const planningGameweek = await fplApi.getPlanningGameweek();
      const gameweek = planningGameweek?.id || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      const recommendations = await aiPredictions.getTransferRecommendations(
        currentPlayers,
        snapshot.data.players,
        snapshot.data.fixtures,
        budget
      );
      res.json(recommendations);
    } catch (error) {
      console.error("Error getting transfer recommendations:", error);
      res.status(500).json({ error: "Failed to get transfer recommendations" });
    }
  });
  app2.post("/api/ai/captain-recommendations", async (req, res) => {
    try {
      const { playerIds } = req.body;
      if (!playerIds || !Array.isArray(playerIds)) {
        return res.status(400).json({ error: "Missing or invalid playerIds" });
      }
      const planningGameweek = await fplApi.getPlanningGameweek();
      const gameweek = planningGameweek?.id || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      const players = snapshot.data.players.filter((p) => playerIds.includes(p.id));
      const recommendations = await aiPredictions.getCaptainRecommendations(players, snapshot.data.fixtures);
      res.json(recommendations);
    } catch (error) {
      console.error("Error getting captain recommendations:", error);
      res.status(500).json({ error: "Failed to get captain recommendations" });
    }
  });
  app2.post("/api/ai/chip-strategy", async (req, res) => {
    try {
      const { currentGameweek, remainingChips } = req.body;
      if (!currentGameweek || !remainingChips) {
        return res.status(400).json({ error: "Missing required data" });
      }
      const strategies = await aiPredictions.getChipStrategy(currentGameweek, remainingChips);
      res.json(strategies);
    } catch (error) {
      console.error("Error getting chip strategy:", error);
      res.status(500).json({ error: "Failed to get chip strategy" });
    }
  });
  app2.post("/api/ai/analyze-team/stream", async (req, res) => {
    console.log("[ROUTE SSE] Analyze team stream endpoint called");
    try {
      const { players, formation } = req.body;
      console.log("[ROUTE SSE] Players count:", players?.length, "Formation:", formation);
      if (!players || !formation) {
        console.log("[ROUTE SSE] Missing required data!");
        return res.status(400).json({ error: "Missing required data" });
      }
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.write(`data: ${JSON.stringify({ status: "started" })}

`);
      let buffer = "";
      await aiPredictions.analyzeTeamCompositionStream(
        players,
        formation,
        (chunk) => {
          buffer += chunk;
          res.write(`data: ${JSON.stringify({ chunk })}

`);
        }
      );
      res.write(`data: ${JSON.stringify({ done: true, fullContent: buffer })}

`);
      res.end();
      console.log("[ROUTE SSE] Stream complete");
    } catch (error) {
      console.error("[ROUTE SSE] Error:", error);
      res.write(`data: ${JSON.stringify({ error: "Failed to analyze team" })}

`);
      res.end();
    }
  });
  app2.post("/api/ai/analyze-team", async (req, res) => {
    console.log("[ROUTE] Analyze team endpoint called");
    try {
      const { players, formation } = req.body;
      console.log("[ROUTE] Players count:", players?.length, "Formation:", formation);
      if (!players || !formation) {
        console.log("[ROUTE] Missing required data!");
        return res.status(400).json({ error: "Missing required data" });
      }
      const analysis = await aiPredictions.analyzeTeamComposition(players, formation);
      console.log("[ROUTE] Analysis complete:", JSON.stringify(analysis));
      console.log("[ROUTE] Sending response with status 200");
      res.status(200).send(analysis);
      console.log("[ROUTE] Response sent");
    } catch (error) {
      console.error("Error analyzing team:", error);
      res.status(500).json({ error: "Failed to analyze team" });
    }
  });
  app2.post("/api/ai/analyze-team-async", async (req, res) => {
    console.log("[ROUTE ASYNC] Analyze team async endpoint called");
    try {
      const { players, formation, userId = 1 } = req.body;
      if (!players || !formation) {
        return res.status(400).json({ error: "Missing required data" });
      }
      const predictionId = await storage.createTeamPrediction(userId, { players, formation });
      console.log("[ROUTE ASYNC] Created prediction ID:", predictionId);
      (async () => {
        try {
          await storage.updateTeamPredictionStatus(predictionId, "processing");
          const analysis = await aiPredictions.analyzeTeamComposition(players, formation);
          await storage.completeTeamPrediction(predictionId, analysis);
          console.log("[ROUTE ASYNC] Background processing complete for ID:", predictionId);
        } catch (error) {
          console.error("[ROUTE ASYNC] Background processing error:", error);
          await storage.failTeamPrediction(predictionId, error instanceof Error ? error.message : "Unknown error");
        }
      })();
      res.json({ predictionId });
    } catch (error) {
      console.error("[ROUTE ASYNC] Error creating prediction:", error);
      res.status(500).json({ error: "Failed to create prediction" });
    }
  });
  app2.get("/api/ai/prediction/:id", async (req, res) => {
    try {
      const predictionId = parseInt(req.params.id);
      if (isNaN(predictionId)) {
        return res.status(400).json({ error: "Invalid prediction ID" });
      }
      const prediction = await storage.getTeamPrediction(predictionId);
      if (!prediction) {
        return res.status(404).json({ error: "Prediction not found" });
      }
      res.json({
        id: prediction.id,
        status: prediction.status,
        result: prediction.result,
        error: prediction.error
      });
    } catch (error) {
      console.error("[ROUTE] Error fetching prediction:", error);
      res.status(500).json({ error: "Failed to fetch prediction" });
    }
  });
  app2.post("/api/fpl-auth/login", async (req, res) => {
    try {
      const { userId, email, password } = req.body;
      if (!userId || !email || !password) {
        return res.status(400).json({ error: "Missing required fields: userId, email, password" });
      }
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      console.log(`[FPL Auth Route] Login attempt for user ${userIdNum}`);
      await fplAuth.login(email, password, userIdNum);
      console.log(`[FPL Auth Route] Login successful for user ${userIdNum}`);
      res.json({ success: true, message: "Successfully authenticated with FPL" });
    } catch (error) {
      console.error("[FPL Auth Route] Login error:", error);
      res.status(401).json({
        error: "Failed to authenticate with FPL",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/fpl-auth/login-with-cookies", async (req, res) => {
    try {
      const { userId, cookies, email, password } = req.body;
      if (!userId || !cookies) {
        return res.status(400).json({
          error: "Missing required fields: userId, cookies",
          example: "Cookies should be in format: cookie_name=value; cookie_name2=value2"
        });
      }
      if (typeof cookies !== "string") {
        return res.status(400).json({
          error: "Invalid cookie format: cookies must be a string",
          example: "Cookies should be in format: cookie_name=value; cookie_name2=value2"
        });
      }
      const trimmedCookies = cookies.trim();
      if (trimmedCookies.length === 0) {
        return res.status(400).json({
          error: "Cookie string cannot be empty",
          example: "Cookies should be in format: cookie_name=value; cookie_name2=value2"
        });
      }
      if (trimmedCookies.includes("\n") || trimmedCookies.includes("\r")) {
        return res.status(400).json({
          error: "Invalid cookie format: cookies cannot contain newlines. Please provide cookies as a single line.",
          example: "Correct format: cookie_name=value; cookie_name2=value2"
        });
      }
      if (!trimmedCookies.includes("=")) {
        return res.status(400).json({
          error: "Invalid cookie format: cookies must contain at least one '=' character",
          example: "Cookies should be in format: cookie_name=value; cookie_name2=value2"
        });
      }
      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ error: "Invalid userId: must be a number" });
      }
      console.log(`[FPL Auth Route] Manual cookie authentication for user ${userIdNum}`);
      await fplAuth.loginWithCookies(userIdNum, trimmedCookies, email, password);
      console.log(`[FPL Auth Route] Cookie authentication successful for user ${userIdNum}`);
      res.json({ success: true, message: "Successfully authenticated with FPL cookies" });
    } catch (error) {
      console.error("[FPL Auth Route] Cookie authentication error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(401).json({
        error: "Failed to authenticate with cookies",
        details: errorMessage,
        example: "Cookies should be in format: cookie_name=value; cookie_name2=value2"
      });
    }
  });
  app2.get("/api/fpl-auth/status/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const authenticated = await fplAuth.isAuthenticated(userId);
      let cookieExpiry = null;
      let daysUntilExpiry = null;
      let expiryWarning = false;
      if (authenticated) {
        const credentials = await storage.getFplCredentials(userId);
        if (credentials?.cookiesExpiresAt) {
          const expiryDate = new Date(credentials.cookiesExpiresAt);
          cookieExpiry = expiryDate.toISOString();
          const now = /* @__PURE__ */ new Date();
          const diffMs = expiryDate.getTime() - now.getTime();
          daysUntilExpiry = Math.max(0, Math.ceil(diffMs / (1e3 * 60 * 60 * 24)));
          expiryWarning = daysUntilExpiry <= 2;
        }
      }
      res.json({
        authenticated,
        cookieExpiry,
        daysUntilExpiry,
        expiryWarning
      });
    } catch (error) {
      console.error("[FPL Auth Route] Status check error:", error);
      res.status(500).json({
        error: "Failed to check authentication status",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/fpl-auth/logout/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      console.log(`[FPL Auth Route] Logout request for user ${userId}`);
      await fplAuth.logout(userId);
      console.log(`[FPL Auth Route] Logout successful for user ${userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error("[FPL Auth Route] Logout error:", error);
      res.status(500).json({
        error: "Failed to logout",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/fpl-auth/debug-cookies/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const cookies = await fplAuth.getSessionCookies(userId);
      const csrfToken = await fplAuth.getCsrfToken(userId);
      res.json({
        cookies: cookies.substring(0, 100) + "...",
        csrfToken,
        cookiesLength: cookies.length,
        hasColons: cookies.includes(":"),
        hasUrlEncoding: cookies.includes("%")
      });
    } catch (error) {
      console.error("[FPL Auth Route] Debug cookies error:", error);
      res.status(500).json({
        error: "Failed to debug cookies",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/automation/settings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const settings = await storage.getAutomationSettings(userId);
      res.json(settings || null);
    } catch (error) {
      console.error("[Automation Settings Route] Error fetching settings:", error);
      res.status(500).json({
        error: "Failed to fetch automation settings",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/automation/settings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      console.log(`[Automation Settings Route] Saving settings for user ${userId}:`, req.body);
      const settings = await storage.saveAutomationSettings(userId, req.body);
      console.log(`[Automation Settings Route] Settings saved successfully for user ${userId}`);
      res.json(settings);
    } catch (error) {
      console.error("[Automation Settings Route] Error saving settings:", error);
      res.status(500).json({
        error: "Failed to save automation settings",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/automation/analyze/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const planningGameweek = await fplApi.getPlanningGameweek();
      const defaultGW = planningGameweek?.id || 1;
      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek) : defaultGW;
      const targetPlayerId = req.query.targetPlayerId ? parseInt(req.query.targetPlayerId) : void 0;
      console.log(`[Automation Analyze Route] Starting analysis for user ${userId}, gameweek ${gameweek}${targetPlayerId ? `, target player: ${targetPlayerId}` : ""}`);
      const plan = await gameweekAnalyzer.analyzeGameweek(userId, gameweek, targetPlayerId);
      console.log(`[Automation Analyze Route] Analysis complete for user ${userId}, plan ID: ${plan.id}`);
      res.json(plan);
    } catch (error) {
      console.error("[Automation Analyze Route] Error analyzing gameweek:", error);
      res.status(500).json({
        error: "Failed to analyze gameweek",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/automation/plan/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek) : void 0;
      let rawPlan;
      if (gameweek) {
        rawPlan = await storage.getGameweekPlan(userId, gameweek);
      } else {
        rawPlan = await storage.getLatestGameweekPlan(userId);
      }
      if (!rawPlan) {
        return res.json(null);
      }
      const snapshot = await gameweekSnapshot.getSnapshot(rawPlan.gameweek);
      const { gameweekPlanHydrator: gameweekPlanHydrator2 } = await Promise.resolve().then(() => (init_gameweek_plan_hydrator(), gameweek_plan_hydrator_exports));
      const hydratedPlan = await gameweekPlanHydrator2.hydratePlan(rawPlan, snapshot.data.players);
      res.json(hydratedPlan);
    } catch (error) {
      console.error("[Automation Plan Route] Error fetching plan:", error);
      res.status(500).json({
        error: "Failed to fetch gameweek plan",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/automation/plans/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const rawPlans = await storage.getGameweekPlansByUser(userId);
      if (rawPlans.length === 0) {
        return res.json([]);
      }
      const latestGameweek = rawPlans[rawPlans.length - 1]?.gameweek || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(latestGameweek);
      const { gameweekPlanHydrator: gameweekPlanHydrator2 } = await Promise.resolve().then(() => (init_gameweek_plan_hydrator(), gameweek_plan_hydrator_exports));
      const hydratedPlans = await gameweekPlanHydrator2.hydratePlans(rawPlans, snapshot.data.players);
      res.json(hydratedPlans);
    } catch (error) {
      console.error("[Automation Plans Route] Error fetching plans:", error);
      res.status(500).json({
        error: "Failed to fetch gameweek plans",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/automation/apply/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const { gameweekPlanId } = req.body;
      if (!gameweekPlanId) {
        return res.status(400).json({ error: "Missing gameweekPlanId in request body" });
      }
      const planId = parseInt(gameweekPlanId);
      if (isNaN(planId)) {
        return res.status(400).json({ error: "Invalid gameweekPlanId" });
      }
      console.log(`[Automation Apply Route] Applying plan ${planId} for user ${userId}`);
      const result = await transferApplication.applyGameweekPlan(userId, planId);
      console.log(`[Automation Apply Route] Application result for user ${userId}:`, result);
      if (!result.success) {
        return res.status(400).json({
          error: "Failed to apply gameweek plan",
          details: result.errors.join(", "),
          result
        });
      }
      res.json(result);
    } catch (error) {
      console.error("[Automation Apply Route] Error applying plan:", error);
      res.status(500).json({
        error: "Failed to apply gameweek plan",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.put("/api/automation/plan/:planId/status", async (req, res) => {
    try {
      const planId = parseInt(req.params.planId);
      if (isNaN(planId)) {
        return res.status(400).json({ error: "Invalid planId" });
      }
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Missing status in request body" });
      }
      const validStatuses = ["pending", "previewed", "applied", "rejected"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: "Invalid status",
          details: `Status must be one of: ${validStatuses.join(", ")}`
        });
      }
      console.log(`[Automation Plan Status Route] Updating plan ${planId} to status: ${status}`);
      await storage.updateGameweekPlanStatus(planId, status);
      const updatedPlan = await storage.getGameweekPlanById(planId);
      if (!updatedPlan) {
        return res.status(404).json({ error: "Gameweek plan not found" });
      }
      console.log(`[Automation Plan Status Route] Plan ${planId} status updated to: ${status}`);
      res.json(updatedPlan);
    } catch (error) {
      console.error("[Automation Plan Status Route] Error updating plan status:", error);
      res.status(500).json({
        error: "Failed to update plan status",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/automation/history/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek) : void 0;
      let history;
      if (gameweek) {
        history = await storage.getChangeHistory(userId, gameweek);
      } else {
        history = await storage.getChangeHistoryByUser(userId);
      }
      res.json(history);
    } catch (error) {
      console.error("[Automation History Route] Error fetching change history:", error);
      res.status(500).json({
        error: "Failed to fetch change history",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/prediction-accuracy/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const startGameweek = req.query.startGameweek ? parseInt(req.query.startGameweek) : void 0;
      console.log(`[Prediction Accuracy Route] Fetching accuracy history for user ${userId}${startGameweek ? ` from GW${startGameweek}` : ""}`);
      const accuracyData = await predictionAccuracyService.getAccuracyHistory(userId, startGameweek);
      res.json(accuracyData);
    } catch (error) {
      console.error("[Prediction Accuracy Route] Error fetching accuracy history:", error);
      res.status(500).json({
        error: "Failed to fetch prediction accuracy",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/prediction-accuracy/update/:userId/:gameweek", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const gameweek = parseInt(req.params.gameweek);
      if (isNaN(userId) || isNaN(gameweek)) {
        return res.status(400).json({ error: "Invalid userId or gameweek" });
      }
      console.log(`[Prediction Accuracy Route] Updating actual points for user ${userId}, GW${gameweek}`);
      await predictionAccuracyService.updateActualPoints(userId, gameweek);
      res.json({ success: true, message: `Updated actual points for GW${gameweek}` });
    } catch (error) {
      console.error("[Prediction Accuracy Route] Error updating actual points:", error);
      res.status(500).json({
        error: "Failed to update actual points",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/prediction-accuracy/backfill/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { fromGameweek, toGameweek } = req.body;
      if (isNaN(userId) || !fromGameweek || !toGameweek) {
        return res.status(400).json({ error: "Invalid request parameters" });
      }
      console.log(`[Prediction Accuracy Route] Backfilling actual points for user ${userId}, GW${fromGameweek}-${toGameweek}`);
      const updated = await predictionAccuracyService.backfillActualPoints(userId, fromGameweek, toGameweek);
      res.json({ success: true, updated, message: `Backfilled ${updated} gameweeks` });
    } catch (error) {
      console.error("[Prediction Accuracy Route] Error backfilling actual points:", error);
      res.status(500).json({
        error: "Failed to backfill actual points",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/prediction-accuracy/analyze/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      console.log(`[API] Generating AI analysis for all completed gameweeks for user ${userId}`);
      const results = await predictionAnalysisService.analyzeAllCompletedGameweeks(userId);
      res.json({
        message: `Successfully analyzed ${results.length} gameweeks`,
        analyses: results
      });
    } catch (error) {
      console.error("[API] Error generating analysis:", error);
      res.status(500).json({
        error: "Failed to generate prediction analysis",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/ai-impact/analyze/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID provided" });
      }
      console.log(`[AI Impact Analysis Route] Analyzing all completed gameweeks for user ${userId}`);
      const results = await aiImpactAnalysis.analyzeAllCompletedGameweeks(userId);
      console.log(`[AI Impact Analysis Route] Analysis complete: ${results.length} gameweeks analyzed`);
      res.json(results);
    } catch (error) {
      console.error("[AI Impact Analysis Route] Error analyzing gameweeks:", error);
      res.status(500).json({
        error: "Unable to analyze gameweeks - please try again later",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.post("/api/ai-impact/analyze-plan/:planId", async (req, res) => {
    try {
      const planId = parseInt(req.params.planId);
      if (isNaN(planId)) {
        return res.status(400).json({ error: "Invalid plan ID provided" });
      }
      const plan = await storage.getGameweekPlanById(planId);
      if (!plan) {
        return res.status(404).json({ error: "Gameweek plan not found" });
      }
      console.log(`[AI Impact Analysis Route] Analyzing plan ${planId} for gameweek ${plan.gameweek}`);
      const result = await aiImpactAnalysis.analyzeGameweekImpact(planId);
      console.log(`[AI Impact Analysis Route] Analysis complete for plan ${planId}: ${result.pointsDelta >= 0 ? "+" : ""}${result.pointsDelta} points`);
      res.json(result);
    } catch (error) {
      console.error("[AI Impact Analysis Route] Error analyzing plan:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("not finished")) {
        return res.status(400).json({
          error: "Unable to analyze gameweek - please ensure the gameweek has finished",
          details: errorMessage
        });
      }
      if (errorMessage.includes("was not applied")) {
        return res.status(400).json({
          error: "Cannot analyze plan that was not applied",
          details: errorMessage
        });
      }
      res.status(500).json({
        error: "Unable to analyze gameweek plan - please try again later",
        details: errorMessage
      });
    }
  });
  app2.get("/api/ai-impact/summary/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID provided" });
      }
      console.log(`[AI Impact Analysis Route] Fetching impact summary for user ${userId}`);
      const allPlans = await storage.getGameweekPlansByUser(userId);
      const analyzedPlans = allPlans.filter(
        (plan) => plan.analysisCompletedAt !== null && plan.pointsDelta !== null
      );
      if (analyzedPlans.length === 0) {
        return res.json({
          totalGameweeksAnalyzed: 0,
          totalPointsDelta: 0,
          averagePointsDelta: 0,
          positiveImpactCount: 0,
          negativeImpactCount: 0,
          gameweekBreakdown: []
        });
      }
      const totalPointsDelta = analyzedPlans.reduce((sum, plan) => sum + (plan.pointsDelta || 0), 0);
      const averagePointsDelta = totalPointsDelta / analyzedPlans.length;
      const positiveImpactCount = analyzedPlans.filter((plan) => (plan.pointsDelta || 0) > 0).length;
      const negativeImpactCount = analyzedPlans.filter((plan) => (plan.pointsDelta || 0) < 0).length;
      const gameweekBreakdown = analyzedPlans.map((plan) => ({
        planId: plan.id,
        gameweek: plan.gameweek,
        pointsDelta: plan.pointsDelta || 0,
        actualPointsWithAI: plan.actualPointsWithAI || 0,
        actualPointsWithoutAI: plan.actualPointsWithoutAI || 0,
        analysisCompletedAt: plan.analysisCompletedAt,
        status: plan.status,
        transfers: plan.transfers,
        captainId: plan.captainId
      })).sort((a, b) => a.gameweek - b.gameweek);
      const summary = {
        totalGameweeksAnalyzed: analyzedPlans.length,
        totalPointsDelta: Math.round(totalPointsDelta * 100) / 100,
        averagePointsDelta: Math.round(averagePointsDelta * 100) / 100,
        positiveImpactCount,
        negativeImpactCount,
        gameweekBreakdown
      };
      console.log(`[AI Impact Analysis Route] Summary complete: ${summary.totalGameweeksAnalyzed} gameweeks, ${summary.totalPointsDelta >= 0 ? "+" : ""}${summary.totalPointsDelta} total impact`);
      res.json(summary);
    } catch (error) {
      console.error("[AI Impact Analysis Route] Error fetching summary:", error);
      res.status(500).json({
        error: "Unable to fetch impact summary - please try again later",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });
  app2.get("/api/settings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId parameter" });
      }
      const settings = await storage.getUserSettings(userId);
      if (!settings) {
        return res.json({
          manager_id: null,
          risk_tolerance: "balanced",
          auto_captain: false,
          notifications_enabled: false
        });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });
  app2.post("/api/settings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId parameter" });
      }
      const validatedSettings = userSettingsSchema.parse(req.body);
      const settings = await storage.saveUserSettings(userId, validatedSettings);
      res.json(settings);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({ error: "Invalid settings data", details: error.errors });
      }
      console.error("Error saving settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });
  app2.post("/api/teams", async (req, res) => {
    try {
      const { userId, gameweek, players, formation, teamValue, bank, transfersMade } = req.body;
      if (!userId || !gameweek || !players || !formation || teamValue === void 0 || bank === void 0) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const team = await storage.saveTeam({
        userId,
        gameweek,
        players,
        formation,
        teamValue,
        bank,
        transfersMade: transfersMade || 0,
        lastDeadlineBank: bank
      });
      res.json(team);
    } catch (error) {
      console.error("Error saving team:", error);
      res.status(500).json({ error: "Failed to save team" });
    }
  });
  app2.get("/api/teams/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek) : void 0;
      if (gameweek) {
        const team = await storage.getTeam(userId, gameweek);
        res.json(team || null);
      } else {
        const teams = await storage.getTeamsByUser(userId);
        res.json(teams);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });
  app2.post("/api/transfers", async (req, res) => {
    try {
      const { userId, gameweek, playerInId, playerOutId, cost } = req.body;
      if (!userId || !gameweek || !playerInId || !playerOutId || cost === void 0) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const transfer = await storage.saveTransfer({
        userId,
        gameweek,
        playerInId,
        playerOutId,
        cost
      });
      res.json(transfer);
    } catch (error) {
      console.error("Error saving transfer:", error);
      res.status(500).json({ error: "Failed to save transfer" });
    }
  });
  app2.get("/api/transfers/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek) : void 0;
      if (gameweek) {
        const transfers2 = await storage.getTransfers(userId, gameweek);
        res.json(transfers2);
      } else {
        const transfers2 = await storage.getTransfersByUser(userId);
        res.json(transfers2);
      }
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ error: "Failed to fetch transfers" });
    }
  });
  app2.get("/api/performance/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek) : void 0;
      if (!gameweek) {
        return res.status(400).json({ error: "Gameweek parameter is required" });
      }
      const performance = await actualPointsService.getPerformanceComparison(userId, gameweek);
      res.json(performance);
    } catch (error) {
      console.error("Error fetching performance data:", error);
      res.status(500).json({ error: "Failed to fetch performance data" });
    }
  });
  app2.post("/api/performance/update-actual", async (req, res) => {
    try {
      const { userId, gameweek } = req.body;
      if (!userId || !gameweek) {
        return res.status(400).json({ error: "Missing userId or gameweek" });
      }
      const result = await actualPointsService.updateActualPoints(userId, gameweek);
      res.json(result);
    } catch (error) {
      console.error("Error updating actual points:", error);
      res.status(500).json({ error: "Failed to update actual points" });
    }
  });
  app2.get("/api/league-analysis/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek) : void 0;
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const userSettings = await storage.getUserSettings(userId);
      if (!userSettings?.manager_id) {
        return res.status(400).json({ error: "Manager ID not configured in user settings" });
      }
      if (!userSettings.primary_league_id) {
        return res.status(400).json({ error: "No primary league configured in user settings" });
      }
      const planningGameweek = await fplApi.getPlanningGameweek();
      const gwToUse = gameweek || planningGameweek?.id || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(gwToUse);
      const players = snapshot.data.players;
      const analysis = await leagueAnalysis.analyzeLeague(
        userSettings.primary_league_id,
        userId,
        userSettings.manager_id,
        gwToUse,
        players
      );
      if (!analysis) {
        return res.status(404).json({ error: "Could not analyze league. League may be private or empty." });
      }
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing league:", error);
      res.status(500).json({ error: "Failed to analyze league" });
    }
  });
  app2.get("/api/league-projection/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek) : void 0;
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      console.log(`[LEAGUE PROJECTION] Fetching projection for user ${userId}, GW ${gameweek}`);
      const userSettings = await storage.getUserSettings(userId);
      if (!userSettings?.manager_id) {
        return res.status(400).json({ error: "Manager ID not configured in user settings" });
      }
      if (!userSettings.primary_league_id) {
        return res.status(400).json({ error: "No primary league configured in user settings" });
      }
      const planningGameweek = await fplApi.getPlanningGameweek();
      const gwToUse = gameweek || planningGameweek?.id || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(gwToUse);
      const players = snapshot.data.players;
      const teams = snapshot.data.teams;
      const gameweeks = snapshot.data.gameweeks;
      const fixtures = snapshot.data.fixtures.filter((f) => f.event === gwToUse);
      console.log(`[LEAGUE PROJECTION] Fetching league standings for league ${userSettings.primary_league_id}`);
      const standings = await fplApi.getLeagueStandings(userSettings.primary_league_id);
      const entries = standings.standings?.results || [];
      if (entries.length === 0) {
        return res.status(404).json({ error: "No league standings found" });
      }
      const competitorIds = entries.map((e) => e.entry);
      console.log(`[LEAGUE PROJECTION] Predicting points for ${competitorIds.length} competitors`);
      const predictions2 = await competitorPredictor.predictCompetitorPoints(
        userSettings.primary_league_id,
        competitorIds,
        gwToUse,
        players,
        fixtures,
        teams,
        gameweeks
      );
      const aiPlan = await storage.getGameweekPlan(userId, gwToUse);
      const userPredictedPoints = aiPlan?.predictedPoints;
      console.log(`[LEAGUE PROJECTION] Calculating projections`);
      if (userPredictedPoints) {
        console.log(`[LEAGUE PROJECTION] Using AI plan prediction for user: ${userPredictedPoints} pts`);
      }
      const projection = leagueProjection.calculateProjection(
        entries,
        predictions2,
        userSettings.manager_id,
        userPredictedPoints
      );
      res.json({
        gameweek: gwToUse,
        leagueId: userSettings.primary_league_id,
        ...projection
      });
    } catch (error) {
      console.error("[LEAGUE PROJECTION] Error:", error);
      res.status(500).json({ error: "Failed to calculate league projection" });
    }
  });
  app2.get("/api/decision-ledger/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit) : 50;
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      const decisions = await storage.getDecisionsByUser(userId, limit);
      res.json({ decisions, count: decisions.length });
    } catch (error) {
      console.error("Error fetching decisions by user:", error);
      res.status(500).json({ error: "Failed to fetch decisions" });
    }
  });
  app2.get("/api/decision-ledger/user/:userId/gameweek/:gameweek", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const gameweek = parseInt(req.params.gameweek);
      if (isNaN(userId) || isNaN(gameweek)) {
        return res.status(400).json({ error: "Invalid userId or gameweek" });
      }
      const decisions = await storage.getDecisionsByGameweek(userId, gameweek);
      res.json({ decisions, count: decisions.length });
    } catch (error) {
      console.error("Error fetching decisions by gameweek:", error);
      res.status(500).json({ error: "Failed to fetch decisions" });
    }
  });
  app2.get("/api/decision-ledger/snapshot/:snapshotId", async (req, res) => {
    try {
      const snapshotId = req.params.snapshotId;
      const decisions = await storage.getDecisionsBySnapshot(snapshotId);
      res.json({ decisions, count: decisions.length });
    } catch (error) {
      console.error("Error fetching decisions by snapshot:", error);
      res.status(500).json({ error: "Failed to fetch decisions" });
    }
  });
  app2.get("/api/decision-ledger/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid decision ID" });
      }
      const decision = await storage.getDecisionById(id);
      if (decision) {
        res.json(decision);
      } else {
        res.status(404).json({ error: "Decision not found" });
      }
    } catch (error) {
      console.error("Error fetching decision by ID:", error);
      res.status(500).json({ error: "Failed to fetch decision" });
    }
  });
  app2.get("/api/monitoring/snapshot-cache", async (req, res) => {
    const status = gameweekSnapshot.getCacheStatus();
    res.json(status);
  });
  app2.get("/api/monitoring/precomputation-cache", async (req, res) => {
    const stats = precomputationCache.getStats();
    res.json(stats);
  });
  app2.get("/api/monitoring/dashboard", async (req, res) => {
    const snapshotStatus = gameweekSnapshot.getCacheStatus();
    const precomputationStats = precomputationCache.getStats();
    res.json({
      snapshot: snapshotStatus,
      precomputation: precomputationStats,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/automation-scheduler.ts
init_storage();
init_fpl_api();
var CHECK_INTERVAL = 30 * 60 * 1e3;
var AUTO_APPLY_WINDOW_HOURS = 2;
var AutomationScheduler = class {
  intervalId = null;
  isRunning = false;
  start() {
    if (this.isRunning) {
      console.log("[AutoScheduler] Scheduler is already running");
      return;
    }
    console.log("[AutoScheduler] Starting automation scheduler...");
    console.log(`[AutoScheduler] Check interval: ${CHECK_INTERVAL / 1e3 / 60} minutes`);
    console.log(`[AutoScheduler] Auto-apply window: ${AUTO_APPLY_WINDOW_HOURS} hours before deadline`);
    this.isRunning = true;
    this.checkAndApplyPlans().catch((error) => {
      console.error("[AutoScheduler] Error in initial check:", error);
    });
    this.intervalId = setInterval(() => {
      this.checkAndApplyPlans().catch((error) => {
        console.error("[AutoScheduler] Error in scheduled check:", error);
      });
    }, CHECK_INTERVAL);
    console.log("[AutoScheduler] \u2713 Scheduler started successfully");
  }
  stop() {
    if (!this.isRunning) {
      console.log("[AutoScheduler] Scheduler is not running");
      return;
    }
    console.log("[AutoScheduler] Stopping automation scheduler...");
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("[AutoScheduler] \u2713 Scheduler stopped");
  }
  async checkAndApplyPlans() {
    const now = /* @__PURE__ */ new Date();
    console.log(`[AutoScheduler] Running scheduled check at ${now.toISOString()}`);
    try {
      const automationSettingsList = await storage.getUsersWithAutoSyncEnabled();
      if (automationSettingsList.length === 0) {
        console.log("[AutoScheduler] No users with auto-sync enabled");
        return;
      }
      console.log(`[AutoScheduler] Found ${automationSettingsList.length} user(s) with auto-sync enabled`);
      const currentGameweek = await fplApi.getCurrentGameweek();
      const nextGameweek = await fplApi.getNextGameweek();
      const targetGameweek = currentGameweek && !currentGameweek.finished ? currentGameweek : nextGameweek;
      if (!targetGameweek) {
        console.log("[AutoScheduler] No active gameweek found");
        return;
      }
      console.log(`[AutoScheduler] Target gameweek: ${targetGameweek.name} (ID: ${targetGameweek.id})`);
      console.log(`[AutoScheduler] Deadline: ${targetGameweek.deadline_time}`);
      const deadlineDate = new Date(targetGameweek.deadline_time);
      const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / 1e3 / 60 / 60;
      console.log(`[AutoScheduler] Hours until deadline: ${hoursUntilDeadline.toFixed(2)}`);
      if (hoursUntilDeadline > AUTO_APPLY_WINDOW_HOURS) {
        console.log(`[AutoScheduler] Not yet in auto-apply window (>${AUTO_APPLY_WINDOW_HOURS} hours until deadline)`);
        return;
      }
      if (hoursUntilDeadline <= 0) {
        console.log("[AutoScheduler] Deadline has passed");
        return;
      }
      console.log("[AutoScheduler] \u2713 In auto-apply window, processing users...");
      let processedCount = 0;
      let skippedCount = 0;
      let appliedCount = 0;
      let errorCount = 0;
      for (const settings of automationSettingsList) {
        try {
          const result = await this.processUser(settings, targetGameweek.id);
          if (result.processed) {
            processedCount++;
            if (result.applied) {
              appliedCount++;
            }
          } else {
            skippedCount++;
          }
        } catch (error) {
          errorCount++;
          console.error(`[AutoScheduler] Error processing user ${settings.userId}:`, error);
        }
      }
      console.log(`[AutoScheduler] \u2713 Check complete - Processed: ${processedCount}, Applied: ${appliedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
    } catch (error) {
      console.error("[AutoScheduler] Error in checkAndApplyPlans:", error);
    }
  }
  async processUser(settings, gameweek) {
    const userId = settings.userId;
    try {
      const isAuthenticated = await fplAuth.isAuthenticated(userId);
      if (!isAuthenticated) {
        console.log(`[AutoScheduler] Skipping user ${userId}: Not FPL authenticated`);
        return { processed: false, applied: false };
      }
      const userSettings = await storage.getUserSettings(userId);
      if (!userSettings || !userSettings.manager_id) {
        console.log(`[AutoScheduler] Skipping user ${userId}: No manager_id configured`);
        return { processed: false, applied: false };
      }
      let plan = await storage.getGameweekPlan(userId, gameweek);
      if (plan && plan.status === "applied") {
        console.log(`[AutoScheduler] Skipping user ${userId}: Plan already applied for GW${gameweek}`);
        return { processed: false, applied: false };
      }
      if (!plan) {
        console.log(`[AutoScheduler] Generating plan for user ${userId}, GW${gameweek}...`);
        try {
          plan = await gameweekAnalyzer.analyzeGameweek(userId, gameweek);
          console.log(`[AutoScheduler] \u2713 Plan generated for user ${userId}, plan ID: ${plan.id}`);
        } catch (error) {
          console.error(`[AutoScheduler] Failed to generate plan for user ${userId}:`, error);
          return { processed: true, applied: false };
        }
      }
      console.log(`[AutoScheduler] Applying plan ${plan.id} for user ${userId}, GW${gameweek}...`);
      const shouldApplyTransfers = settings.autoApplyTransfers && plan.transfers && plan.transfers.length > 0;
      const shouldApplyCaptain = settings.autoApplyCaptain && plan.captainId && plan.viceCaptainId;
      const shouldApplyChip = settings.autoApplyChips && plan.chipToPlay;
      if (!shouldApplyTransfers && !shouldApplyCaptain && !shouldApplyChip) {
        console.log(`[AutoScheduler] Skipping user ${userId}: No auto-apply settings enabled`);
        return { processed: false, applied: false };
      }
      const result = await transferApplication.applyGameweekPlan(userId, plan.id);
      if (result.success) {
        console.log(`[AutoScheduler] \u2713 Successfully applied plan ${plan.id} for user ${userId}`);
        console.log(`[AutoScheduler]   - Transfers: ${result.transfersApplied ? "\u2713" : "\u2717"} (${result.details.transfersCount || 0})`);
        console.log(`[AutoScheduler]   - Captain: ${result.captainSet ? "\u2713" : "\u2717"} (ID: ${result.details.captainId || "N/A"})`);
        console.log(`[AutoScheduler]   - Chip: ${result.chipPlayed ? "\u2713" : "\u2717"} (Type: ${result.details.chipType || "N/A"})`);
        return { processed: true, applied: true };
      } else {
        console.error(`[AutoScheduler] \u2717 Failed to apply plan ${plan.id} for user ${userId}:`, result.errors);
        return { processed: true, applied: false };
      }
    } catch (error) {
      console.error(`[AutoScheduler] Error processing user ${userId}:`, error);
      return { processed: true, applied: false };
    }
  }
};
var automationScheduler = new AutomationScheduler();
var automation_scheduler_default = automationScheduler;

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
    automation_scheduler_default.start();
  });
})();
