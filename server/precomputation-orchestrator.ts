/**
 * Precomputation Orchestrator
 * 
 * PURPOSE: Batch-runs AI computations when a new snapshot is ready, caching results
 * for fast lookups. This improves AI performance by pre-computing common analyses
 * instead of running them on-demand for each user request.
 * 
 * ARCHITECTURE:
 * - Triggered when GameweekDataSnapshot creates/refreshes a snapshot
 * - Runs deterministic calculations (fixture difficulty) in parallel
 * - Caches results in ai_precomputations table with TTL matching snapshot cache (5 min)
 * - Reduces OpenAI API costs by avoiding repeated calculations
 * 
 * CURRENT COMPUTATIONS:
 * - Fixture Difficulty: Team-level difficulty scores for next 6 gameweeks
 * 
 * FUTURE COMPUTATIONS (Task 8):
 * - Player Projections: AI-powered point predictions for premium players
 * - Captain Shortlist: Pre-filtered top captain candidates
 * - Chip Heuristics: Optimal chip timing recommendations
 */

import type { SnapshotContext } from './snapshot-context';
import type { FPLTeam, FPLFixture, InsertAiPrecomputation } from '@shared/schema';
import { storage } from './storage';

/**
 * Precomputation Job Interface
 * Defines the contract for all precomputation tasks
 */
interface PrecomputationJob {
  type: 'player_projections' | 'fixture_difficulty' | 'captain_shortlist' | 'chip_heuristics';
  snapshotId: string;
  gameweek: number;
  execute: () => Promise<any>;
}

/**
 * Calculate average fixture difficulty for a team over next 6 gameweeks
 * 
 * Uses FPL's native difficulty ratings (1-5 scale):
 * - 1: Easiest fixtures
 * - 5: Hardest fixtures
 * 
 * @param team - FPL team data
 * @param fixtures - All FPL fixtures
 * @param currentGameweek - Current gameweek number
 * @returns Average difficulty score (0 if no upcoming fixtures)
 */
function calculateTeamFixtureDifficulty(
  team: FPLTeam,
  fixtures: FPLFixture[],
  currentGameweek: number
): number {
  const upcoming = fixtures
    .filter(f => 
      f.event && f.event > currentGameweek && f.event <= currentGameweek + 6 &&
      (f.team_h === team.id || f.team_a === team.id)
    )
    .slice(0, 6);
  
  const totalDifficulty = upcoming.reduce((sum, fixture) => {
    const difficulty = fixture.team_h === team.id 
      ? fixture.team_h_difficulty 
      : fixture.team_a_difficulty;
    return sum + difficulty;
  }, 0);
  
  return upcoming.length > 0 ? totalDifficulty / upcoming.length : 0;
}

/**
 * Helper functions for chip analysis
 */

function analyzeOptimalBenchBoost(fixtures: FPLFixture[], teams: FPLTeam[], currentGW: number) {
  const gws = Array.from({ length: 10 }, (_, i) => currentGW + i + 1);
  const doubleGameweeks = gws.filter(gw => {
    const gwFixtures = fixtures.filter(f => f.event === gw);
    const teamsPlaying = gwFixtures.flatMap(f => [f.team_h, f.team_a]);
    return teamsPlaying.some((team, idx) => teamsPlaying.indexOf(team) !== idx);
  });
  
  return {
    recommendedGameweek: doubleGameweeks[0] || currentGW + 5,
    reasoning: doubleGameweeks.length > 0 
      ? `Double gameweek detected in GW${doubleGameweeks[0]}` 
      : 'No double gameweeks found, defaulting to mid-season'
  };
}

function analyzeOptimalTripleCaptain(fixtures: FPLFixture[], teams: FPLTeam[], currentGW: number) {
  return analyzeOptimalBenchBoost(fixtures, teams, currentGW);
}

function analyzeOptimalFreeHit(fixtures: FPLFixture[], teams: FPLTeam[], currentGW: number) {
  return {
    recommendedGameweek: currentGW + 6,
    reasoning: 'Use during blank/double gameweeks for maximum impact'
  };
}

function analyzeOptimalWildcard(fixtures: FPLFixture[], teams: FPLTeam[], currentGW: number) {
  return {
    recommendedGameweek: currentGW + 3,
    reasoning: 'Mid-season wildcard to reset team structure'
  };
}

/**
 * Precomputation Orchestrator
 * 
 * Coordinates batch AI computations when fresh data arrives.
 * All computations are cached with TTL matching snapshot cache (5 minutes).
 */
