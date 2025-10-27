/**
 * Snapshot Context Manager
 * 
 * PURPOSE: Provides a clean, strongly-typed interface for AI operations to access
 * gameweek snapshots with full metadata. This service ensures all AI operations
 * (predictions, transfers, captains, analysis) operate on the same snapshot.
 * 
 * ARCHITECTURE:
 * - Wraps GameweekDataSnapshot service
 * - Provides SnapshotContext with metadata for AI operations
 * - Enables snapshot validation across multiple AI outputs
 * - Ensures consistency in distributed AI operations
 * 
 * USAGE:
 * ```typescript
 * // Get a snapshot context for AI operations
 * const context = await snapshotContext.getContext(10, true);
 * 
 * // Use the context in AI operations
 * const predictions = await aiService.predict(context);
 * const transfers = await transferService.recommend(context);
 * 
 * // Validate all outputs reference the same snapshot
 * const isValid = snapshotContext.validateSnapshotMatch(
 *   predictions.snapshotId,
 *   transfers.snapshotId
 * );
 * ```
 */

import { gameweekSnapshot, GameweekSnapshot } from './gameweek-data-snapshot';

/**
 * Snapshot context with metadata for AI operations
 * 
 * This provides a complete context that AI services can use to ensure
 * they're all operating on the same snapshot with consistent metadata.
 */
export interface SnapshotContext {
  /** Unique identifier for this snapshot (for validation) */
  snapshotId: string;
  
  /** Gameweek number this snapshot represents */
  gameweek: number;
  
  /** Unix timestamp when this snapshot was created */
  timestamp: number;
  
  /** Whether this snapshot includes Understat enrichment */
  enriched: boolean;
  
  /** The complete gameweek snapshot data */
  snapshot: GameweekSnapshot;
}

/**
 * Snapshot Context Manager
 * 
 * Provides a clean interface for AI operations to access gameweek snapshots
 * with full metadata. This is the foundation for snapshot coordination across
 * all AI operations.
 */
class SnapshotContextManager {
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
  async getContext(
    gameweek: number,
    enrichWithUnderstat: boolean = true,
    forceRefresh: boolean = false
  ): Promise<SnapshotContext> {
    // Get snapshot from underlying service
    const snapshot = await gameweekSnapshot.getSnapshot(
      gameweek,
      enrichWithUnderstat,
      forceRefresh
    );

    // Build and return context with metadata
    return {
      snapshotId: snapshot.snapshotId,
      gameweek: snapshot.gameweek,
      timestamp: snapshot.timestamp,
      enriched: enrichWithUnderstat,
      snapshot,
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
  validateSnapshotMatch(snapshotId1: string, snapshotId2: string): boolean {
    return snapshotId1 === snapshotId2;
  }
}

/**
 * Singleton instance of SnapshotContextManager
 * 
 * Use this to access snapshot contexts for AI operations throughout the app.
 */
export const snapshotContext = new SnapshotContextManager();
