import { z } from "zod";
import { pgTable, text, integer, jsonb, timestamp, boolean, index, serial, uniqueIndex, real } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// FPL Player Data (from bootstrap-static API)
export const fplPlayerSchema = z.object({
  id: z.number(),
  web_name: z.string(),
  first_name: z.string(),
  second_name: z.string(),
  team: z.number(),
  team_code: z.number(), // Team code for shirt images (matches team.code)
  element_type: z.number(), // 1=GK, 2=DEF, 3=MID, 4=FWD
  now_cost: z.number(), // Price in tenths (divide by 10)
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
  status: z.string(), // a=available, d=doubtful, i=injured, u=unavailable
  chance_of_playing_this_round: z.number().nullable(),
  chance_of_playing_next_round: z.number().nullable(),
  news: z.string(),
  influence: z.string(),
  creativity: z.string(),
  threat: z.string(),
  photo: z.string(), // Player photo filename e.g. "437730.jpg"
});

export type FPLPlayer = z.infer<typeof fplPlayerSchema>;

// FPL Team Data
export const fplTeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  short_name: z.string(),
  code: z.number(), // Used for badge URLs: https://resources.premierleague.com/premierleague/badges/t{code}.png
  strength: z.number(),
  strength_overall_home: z.number(),
  strength_overall_away: z.number(),
  strength_attack_home: z.number(),
  strength_attack_away: z.number(),
  strength_defence_home: z.number(),
  strength_defence_away: z.number(),
});

export type FPLTeam = z.infer<typeof fplTeamSchema>;

// FPL Fixture Data
export const fplFixtureSchema = z.object({
  id: z.number(),
  event: z.number().nullable(), // Gameweek
  team_h: z.number(),
  team_a: z.number(),
  team_h_difficulty: z.number(),
  team_a_difficulty: z.number(),
  kickoff_time: z.string().nullable(),
  finished: z.boolean(),
  team_h_score: z.number().nullable(),
  team_a_score: z.number().nullable(),
});

export type FPLFixture = z.infer<typeof fplFixtureSchema>;

// Gameweek Event Data
export const fplGameweekSchema = z.object({
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
  top_element: z.number().nullable(),
});

export type FPLGameweek = z.infer<typeof fplGameweekSchema>;

// User's FPL Manager Entry
export const fplManagerSchema = z.object({
  id: z.number(),
  entry_name: z.string(),
  player_first_name: z.string(),
  player_last_name: z.string(),
  summary_overall_points: z.number(),
  summary_overall_rank: z.number(),
  current_event: z.number(),
  last_deadline_bank: z.number(),
  last_deadline_value: z.number(),
  last_deadline_total_transfers: z.number(),
});

export type FPLManager = z.infer<typeof fplManagerSchema>;

// User's Team Selection (picks for a gameweek)
export const fplPickSchema = z.object({
  element: z.number(), // Player ID
  position: z.number(), // Position 1-15
  multiplier: z.number(), // 0=benched, 1=playing, 2=captain, 3=triple captain
  is_captain: z.boolean(),
  is_vice_captain: z.boolean(),
});

export type FPLPick = z.infer<typeof fplPickSchema>;

export const fplTeamPicksSchema = z.object({
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
    points_on_bench: z.number(),
  }),
});

export type FPLTeamPicks = z.infer<typeof fplTeamPicksSchema>;

// Transfer Data
export const fplTransferSchema = z.object({
  element_in: z.number(),
  element_in_cost: z.number(),
  element_out: z.number(),
  element_out_cost: z.number(),
  entry: z.number(),
  event: z.number(),
  time: z.string(),
});

export type FPLTransfer = z.infer<typeof fplTransferSchema>;

// AI Prediction/Recommendation Data
export const predictionSchema = z.object({
  player_id: z.number(),
  predicted_points: z.number(),
  confidence: z.number(), // 0-100
  reasoning: z.string(),
  fixtures_considered: z.array(z.number()),
});

export type Prediction = z.infer<typeof predictionSchema>;

export const transferRecommendationSchema = z.object({
  player_out_id: z.number(),
  player_in_id: z.number(),
  expected_points_gain: z.number(),
  reasoning: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  cost_impact: z.number(),
});

export type TransferRecommendation = z.infer<typeof transferRecommendationSchema>;

export const captainRecommendationSchema = z.object({
  player_id: z.number(),
  expected_points: z.number(),
  confidence: z.number(),
  reasoning: z.string(),
  differential: z.boolean(), // Is this a differential pick?
  ownership_percent: z.number(),
});

export type CaptainRecommendation = z.infer<typeof captainRecommendationSchema>;

