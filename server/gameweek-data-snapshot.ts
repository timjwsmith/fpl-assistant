/**
 * Unified Gameweek Data Snapshot Service
 * 
 * PURPOSE: Single source of truth for all gameweek data across the entire application.
 * Eliminates data inconsistencies by ensuring all features (predictions, transfers, 
 * captains, planner, analysis) operate on the exact same dataset.
 * 
 * ARCHITECTURE DECISION:
 * - All FPL + Understat data is fetched once and cached per gameweek
 * - Snapshot includes timestamp for debugging and consistency verification
 * - Provides typed access to prevent data access errors
 * - 5-minute cache aligns with FPL API updates
 * 
 * CACHE INVALIDATION STRATEGY:
 * 
 * When to Force Refresh (forceRefresh=true):
 * 1. Deadline Transitions - When a gameweek deadline passes and new data is available
 * 2. Injury News Updates - When critical team news changes player availability
 * 3. Manual User Refresh - When user explicitly requests fresh data (pull-to-refresh)
 * 4. Admin Operations - When testing or debugging data accuracy
 * 5. Data Correction - When FPL API makes retroactive score adjustments
 * 
 * Automatic Cache Expiry:
 * - Default TTL: 5 minutes (matches FPL API update frequency)
 * - Cache is automatically refreshed when expired
 * - Age is logged on every request for observability
 * 
 * Cache Inspection:
 * - Use getCacheAge(gameweek) to check individual entry age
 * - Use getCacheStatus() to see all cached gameweeks and their ages
 * - Use clearCache(gameweek?) to manually invalidate cache entries
 */

import type {
  FPLPlayer,
  FPLTeam,
  FPLFixture,
  FPLGameweek,
} from "@shared/schema";
import { fplApi } from "./fpl-api";
import { understatService } from "./understat-api";

export interface EnrichedPlayer extends FPLPlayer {
  understat?: {
    npxG: number;
    xGChain: number;
    xGBuildup: number;
  } | null;
}

export interface GameweekSnapshot {
  gameweek: number;
  timestamp: number;
  data: {
    players: EnrichedPlayer[];
    teams: FPLTeam[];
    fixtures: FPLFixture[];
    gameweeks: FPLGameweek[];
    currentGameweek: FPLGameweek | undefined;
    nextGameweek: FPLGameweek | undefined;
    element_types: Array<{
      id: number;
      plural_name: string;
      plural_name_short: string;
      singular_name: string;
      singular_name_short: string;
    }>;
  };
}

class GameweekDataSnapshotService {
  private cache: Map<number, GameweekSnapshot> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes - matches FPL API cache

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
  async getSnapshot(
    gameweek: number, 
    enrichWithUnderstat: boolean = true,
    forceRefresh: boolean = false
  ): Promise<GameweekSnapshot> {
    const cached = this.cache.get(gameweek);
    const now = Date.now();

    // Check if we should use cached data
    if (!forceRefresh && cached && now - cached.timestamp < this.CACHE_DURATION) {
      const cacheAge = Math.round((now - cached.timestamp) / 1000);
      console.log(`[Snapshot] 🎯 CACHE HIT for GW${gameweek} (age: ${cacheAge}s, TTL: ${this.CACHE_DURATION / 1000}s)`);
      return cached;
    }

    // Log the reason for fetching fresh data
    if (forceRefresh) {
      console.log(`[Snapshot] 🔄 FORCED REFRESH for GW${gameweek} (cache bypassed)`);
    } else if (cached) {
      const cacheAge = Math.round((now - cached.timestamp) / 1000);
      console.log(`[Snapshot] ⏰ CACHE EXPIRED for GW${gameweek} (age: ${cacheAge}s, TTL: ${this.CACHE_DURATION / 1000}s)`);
    } else {
      console.log(`[Snapshot] 🆕 CACHE MISS for GW${gameweek} (no cached data)`);
    }
    
    // Fetch all FPL data in parallel
    const [players, teams, fixtures, gameweeks, element_types] = await Promise.all([
      fplApi.getPlayers(),
      fplApi.getTeams(),
      fplApi.getFixtures(),
      fplApi.getGameweeks(),
      fplApi.getPositionTypes(),
    ]);

    const currentGameweek = gameweeks.find((gw) => gw.is_current);
    const nextGameweek = gameweeks.find((gw) => gw.is_next);

    // Enrich with Understat data if requested (background operation for premium players)
    let enrichedPlayers: EnrichedPlayer[] = players;
    if (enrichWithUnderstat) {
      enrichedPlayers = await this.enrichPlayersWithUnderstat(players);
    }

    const snapshot: GameweekSnapshot = {
      gameweek,
      timestamp: now,
      data: {
        players: enrichedPlayers,
        teams,
        fixtures,
        gameweeks,
        currentGameweek,
        nextGameweek,
        element_types,
      },
    };

    this.cache.set(gameweek, snapshot);
    console.log(`[Snapshot] Cached fresh data for GW${gameweek} with ${enrichedPlayers.length} players`);

    return snapshot;
  }

  /**
   * Enrich players with Understat data (only for premium players to reduce API calls)
   */
  private async enrichPlayersWithUnderstat(players: FPLPlayer[]): Promise<EnrichedPlayer[]> {
    // Only enrich premium players (price > £7.0m) to reduce Understat API calls
    const premiumPlayers = players.filter((p) => p.now_cost >= 70);
    
    console.log(`[Snapshot] Enriching ${premiumPlayers.length} premium players with Understat data`);

    const enrichedMap = new Map<number, EnrichedPlayer['understat']>();

    // Enrich in batches to avoid overwhelming Understat
    const batchSize = 10;
    for (let i = 0; i < premiumPlayers.length; i += batchSize) {
      const batch = premiumPlayers.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (player) => {
          try {
            const understatData = await understatService.enrichPlayerData(
              player.web_name,
              '2024'
            );
            enrichedMap.set(player.id, understatData);
          } catch (error) {
            console.warn(`[Snapshot] Failed to enrich ${player.web_name}:`, error instanceof Error ? error.message : 'Unknown error');
            enrichedMap.set(player.id, null);
          }
        })
      );

      // Small delay between batches
      if (i + batchSize < premiumPlayers.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Merge Understat data back into players
    return players.map((player) => ({
      ...player,
      understat: enrichedMap.get(player.id) || null,
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
  async getPlanningSnapshot(
    enrichWithUnderstat: boolean = true,
    forceRefresh: boolean = false
  ): Promise<GameweekSnapshot> {
    const planningGameweek = await fplApi.getPlanningGameweek();
    if (!planningGameweek) {
      throw new Error('No planning gameweek available');
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
  clearCache(gameweek?: number): void {
    if (gameweek) {
      this.cache.delete(gameweek);
      console.log(`[Snapshot] 🗑️  Cleared cache for GW${gameweek}`);
    } else {
      this.cache.clear();
      console.log(`[Snapshot] 🗑️  Cleared all snapshot cache`);
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
  getCacheAge(gameweek: number): number | null {
    const cached = this.cache.get(gameweek);
    if (!cached) {
      return null;
    }
    
    const now = Date.now();
    return Math.round((now - cached.timestamp) / 1000);
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
  getCacheStatus(): Array<{ gameweek: number; age: number; isStale: boolean }> {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([gameweek, snapshot]) => {
      const age = Math.round((now - snapshot.timestamp) / 1000);
      return {
        gameweek,
        age,
        isStale: now - snapshot.timestamp >= this.CACHE_DURATION,
      };
    });
  }
}

export const gameweekSnapshot = new GameweekDataSnapshotService();
