import { storage } from './storage';
import { fplApi } from './fpl-api';
import { fplAuth } from './fpl-auth';
import { gameweekAnalyzer } from './gameweek-analyzer';
import { transferApplication } from './transfer-application';
import { seedPendingPredictions, updateTrackingPredictions, voidInvalidPredictions } from './multi-week-tracker';
import type { AutomationSettings, GameweekPlan } from '@shared/schema';

const CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes in milliseconds
const AUTO_APPLY_WINDOW_HOURS = 2; // Apply plans 2 hours before deadline

class AutomationScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  start(): void {
    if (this.isRunning) {
      console.log('[AutoScheduler] Scheduler is already running');
      return;
    }

    console.log('[AutoScheduler] Starting automation scheduler...');
    console.log(`[AutoScheduler] Check interval: ${CHECK_INTERVAL / 1000 / 60} minutes`);
    console.log(`[AutoScheduler] Auto-apply window: ${AUTO_APPLY_WINDOW_HOURS} hours before deadline`);

    this.isRunning = true;

    // Run initial check
    this.checkAndApplyPlans().catch(error => {
      console.error('[AutoScheduler] Error in initial check:', error);
    });

    // Schedule recurring checks
    this.intervalId = setInterval(() => {
      this.checkAndApplyPlans().catch(error => {
        console.error('[AutoScheduler] Error in scheduled check:', error);
      });
      this.checkScheduledJobs().catch(error => {
        console.error('[AutoScheduler] Error in scheduled jobs check:', error);
      });
    }, CHECK_INTERVAL);