// Chip Strategy Data
export const chipStrategySchema = z.object({
  chip_name: z.enum(['wildcard', 'freehit', 'benchboost', 'triplecaptain']),
  recommended_gameweek: z.number(),
  reasoning: z.string(),
  expected_value: z.number(),
  confidence: z.number(),
});

export type ChipStrategy = z.infer<typeof chipStrategySchema>;

// Team Modeller Draft State (in-memory state for the interactive modeller)
export const teamDraftSchema = z.object({
  picks: z.array(z.object({
    player_id: z.number().nullable(),
    position: z.number(),
    is_captain: z.boolean(),
    is_vice_captain: z.boolean(),
  })),
  budget_remaining: z.number(),
  predicted_points: z.number(),
  formation: z.string(), // e.g., "4-4-2"
});

export type TeamDraft = z.infer<typeof teamDraftSchema>;

// Performance Comparison
export const performanceComparisonSchema = z.object({
  gameweek: z.number(),
  actual_points: z.number(),
  predicted_points: z.number(),
  difference: z.number(),
  accuracy: z.number(),
});

export type PerformanceComparison = z.infer<typeof performanceComparisonSchema>;

// User Settings (stored in memory)
export const userSettingsSchema = z.object({
  manager_id: z.number().nullable(),
  primary_league_id: z.number().nullable().optional(),
  risk_tolerance: z.enum(['conservative', 'balanced', 'aggressive']).default('balanced'),
  auto_captain: z.boolean().default(false),
  notifications_enabled: z.boolean().optional().default(false),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;

// ==================== DRIZZLE DATABASE TABLES ====================

// Users Table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  fplManagerId: integer('fpl_manager_id').unique().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// User Settings Table
export const userSettingsTable = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  managerId: integer('manager_id'),
  primaryLeagueId: integer('primary_league_id'),
  riskTolerance: text('risk_tolerance', { enum: ['conservative', 'balanced', 'aggressive'] }).default('balanced').notNull(),
  autoCaptain: boolean('auto_captain').default(false).notNull(),
  notificationsEnabled: boolean('notifications_enabled').default(false).notNull(),
}, (table) => ({
  userIdIdx: index('user_settings_user_id_idx').on(table.userId),
}));

export const insertUserSettingsTableSchema = createInsertSchema(userSettingsTable).omit({ id: true });
export type InsertUserSettingsTable = z.infer<typeof insertUserSettingsTableSchema>;
export type UserSettingsTable = typeof userSettingsTable.$inferSelect;

// User Teams Table
export const userTeams = pgTable('user_teams', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  gameweek: integer('gameweek').notNull(),
  players: jsonb('players').notNull().$type<Array<{
    player_id: number | null;
    position: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>>(),
  formation: text('formation').notNull(),
  teamValue: integer('team_value').notNull(),
  bank: integer('bank').notNull(),
  transfersMade: integer('transfers_made').notNull().default(0),
  lastDeadlineBank: integer('last_deadline_bank').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull().$onUpdate(() => new Date()),
}, (table) => ({
  userIdIdx: index('user_teams_user_id_idx').on(table.userId),
  gameweekIdx: index('user_teams_gameweek_idx').on(table.gameweek),
  userGameweekIdx: index('user_teams_user_gameweek_idx').on(table.userId, table.gameweek),
  userGameweekUnique: uniqueIndex('user_teams_user_gameweek_unique').on(table.userId, table.gameweek),
}));

export const insertUserTeamSchema = createInsertSchema(userTeams).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserTeam = z.infer<typeof insertUserTeamSchema>;
export type UserTeam = typeof userTeams.$inferSelect;

// Predictions Table
export const predictions = pgTable('predictions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  gameweek: integer('gameweek').notNull(),
  playerId: integer('player_id').notNull(),
  predictedPoints: real('predicted_points').notNull(),
  actualPoints: real('actual_points'),
  confidence: integer('confidence').notNull(),
  snapshotId: text('snapshot_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('predictions_user_id_idx').on(table.userId),
  gameweekIdx: index('predictions_gameweek_idx').on(table.gameweek),
  playerIdIdx: index('predictions_player_id_idx').on(table.playerId),
  userGameweekIdx: index('predictions_user_gameweek_idx').on(table.userId, table.gameweek),
  userGameweekPlayerIdx: uniqueIndex('predictions_user_gameweek_player_idx').on(table.userId, table.gameweek, table.playerId),
  snapshotIdIdx: index('predictions_snapshot_id_idx').on(table.snapshotId),
}));

