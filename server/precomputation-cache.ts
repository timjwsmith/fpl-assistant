import { storage } from "./storage";
import type { SnapshotContext } from "./snapshot-context";

class PrecomputationCache {
  private cacheHits = 0;
  private cacheMisses = 0;
  
  /**
   * Lookup precomputed result from cache
   * Returns cached result or null if not found
   */
  async lookup<T = any>(
    context: SnapshotContext,
    computationType: 'player_projections' | 'fixture_difficulty' | 'captain_shortlist' | 'chip_heuristics',
    playerId?: number
  ): Promise<T | null> {
    const result = await storage.getPrecomputation(
      context.snapshotId,
      computationType,
      playerId
    );
    
    if (result) {
      this.cacheHits++;
      return result.result as T;
    } else {
      this.cacheMisses++;
      return null;
    }
  }
  
  /**
   * Get cache hit rate percentage
   */
  getCacheHitRate(): number {
    const total = this.cacheHits + this.cacheMisses;
    return total > 0 ? (this.cacheHits / total) * 100 : 0;
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      hits: this.cacheHits,
      misses: this.cacheMisses,
      total: this.cacheHits + this.cacheMisses,
      hitRate: this.getCacheHitRate().toFixed(2) + '%'
    };
  }
  
  /**
   * Reset cache statistics
   */
  resetStats() {
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

export const precomputationCache = new PrecomputationCache();
