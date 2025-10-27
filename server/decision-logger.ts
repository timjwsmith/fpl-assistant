/**
 * Decision Logger
 * 
 * PURPOSE: Records every AI decision (gameweek plans, predictions, transfers, 
 * captain choices, chip strategies) to an audit trail table. This enables 
 * replay, debugging, and AI confidence tracking over time.
 * 
 * ARCHITECTURE:
 * - Provides a clean interface for logging all AI decisions
 * - Generates input fingerprints for replay capability
 * - Tracks confidence scores and uncertainty reasons
 * - Integrates with storage layer for persistence
 * 
 * USAGE:
 * ```typescript
 * // Log a gameweek plan decision
 * await decisionLogger.logGameweekPlan(
 *   userId, 
 *   planId, 
 *   context, 
 *   inputs, 
 *   plan, 
 *   85, 
 *   ['Weather uncertainty for weekend fixtures']
 * );
 * 
 * // Log a captain decision
 * await decisionLogger.logCaptainDecision(
 *   userId,
 *   planId,
 *   context,
 *   inputs,
 *   captainRecommendation,
 *   92
 * );
 * ```
 */

import { createHash } from 'crypto';
import { storage } from './storage';
import type { SnapshotContext } from './snapshot-context';

/**
 * Decision log entry interface
 * 
 * Represents a single AI decision that can be audited and replayed.
 */
export interface DecisionLogEntry {
  userId: number;
  planId?: number;
  snapshotId: string;
  gameweek: number;
  decisionType: 'gameweek_plan' | 'transfer' | 'captain' | 'chip' | 'prediction';
  inputsFingerprint: string;
  modelVersion: string;
  confidence?: number;
  uncertaintyReasons?: string[];
  overrides?: Record<string, any>;
  decisionData: any;
}

/**
 * Decision Logger Class
 * 
 * Provides methods to log all types of AI decisions with metadata,
 * confidence scores, and input fingerprints for replay capability.
 */
class DecisionLogger {
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
  async logGameweekPlan(
    userId: number,
    planId: number,
    context: SnapshotContext,
    inputs: any,
    plan: any,
    confidence?: number,
    uncertaintyReasons?: string[]
  ): Promise<void> {
    const entry: DecisionLogEntry = {
      userId,
      planId,
      snapshotId: context.snapshotId,
      gameweek: context.gameweek,
      decisionType: 'gameweek_plan',
      inputsFingerprint: this.hashInputs(inputs),
      modelVersion: 'gpt-4o',
      confidence,
      uncertaintyReasons,
      decisionData: plan,
    };
    
    await this.log(entry);
    console.log(`[DecisionLogger] Logged gameweek plan for user ${userId}, GW${context.gameweek}, confidence: ${confidence || 'N/A'}`);
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
  async logCaptainDecision(
    userId: number,
    planId: number | undefined,
    context: SnapshotContext,
    inputs: any,
    captain: any,
    confidence?: number
  ): Promise<void> {
    const entry: DecisionLogEntry = {
      userId,
      planId,
      snapshotId: context.snapshotId,
      gameweek: context.gameweek,
      decisionType: 'captain',
      inputsFingerprint: this.hashInputs(inputs),
      modelVersion: 'gpt-4o',
      confidence,
      decisionData: captain,
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
  async logTransferDecision(
    userId: number,
    context: SnapshotContext,
    inputs: any,
    transfers: any[],
    confidence?: number
  ): Promise<void> {
    const entry: DecisionLogEntry = {
      userId,
      snapshotId: context.snapshotId,
      gameweek: context.gameweek,
      decisionType: 'transfer',
      inputsFingerprint: this.hashInputs(inputs),
      modelVersion: 'gpt-4o',
      confidence,
      decisionData: transfers,
    };
    
    await this.log(entry);
    console.log(`[DecisionLogger] Logged ${transfers.length} transfer(s) for user ${userId}, GW${context.gameweek}`);
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
  async logChipDecision(
    userId: number,
    planId: number | undefined,
    context: SnapshotContext,
    inputs: any,
    chipStrategy: any,
    confidence?: number
  ): Promise<void> {
    const entry: DecisionLogEntry = {
      userId,
      planId,
      snapshotId: context.snapshotId,
      gameweek: context.gameweek,
      decisionType: 'chip',
      inputsFingerprint: this.hashInputs(inputs),
      modelVersion: 'gpt-4o',
      confidence,
      decisionData: chipStrategy,
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
  private hashInputs(inputs: any): string {
    const inputStr = JSON.stringify(inputs);
    return createHash('sha256').update(inputStr).digest('hex').substring(0, 16);
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
  private async log(entry: DecisionLogEntry): Promise<void> {
    await storage.saveDecisionLog(entry);
  }
}

/**
 * Singleton instance of DecisionLogger
 * 
 * Use this to log AI decisions throughout the application.
 */
export const decisionLogger = new DecisionLogger();