export const insertPredictionSchema = createInsertSchema(predictions).omit({ id: true, createdAt: true });
export type InsertPrediction = z.infer<typeof insertPredictionSchema>;
export type PredictionDB = typeof predictions.$inferSelect;

// AI Team Analysis Predictions (for async polling)
export const aiTeamPredictions = pgTable('ai_team_predictions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  requestData: jsonb('request_data').notNull(), // {players, formation}
  status: text('status', { enum: ['pending', 'processing', 'complete', 'error'] }).notNull().default('pending'),
  result: jsonb('result'), // {insights, predicted_points, confidence}
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
}, (table) => ({
  userIdIdx: index('ai_team_predictions_user_id_idx').on(table.userId),
  statusIdx: index('ai_team_predictions_status_idx').on(table.status),
}));

export const insertAiTeamPredictionSchema = createInsertSchema(aiTeamPredictions).omit({ id: true, createdAt: true, completedAt: true });
export type InsertAiTeamPrediction = z.infer<typeof insertAiTeamPredictionSchema>;
export type AiTeamPrediction = typeof aiTeamPredictions.$inferSelect;

// Transfers Table
export const transfers = pgTable('transfers', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  gameweek: integer('gameweek').notNull(),
  playerInId: integer('player_in_id').notNull(),
  playerOutId: integer('player_out_id').notNull(),
  cost: integer('cost').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('transfers_user_id_idx').on(table.userId),
  gameweekIdx: index('transfers_gameweek_idx').on(table.gameweek),
  userGameweekIdx: index('transfers_user_gameweek_idx').on(table.userId, table.gameweek),
}));

export const insertTransferSchema = createInsertSchema(transfers).omit({ id: true, createdAt: true });
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type Transfer = typeof transfers.$inferSelect;

// Chips Used Table
export const chipsUsed = pgTable('chips_used', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  chipType: text('chip_type', { enum: ['wildcard', 'freehit', 'benchboost', 'triplecaptain'] }).notNull(),
  gameweekUsed: integer('gameweek_used').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('chips_used_user_id_idx').on(table.userId),
  gameweekIdx: index('chips_used_gameweek_idx').on(table.gameweekUsed),
  userChipGameweekUnique: uniqueIndex('chips_used_user_chip_gameweek_unique').on(table.userId, table.chipType, table.gameweekUsed),
}));

export const insertChipUsedSchema = createInsertSchema(chipsUsed).omit({ id: true, createdAt: true });
export type InsertChipUsed = z.infer<typeof insertChipUsedSchema>;
export type ChipUsed = typeof chipsUsed.$inferSelect;

// FPL Credentials Table
export const fplCredentials = pgTable('fpl_credentials', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  emailEncrypted: text('email_encrypted'),
  passwordEncrypted: text('password_encrypted'),
  sessionCookies: text('session_cookies'),
  cookiesExpiresAt: timestamp('cookies_expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('fpl_credentials_user_id_idx').on(table.userId),
}));

export const insertFplCredentialsSchema = createInsertSchema(fplCredentials).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFplCredentials = z.infer<typeof insertFplCredentialsSchema>;
export type FplCredentials = typeof fplCredentials.$inferSelect;

// Automation Settings Table
export const automationSettings = pgTable('automation_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  autoSyncEnabled: boolean('auto_sync_enabled').default(false).notNull(),
  autoApplyTransfers: boolean('auto_apply_transfers').default(false).notNull(),
  autoApplyCaptain: boolean('auto_apply_captain').default(false).notNull(),
  autoApplyChips: boolean('auto_apply_chips').default(false).notNull(),
  maxTransferHit: integer('max_transfer_hit').default(8).notNull(),
  notificationEnabled: boolean('notification_enabled').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('automation_settings_user_id_idx').on(table.userId),
}));

export const insertAutomationSettingsSchema = createInsertSchema(automationSettings).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAutomationSettings = z.infer<typeof insertAutomationSettingsSchema>;
export type AutomationSettings = typeof automationSettings.$inferSelect;

