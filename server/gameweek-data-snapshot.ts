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
  };
}

class GameweekDataSnapshotService {
  private cache: Map<number, GameweekSnapshot> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes - matches FPL API cache

  /**
   * Get a complete snapshot of all data for a gameweek
   * Returns cached data if available and fresh, otherwise fetches new data
   */
  async getSnapshot(gameweek: number, enrichWithUnderstat: boolean = true): Promise<GameweekSnapshot> {
    const cached = this.cache.get(gameweek);
    const now = Date.now();

    // Return cached data if still fresh
    if (cached && now - cached.timestamp < this.CACHE_DURATION) {
      console.log(`[Snapshot] Using cached data for GW${gameweek} (age: ${Math.round((now - cached.timestamp) / 1000)}s)`);
      return cached;
    }

    console.log(`[Snapshot] Fetching fresh data for GW${gameweek}`);
    
    // Fetch all FPL data in parallel
    const [players, teams, fixtures, gameweeks] = await Promise.all([
      fplApi.getPlayers(),
      fplApi.getTeams(),
      fplApi.getFixtures(),
      fplApi.getGameweeks(),
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
   */
  async getPlanningSnapshot(enrichWithUnderstat: boolean = true): Promise<GameweekSnapshot> {
    const planningGameweek = await fplApi.getPlanningGameweek();
    if (!planningGameweek) {
      throw new Error('No planning gameweek available');
    }
    
    return this.getSnapshot(planningGameweek.id, enrichWithUnderstat);
  }

  /**
   * Clear cache for a specific gameweek (useful for testing or forcing refresh)
   */
  clearCache(gameweek?: number): void {
    if (gameweek) {
      this.cache.delete(gameweek);
      console.log(`[Snapshot] Cleared cache for GW${gameweek}`);
    } else {
      this.cache.clear();
      console.log(`[Snapshot] Cleared all snapshot cache`);
    }
  }

  /**
   * Get cache status for debugging
   */
  getCacheStatus(): Array<{ gameweek: number; age: number }> {
    const now = Date.now();
    return Array.from(this.cache.entries()).map(([gameweek, snapshot]) => ({
      gameweek,
      age: Math.round((now - snapshot.timestamp) / 1000), // age in seconds
    }));
  }
}

export const gameweekSnapshot = new GameweekDataSnapshotService();