    console.log('[AutoScheduler] ✓ Scheduler started successfully');
  }

  stop(): void {
    if (!this.isRunning) {
      console.log('[AutoScheduler] Scheduler is not running');
      return;
    }

    console.log('[AutoScheduler] Stopping automation scheduler...');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('[AutoScheduler] ✓ Scheduler stopped');
  }

  async checkAndApplyPlans(): Promise<void> {
    const now = new Date();
    console.log(`[AutoScheduler] Running scheduled check at ${now.toISOString()}`);

    try {
      // Get all users with auto-sync enabled
      const automationSettingsList = await storage.getUsersWithAutoSyncEnabled();
      
      if (automationSettingsList.length === 0) {
        console.log('[AutoScheduler] No users with auto-sync enabled');
        return;
      }

      console.log(`[AutoScheduler] Found ${automationSettingsList.length} user(s) with auto-sync enabled`);

      // Get current/next gameweek info
      const currentGameweek = await fplApi.getCurrentGameweek();
      const nextGameweek = await fplApi.getNextGameweek();
      
      // Use next gameweek if current is finished, otherwise use current
      const targetGameweek = currentGameweek && !currentGameweek.finished 
        ? currentGameweek 
        : nextGameweek;

      if (!targetGameweek) {
        console.log('[AutoScheduler] No active gameweek found');
        return;
      }

      console.log(`[AutoScheduler] Target gameweek: ${targetGameweek.name} (ID: ${targetGameweek.id})`);
      console.log(`[AutoScheduler] Deadline: ${targetGameweek.deadline_time}`);

      // Calculate hours until deadline
      const deadlineDate = new Date(targetGameweek.deadline_time);
      const hoursUntilDeadline = (deadlineDate.getTime() - now.getTime()) / 1000 / 60 / 60;

      console.log(`[AutoScheduler] Hours until deadline: ${hoursUntilDeadline.toFixed(2)}`);

      // Check if we're in the auto-apply window
      if (hoursUntilDeadline > AUTO_APPLY_WINDOW_HOURS) {
        console.log(`[AutoScheduler] Not yet in auto-apply window (>${AUTO_APPLY_WINDOW_HOURS} hours until deadline)`);
        return;
      }

      if (hoursUntilDeadline <= 0) {
        console.log('[AutoScheduler] Deadline has passed');
        return;
      }

      console.log('[AutoScheduler] ✓ In auto-apply window, processing users...');

      // Process each user
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

      console.log(`[AutoScheduler] ✓ Check complete - Processed: ${processedCount}, Applied: ${appliedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);

    } catch (error) {
      console.error('[AutoScheduler] Error in checkAndApplyPlans:', error);
    }
  }

  async checkScheduledJobs(): Promise<void> {
    const now = new Date();
    const HOUR_24 = 24 * 60 * 60 * 1000; // 24 hours in ms
    const DAY_7 = 7 * HOUR_24; // 7 days in ms

    try {
      // Seed predictions (run once per day)
      const lastSeedRun = await storage.getSchedulerLastRun('seed_predictions');
      if (!lastSeedRun || (now.getTime() - lastSeedRun.getTime()) > HOUR_24) {
        console.log('[AutoScheduler] Running daily seedPendingPredictions job...');
        await seedPendingPredictions(storage, fplApi);
        await storage.setSchedulerLastRun('seed_predictions', now);
      }

      // Update predictions (run once per week)
      const lastUpdateRun = await storage.getSchedulerLastRun('update_predictions');
      if (!lastUpdateRun || (now.getTime() - lastUpdateRun.getTime()) > DAY_7) {
        console.log('[AutoScheduler] Running weekly updateTrackingPredictions job...');
        await updateTrackingPredictions(storage, fplApi);
        await storage.setSchedulerLastRun('update_predictions', now);
      }

      // Void predictions (run once per week)
      const lastVoidRun = await storage.getSchedulerLastRun('void_predictions');
      if (!lastVoidRun || (now.getTime() - lastVoidRun.getTime()) > DAY_7) {
        console.log('[AutoScheduler] Running weekly voidInvalidPredictions job...');
        await voidInvalidPredictions(storage, fplApi);
        await storage.setSchedulerLastRun('void_predictions', now);
      }
    } catch (error) {
      console.error('[AutoScheduler] Error in checkScheduledJobs:', error);
    }
  }

  private async processUser(
    settings: AutomationSettings,
    gameweek: number
  ): Promise<{ processed: boolean; applied: boolean }> {
    const userId = settings.userId;

    try {
      // Safety check: Verify user is authenticated
      const isAuthenticated = await fplAuth.isAuthenticated(userId);
      if (!isAuthenticated) {
        console.log(`[AutoScheduler] Skipping user ${userId}: Not FPL authenticated`);
        return { processed: false, applied: false };
      }

      // Safety check: Verify user has manager ID
      const userSettings = await storage.getUserSettings(userId);
      if (!userSettings || !userSettings.manager_id) {
        console.log(`[AutoScheduler] Skipping user ${userId}: No manager_id configured`);
        return { processed: false, applied: false };
      }

      // Check if plan already exists for this gameweek
      let plan = await storage.getGameweekPlan(userId, gameweek);

      // Safety check: Don't apply if plan already applied
      if (plan && plan.status === 'applied') {
        console.log(`[AutoScheduler] Skipping user ${userId}: Plan already applied for GW${gameweek}`);
        return { processed: false, applied: false };
      }

      // If no plan exists, generate one
      if (!plan) {
        console.log(`[AutoScheduler] Generating plan for user ${userId}, GW${gameweek}...`);
        
        try {
          plan = await gameweekAnalyzer.analyzeGameweek(userId, gameweek);
          console.log(`[AutoScheduler] ✓ Plan generated for user ${userId}, plan ID: ${plan.id}`);
        } catch (error) {
          console.error(`[AutoScheduler] Failed to generate plan for user ${userId}:`, error);
          return { processed: true, applied: false };
        }
      }

      // Apply the plan based on automation settings
      console.log(`[AutoScheduler] Applying plan ${plan.id} for user ${userId}, GW${gameweek}...`);
      
      // Check individual automation settings to determine what to apply
      const shouldApplyTransfers = settings.autoApplyTransfers && plan.transfers && plan.transfers.length > 0;
      const shouldApplyCaptain = settings.autoApplyCaptain && plan.captainId && plan.viceCaptainId;
      const shouldApplyChip = settings.autoApplyChips && plan.chipToPlay;

      if (!shouldApplyTransfers && !shouldApplyCaptain && !shouldApplyChip) {
        console.log(`[AutoScheduler] Skipping user ${userId}: No auto-apply settings enabled`);
        return { processed: false, applied: false };
      }

      // Apply the plan
      const result = await transferApplication.applyGameweekPlan(userId, plan.id);

      if (result.success) {
        console.log(`[AutoScheduler] ✓ Successfully applied plan ${plan.id} for user ${userId}`);
        console.log(`[AutoScheduler]   - Transfers: ${result.transfersApplied ? '✓' : '✗'} (${result.details.transfersCount || 0})`);
        console.log(`[AutoScheduler]   - Captain: ${result.captainSet ? '✓' : '✗'} (ID: ${result.details.captainId || 'N/A'})`);
        console.log(`[AutoScheduler]   - Chip: ${result.chipPlayed ? '✓' : '✗'} (Type: ${result.details.chipType || 'N/A'})`);
        return { processed: true, applied: true };
      } else {
        console.error(`[AutoScheduler] ✗ Failed to apply plan ${plan.id} for user ${userId}:`, result.errors);
        return { processed: true, applied: false };
      }

    } catch (error) {
      console.error(`[AutoScheduler] Error processing user ${userId}:`, error);
      return { processed: true, applied: false };
    }
  }
}

export const automationScheduler = new AutomationScheduler();
export default automationScheduler;