// Gameweek Plans Table
export const gameweekPlans = pgTable('gameweek_plans', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  gameweek: integer('gameweek').notNull(),
  transfers: jsonb('transfers').notNull().$type<Array<{
    player_out_id: number;
    player_in_id: number;
    expected_points_gain: number;
    expected_points_gain_timeframe: string;
    reasoning: string;
    priority: 'high' | 'medium' | 'low';
    cost_impact: number;
    accepted: boolean;
  }>>(),
  lineupOptimizations: jsonb('lineup_optimizations').$type<Array<{
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
  }>>(),
  captainId: integer('captain_id'),
  viceCaptainId: integer('vice_captain_id'),
  chipToPlay: text('chip_to_play', { enum: ['wildcard', 'freehit', 'benchboost', 'triplecaptain'] }),
  formation: text('formation').notNull(),
  lineup: jsonb('lineup').$type<Array<{
    player_id: number;
    position: number;
    is_captain: boolean;
    is_vice_captain: boolean;
    multiplier: number;
  }>>(),
  predictedPoints: integer('predicted_points').notNull(),
  baselinePredictedPoints: integer('baseline_predicted_points'),
  confidence: integer('confidence').notNull(),
  aiReasoning: text('ai_reasoning').notNull(),
  status: text('status', { enum: ['pending', 'previewed', 'applied', 'rejected'] }).notNull().default('pending'),
  appliedAt: timestamp('applied_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  originalTeamSnapshot: jsonb('original_team_snapshot').$type<{
    captain_id: number;
    vice_captain_id: number;
    players: Array<{
      player_id: number | null;
      position: number;
      is_captain: boolean;
      is_vice_captain: boolean;
      multiplier: number;
    }>;
  }>(),
  actualPointsWithAI: integer('actual_points_with_ai'),
  actualPointsWithoutAI: integer('actual_points_without_ai'),
  pointsDelta: integer('points_delta'),
  analysisCompletedAt: timestamp('analysis_completed_at'),
  predictionAnalysis: text('prediction_analysis'),
  recommendationsChanged: boolean('recommendations_changed').default(false),
  changeReasoning: text('change_reasoning'),
  snapshotId: text('snapshot_id'),
  snapshotGameweek: integer('snapshot_gameweek'),
  snapshotTimestamp: timestamp('snapshot_timestamp'),
  snapshotEnriched: boolean('snapshot_enriched'),
  submitted: boolean('submitted').default(false),
  submittedAt: timestamp('submitted_at'),
}, (table) => ({
  userIdIdx: index('gameweek_plans_user_id_idx').on(table.userId),
  gameweekIdx: index('gameweek_plans_gameweek_idx').on(table.gameweek),
  userGameweekIdx: index('gameweek_plans_user_gameweek_idx').on(table.userId, table.gameweek),
}));

export const insertGameweekPlanSchema = createInsertSchema(gameweekPlans).omit({ id: true, createdAt: true });
export type InsertGameweekPlan = z.infer<typeof insertGameweekPlanSchema>;
export type GameweekPlan = typeof gameweekPlans.$inferSelect;

// Change History Table
export const changeHistory = pgTable('change_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  gameweek: integer('gameweek').notNull(),
  changeType: text('change_type', { enum: ['transfer', 'captain', 'chip', 'formation'] }).notNull(),
  changeData: jsonb('change_data').notNull().$type<{
    [key: string]: any;
  }>(),
  appliedSuccessfully: boolean('applied_successfully').notNull(),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('change_history_user_id_idx').on(table.userId),
  gameweekIdx: index('change_history_gameweek_idx').on(table.gameweek),
  userGameweekIdx: index('change_history_user_gameweek_idx').on(table.userId, table.gameweek),
}));

export const insertChangeHistorySchema = createInsertSchema(changeHistory).omit({ id: true, createdAt: true });
export type InsertChangeHistory = z.infer<typeof insertChangeHistorySchema>;
export type ChangeHistory = typeof changeHistory.$inferSelect;

// ==================== DRIZZLE RELATIONS ====================

export const usersRelations = relations(users, ({ many, one }) => ({
  teams: many(userTeams),
  predictions: many(predictions),
  transfers: many(transfers),
  chipsUsed: many(chipsUsed),
  settings: one(userSettingsTable, {
    fields: [users.id],
    references: [userSettingsTable.userId],
  }),
  fplCredentials: one(fplCredentials, {
    fields: [users.id],
    references: [fplCredentials.userId],
  }),
  automationSettings: one(automationSettings, {
    fields: [users.id],
    references: [automationSettings.userId],
  }),
  gameweekPlans: many(gameweekPlans),
  changeHistory: many(changeHistory),
}));

export const userSettingsRelations = relations(userSettingsTable, ({ one }) => ({
  user: one(users, {
    fields: [userSettingsTable.userId],
    references: [users.id],
  }),
}));

export const userTeamsRelations = relations(userTeams, ({ one }) => ({
  user: one(users, {
    fields: [userTeams.userId],
    references: [users.id],
  }),
}));

export const predictionsRelations = relations(predictions, ({ one }) => ({
  user: one(users, {
    fields: [predictions.userId],
    references: [users.id],
  }),
}));

