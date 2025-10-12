import { z } from "zod";

// FPL Player Data (from bootstrap-static API)
export const fplPlayerSchema = z.object({
  id: z.number(),
  web_name: z.string(),
  first_name: z.string(),
  second_name: z.string(),
  team: z.number(),
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
});

export type FPLPlayer = z.infer<typeof fplPlayerSchema>;

// FPL Team Data
export const fplTeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  short_name: z.string(),
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
  chip_name: z.enum(['wildcard', 'freehit', 'banchboost', 'triplecaptain']),
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
  preferred_formation: z.string().optional(),
  risk_tolerance: z.enum(['conservative', 'balanced', 'aggressive']).default('balanced'),
  auto_captain: z.boolean().default(false),
});

export type UserSettings = z.infer<typeof userSettingsSchema>;
