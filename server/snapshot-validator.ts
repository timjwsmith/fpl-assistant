/**
 * SnapshotValidator - Ensures data consistency across AI-generated outputs
 * 
 * This utility validates that all AI outputs (predictions, transfers, captain recommendations,
 * chip strategies) reference the same snapshot_id before they are persisted to the database.
 * 
 * **Purpose:**
 * Prevents inconsistent data states where different parts of an AI decision are based on
 * different data snapshots. For example, if transfers are calculated using snapshot A but
 * predictions are based on snapshot B, the resulting gameweek plan would be inconsistent.
 * 
 * **When to Use:**
 * - Before persisting any AI-generated gameweek plan to the database
 * - Before applying transfers or captain recommendations
 * - When validating AI service outputs before storage
 * 
 * **What Happens on Validation Failure:**
 * - The validation returns a ValidationResult with valid: false
 * - Detailed error messages indicate which components have mismatched snapshot IDs
 * - The caller should reject the entire operation and log the error
 * - Consider re-running the AI pipeline with a fresh snapshot
 * 
 * @example
 * ```typescript
 * // Validating a complete gameweek plan
 * const result = snapshotValidator.validateGameweekPlan(
 *   'snapshot_gw10_20241027',
 *   {
 *     transfers: [
 *       { playerId: 123, snapshotId: 'snapshot_gw10_20241027' },
 *       { playerId: 456, snapshotId: 'snapshot_gw10_20241027' }
 *     ],
 *     predictions: [
 *       { playerId: 789, snapshotId: 'snapshot_gw10_20241027' }
 *     ],
 *     captainRecommendation: {
 *       playerId: 789,
 *       snapshotId: 'snapshot_gw10_20241027'
 *     }
 *   }
 * );
 * 
 * if (!result.valid) {
 *   console.error('Snapshot validation failed:', result.errors);
 *   throw new Error('Cannot persist gameweek plan: snapshot mismatch');
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // Validating a single component
 * const result = snapshotValidator.validateComponent(
 *   'snapshot_gw10_20241027',
 *   chipStrategy.snapshotId
 * );
 * 
 * if (!result.valid) {
 *   console.error('Chip strategy snapshot mismatch:', result.errors);
 *   return;
 * }
 * ```
 */

/**
 * Result of a snapshot validation operation
 */
export interface ValidationResult {
  /** Whether all snapshot IDs match the expected value */
  valid: boolean;
  /** Array of error messages describing any mismatches found */
  errors: string[];
  /** The expected snapshot ID that was validated against */
  snapshotId?: string;
}

/**
 * Validator class for ensuring snapshot consistency across AI outputs
 */
class SnapshotValidator {
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
  validateGameweekPlan(
    snapshotId: string,
    components: {
      transfers?: Array<{ snapshotId?: string }>;
      predictions?: Array<{ snapshotId?: string }>;
      captainRecommendation?: { snapshotId?: string };
      chipStrategy?: { snapshotId?: string };
    }
  ): ValidationResult {
    const errors: string[] = [];
    
    // Check transfers
    if (components.transfers) {
      for (const transfer of components.transfers) {
        if (transfer.snapshotId && transfer.snapshotId !== snapshotId) {
          errors.push(`Transfer snapshot mismatch: expected ${snapshotId}, got ${transfer.snapshotId}`);
        }
      }
    }
    
    // Check predictions
    if (components.predictions) {
      for (const prediction of components.predictions) {
        if (prediction.snapshotId && prediction.snapshotId !== snapshotId) {
          errors.push(`Prediction snapshot mismatch: expected ${snapshotId}, got ${prediction.snapshotId}`);
        }
      }
    }
    
    // Check captain recommendation
    if (components.captainRecommendation?.snapshotId && 
        components.captainRecommendation.snapshotId !== snapshotId) {
      errors.push(`Captain recommendation snapshot mismatch: expected ${snapshotId}, got ${components.captainRecommendation.snapshotId}`);
    }
    
    // Check chip strategy
    if (components.chipStrategy?.snapshotId && 
        components.chipStrategy.snapshotId !== snapshotId) {
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
  validateComponent(expectedSnapshotId: string, actualSnapshotId: string | undefined | null): ValidationResult {
    if (!actualSnapshotId) {
      return {
        valid: false,
        errors: ['Missing snapshot ID'],
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
}

/**
 * Singleton instance of SnapshotValidator for application-wide use
 * 
 * @example
 * ```typescript
 * import { snapshotValidator } from './snapshot-validator';
 * 
 * // Use in AI service
 * const validation = snapshotValidator.validateGameweekPlan(snapshotId, components);
 * ```
 */
export const snapshotValidator = new SnapshotValidator();