export const transfersRelations = relations(transfers, ({ one }) => ({
  user: one(users, {
    fields: [transfers.userId],
    references: [users.id],
  }),
}));

export const chipsUsedRelations = relations(chipsUsed, ({ one }) => ({
  user: one(users, {
    fields: [chipsUsed.userId],
    references: [users.id],
  }),
}));

export const fplCredentialsRelations = relations(fplCredentials, ({ one }) => ({
  user: one(users, {
    fields: [fplCredentials.userId],
    references: [users.id],
  }),
}));

export const automationSettingsRelations = relations(automationSettings, ({ one }) => ({
  user: one(users, {
    fields: [automationSettings.userId],
    references: [users.id],
  }),
}));

export const gameweekPlansRelations = relations(gameweekPlans, ({ one }) => ({
  user: one(users, {
    fields: [gameweekPlans.userId],
    references: [users.id],
  }),
}));

export const changeHistoryRelations = relations(changeHistory, ({ one }) => ({
  user: one(users, {
    fields: [changeHistory.userId],
    references: [users.id],
  }),
}));

// ==================== PHASE 2: AI PRECOMPUTATION & AUDIT TRAIL ====================

// AI Precomputations Table (for caching intermediate AI results)
export const aiPrecomputations = pgTable('ai_precomputations', {
  id: serial('id').primaryKey(),
  snapshotId: text('snapshot_id').notNull(),
  gameweek: integer('gameweek').notNull(),
  computationType: text('computation_type', { 
    enum: ['player_projections', 'fixture_difficulty', 'captain_shortlist', 'chip_heuristics'] 
  }).notNull(),
  playerId: integer('player_id'),
  result: jsonb('result').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
}, (table) => ({
  snapshotIdIdx: index('ai_precomp_snapshot_id_idx').on(table.snapshotId),
  gameweekIdx: index('ai_precomp_gameweek_idx').on(table.gameweek),
  typeIdx: index('ai_precomp_type_idx').on(table.computationType),
  playerIdIdx: index('ai_precomp_player_id_idx').on(table.playerId),
  snapshotTypePlayerUnique: uniqueIndex('ai_precomp_snapshot_type_player_unique')
    .on(table.snapshotId, table.computationType, table.playerId),
}));

export const insertAiPrecomputationSchema = createInsertSchema(aiPrecomputations).omit({ id: true, createdAt: true });
export type InsertAiPrecomputation = z.infer<typeof insertAiPrecomputationSchema>;
export type AiPrecomputation = typeof aiPrecomputations.$inferSelect;

// AI Decision Ledger Table (for audit trail and replay)
export const aiDecisionLedger = pgTable('ai_decision_ledger', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  planId: integer('plan_id').references(() => gameweekPlans.id, { onDelete: 'cascade' }),
  snapshotId: text('snapshot_id').notNull(),
  gameweek: integer('gameweek').notNull(),
  decisionType: text('decision_type', { 
    enum: ['gameweek_plan', 'transfer', 'captain', 'chip', 'prediction'] 
  }).notNull(),
  inputsFingerprint: text('inputs_fingerprint').notNull(),
  modelVersion: text('model_version').notNull(),
  confidence: integer('confidence'),
  uncertaintyReasons: jsonb('uncertainty_reasons').$type<string[]>(),
  overrides: jsonb('overrides').$type<{ [key: string]: any }>(),
  decisionData: jsonb('decision_data').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('ai_decision_user_id_idx').on(table.userId),
  planIdIdx: index('ai_decision_plan_id_idx').on(table.planId),
  snapshotIdIdx: index('ai_decision_snapshot_id_idx').on(table.snapshotId),
  gameweekIdx: index('ai_decision_gameweek_idx').on(table.gameweek),
  decisionTypeIdx: index('ai_decision_type_idx').on(table.decisionType),
}));

export const insertAiDecisionLedgerSchema = createInsertSchema(aiDecisionLedger).omit({ id: true, createdAt: true });
export type InsertAiDecisionLedger = z.infer<typeof insertAiDecisionLedgerSchema>;
export type AiDecisionLedger = typeof aiDecisionLedger.$inferSelect;

// Relations
export const aiPrecomputationsRelations = relations(aiPrecomputations, ({ one }) => ({
  // No user relation as these are shared across all users for a given snapshot
}));

export const aiDecisionLedgerRelations = relations(aiDecisionLedger, ({ one }) => ({
  user: one(users, {
    fields: [aiDecisionLedger.userId],
    references: [users.id],
  }),
  plan: one(gameweekPlans, {
    fields: [aiDecisionLedger.planId],
    references: [gameweekPlans.id],
  }),
}));