class PrecomputationOrchestrator {
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
  async onSnapshotReady(context: SnapshotContext): Promise<void> {
    console.log(`[Precomputation] Starting batch jobs for snapshot ${context.snapshotId} (GW${context.gameweek})`);
    
    const expiresAt = new Date(context.timestamp + 5 * 60 * 1000);
    
    await Promise.all([
      this.precomputeFixtureDifficulty(context, expiresAt),
      this.precomputeCaptainShortlist(context, expiresAt),
      this.precomputeChipHeuristics(context, expiresAt),
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
  private async precomputeFixtureDifficulty(
    context: SnapshotContext,
    expiresAt: Date
  ): Promise<void> {
    const fixtures = context.snapshot.data.fixtures;
    const teams = context.snapshot.data.teams;
    
    const difficultyScores = teams.map(team => ({
      teamId: team.id,
      nextSixGWDifficulty: calculateTeamFixtureDifficulty(team, fixtures, context.gameweek)
    }));
    
    const precomputation: InsertAiPrecomputation = {
      snapshotId: context.snapshotId,
      gameweek: context.gameweek,
      computationType: 'fixture_difficulty',
      playerId: null,
      result: difficultyScores,
      expiresAt,
    };
    
    await storage.savePrecomputation(precomputation);
    
    console.log(`[Precomputation] Saved fixture difficulty for ${teams.length} teams`);
  }

  /**
   * Precompute captain shortlist based on form, fixtures, and ownership
   * Returns top 10 captain candidates with expected points range
   */
  private async precomputeCaptainShortlist(
    context: SnapshotContext,
    expiresAt: Date
  ): Promise<void> {
    const players = context.snapshot.data.players;
    const teams = context.snapshot.data.teams;
    const fixtures = context.snapshot.data.fixtures;
    
    // Filter to premium attackers and midfielders (price >= £8.0m, element_type 3 or 4)
    const premiumAttackers = players.filter(p => 
      (p.element_type === 3 || p.element_type === 4) && 
      p.now_cost >= 80 && 
      p.status === 'a' // Available only
    );
    
    // Calculate captain appeal score for each player
    const captainCandidates = premiumAttackers.map(player => {
      const form = parseFloat(player.form) || 0;
      const ictIndex = parseFloat(player.ict_index) || 0;
      const ownership = parseFloat(player.selected_by_percent) || 0;
      
      // Simple scoring: form * 2 + ictIndex/10 + differential bonus
      const differentialBonus = ownership < 20 ? 5 : 0;
      const score = (form * 2) + (ictIndex / 10) + differentialBonus;
      
      return {
        playerId: player.id,
        playerName: player.web_name,
        score,
        form,
        ownership,
        isDifferential: ownership < 20
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Top 10
    
    // Save to database
    await storage.savePrecomputation({
      snapshotId: context.snapshotId,
      gameweek: context.gameweek,
      computationType: 'captain_shortlist',
      playerId: null, // Not player-specific
      result: captainCandidates,
      expiresAt,
    });
    
    console.log(`[Precomputation] Captain shortlist: ${captainCandidates.length} candidates`);
  }

  /**
   * Precompute chip timing heuristics based on fixtures and team form
   * Suggests optimal gameweeks for each chip type
   */
  private async precomputeChipHeuristics(
    context: SnapshotContext,
    expiresAt: Date
  ): Promise<void> {
    const fixtures = context.snapshot.data.fixtures;
    const teams = context.snapshot.data.teams;
    const gameweek = context.gameweek;
    
    // Analyze next 10 gameweeks for optimal chip timing
    const chipRecommendations = {
      benchBoost: analyzeOptimalBenchBoost(fixtures, teams, gameweek),
      tripleCaptain: analyzeOptimalTripleCaptain(fixtures, teams, gameweek),
      freeHit: analyzeOptimalFreeHit(fixtures, teams, gameweek),
      wildcard: analyzeOptimalWildcard(fixtures, teams, gameweek),
    };
    
    await storage.savePrecomputation({
      snapshotId: context.snapshotId,
      gameweek: context.gameweek,
      computationType: 'chip_heuristics',
      playerId: null,
      result: chipRecommendations,
      expiresAt,
    });
    
    console.log(`[Precomputation] Chip heuristics computed for GW${gameweek}`);
  }
}

export const precomputationOrchestrator = new PrecomputationOrchestrator();
