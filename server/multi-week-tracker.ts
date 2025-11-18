import type { IStorage } from './storage';

interface FplApiClient {
  getCurrentGameweek(): Promise<any>;
  getPlayerDetails(playerId: number): Promise<any>;
  getManagerPicks(managerId: number, gameweek: number): Promise<any>;
  getPlayers(): Promise<any>;
}

export async function seedPendingPredictions(
  storage: IStorage,
  fplApi: FplApiClient
): Promise<void> {
  try {
    console.log('[Multi-Week Tracker] Starting seedPendingPredictions...');
    
    const currentGameweek = await fplApi.getCurrentGameweek();
    if (!currentGameweek) {
      console.log('[Multi-Week Tracker] No current gameweek found, skipping seed');
      return;
    }

    const currentGW = currentGameweek.id;
    console.log(`[Multi-Week Tracker] Current gameweek: ${currentGW}`);

    const pendingPredictions = await storage.getPredictionsByStatus('pending');
    console.log(`[Multi-Week Tracker] Found ${pendingPredictions.length} pending predictions`);

    let seededCount = 0;
    for (const prediction of pendingPredictions) {
      if (currentGW >= prediction.startGameweek) {
        await storage.updatePredictionTracking(prediction.id, {
          status: 'tracking'
        });
        seededCount++;
      }
    }

    console.log(`[Multi-Week Tracker] ✓ Seeded ${seededCount} predictions for tracking`);
  } catch (error) {
    console.error('[Multi-Week Tracker] Error in seedPendingPredictions:', error);
  }
}

export async function updateTrackingPredictions(
  storage: IStorage,
  fplApi: FplApiClient
): Promise<void> {
  try {
    console.log('[Multi-Week Tracker] Starting updateTrackingPredictions...');
    
    const currentGameweek = await fplApi.getCurrentGameweek();
    if (!currentGameweek) {
      console.log('[Multi-Week Tracker] No current gameweek found, skipping update');
      return;
    }

    const currentGW = currentGameweek.id;
    console.log(`[Multi-Week Tracker] Current gameweek: ${currentGW}`);

    const trackingPredictions = await storage.getPredictionsByStatus('tracking');
    console.log(`[Multi-Week Tracker] Found ${trackingPredictions.length} tracking predictions`);

    let updatedCount = 0;
    let completedCount = 0;

    for (const prediction of trackingPredictions) {
      try {
        // Calculate weeks elapsed (clamped to timeframe)
        const weeksElapsed = Math.min(
          currentGW - prediction.startGameweek,
          prediction.timeframeWeeks
        );
        
        let playerInPoints = 0;
        let playerOutPoints = 0;

        try {
          const playerInDetails = await fplApi.getPlayerDetails(prediction.playerInId);
          const playerOutDetails = await fplApi.getPlayerDetails(prediction.playerOutId);

          if (playerInDetails?.history) {
            playerInPoints = playerInDetails.history
              .filter((h: any) => h.round >= prediction.startGameweek && h.round <= currentGW)
              .reduce((sum: number, h: any) => sum + h.total_points, 0);
          }

          if (playerOutDetails?.history) {
            playerOutPoints = playerOutDetails.history
              .filter((h: any) => h.round >= prediction.startGameweek && h.round <= currentGW)
              .reduce((sum: number, h: any) => sum + h.total_points, 0);
          }
        } catch (apiError) {
          console.error(`[Multi-Week Tracker] Error fetching player details for prediction ${prediction.id}:`, apiError);
          continue;
        }

        const actualGain = playerInPoints - playerOutPoints;

        // Only mark complete if we've hit the full timeframe
        if (weeksElapsed >= prediction.timeframeWeeks) {
          // Calculate accuracy using absolute error metric
          // accuracyPercent represents prediction quality:
          // - 100% = perfect prediction (actual matches predicted)
          // - >100% = overperformance (actual exceeds predicted)
          // - <100% = underperformance (actual below predicted)
          
          let accuracyPercent: number | null = null;
          
          if (prediction.predictedGain === 0) {
            // If predicted 0, use simple binary: 100% if actual is 0, else 0%
            accuracyPercent = actualGain === 0 ? 100 : 0;
          } else if (prediction.predictedGain > 0) {
            // Positive prediction: use ratio-based accuracy
            accuracyPercent = (actualGain / prediction.predictedGain) * 100;
          } else {
            // Negative prediction (transfer hit): use absolute error
            // e.g., predicted=-4, actual=-2 → error=2, accuracy=50%
            const absoluteError = Math.abs(actualGain - prediction.predictedGain);
            accuracyPercent = 100 - (absoluteError / Math.abs(prediction.predictedGain) * 100);
          }

          await storage.updatePredictionTracking(prediction.id, {
            status: 'completed',
            weeksElapsed,
            pointsActualToDate: actualGain,
            actualGainFinal: actualGain,
            accuracyPercent,
            closedAt: new Date()
          });
          completedCount++;
        } else {
          await storage.updatePredictionTracking(prediction.id, {
            weeksElapsed,
            pointsActualToDate: actualGain
          });
          updatedCount++;
        }
      } catch (error) {
        console.error(`[Multi-Week Tracker] Error updating prediction ${prediction.id}:`, error);
      }
    }

    console.log(`[Multi-Week Tracker] ✓ Updated ${updatedCount} predictions, Completed ${completedCount} predictions`);
  } catch (error) {
    console.error('[Multi-Week Tracker] Error in updateTrackingPredictions:', error);
  }
}

export async function voidInvalidPredictions(
  storage: IStorage,
  fplApi: FplApiClient
): Promise<void> {
  try {
    console.log('[Multi-Week Tracker] Starting voidInvalidPredictions...');
    
    const currentGameweek = await fplApi.getCurrentGameweek();
    if (!currentGameweek) {
      console.log('[Multi-Week Tracker] No current gameweek found, skipping void check');
      return;
    }

    const currentGW = currentGameweek.id;
    const trackingPredictions = await storage.getPredictionsByStatus('tracking');
    console.log(`[Multi-Week Tracker] Checking ${trackingPredictions.length} tracking predictions for validity`);

    let voidedCount = 0;

    for (const prediction of trackingPredictions) {
      try {
        const userSettings = await storage.getUserSettings(prediction.userId);
        if (!userSettings?.manager_id) {
          console.log(`[Multi-Week Tracker] Skipping prediction ${prediction.id}: No manager_id found`);
          continue;
        }

        try {
          const teamPicks = await fplApi.getManagerPicks(userSettings.manager_id, currentGW);
          
          const playerInTeam = teamPicks.picks?.some((pick: { element: number }) => pick.element === prediction.playerInId);
          
          if (!playerInTeam) {
            const weeksElapsed = currentGW - prediction.startGameweek;
            await storage.updatePredictionTracking(prediction.id, {
              status: 'voided',
              voidReason: 'player_sold_early',
              closedAt: new Date(),
              actualGainFinal: prediction.pointsActualToDate,
              weeksElapsed
            });
            voidedCount++;
            console.log(`[Multi-Week Tracker] Voided prediction ${prediction.id}: Player ${prediction.playerInId} sold early`);
            continue;
          }

          const players = await fplApi.getPlayers();
          const playerIn = players.find((p: { id: number }) => p.id === prediction.playerInId);
          
          if (playerIn && playerIn.status !== 'a' && playerIn.chance_of_playing_next_round !== null && playerIn.chance_of_playing_next_round < 25) {
            const weeksElapsed = currentGW - prediction.startGameweek;
            await storage.updatePredictionTracking(prediction.id, {
              status: 'voided',
              voidReason: 'injury',
              closedAt: new Date(),
              actualGainFinal: prediction.pointsActualToDate,
              weeksElapsed
            });
            voidedCount++;
            console.log(`[Multi-Week Tracker] Voided prediction ${prediction.id}: Player ${prediction.playerInId} injured`);
          }
        } catch (apiError) {
          console.error(`[Multi-Week Tracker] Error checking team for prediction ${prediction.id}:`, apiError);
        }
      } catch (error) {
        console.error(`[Multi-Week Tracker] Error processing prediction ${prediction.id}:`, error);
      }
    }

    console.log(`[Multi-Week Tracker] ✓ Voided ${voidedCount} invalid predictions`);
  } catch (error) {
    console.error('[Multi-Week Tracker] Error in voidInvalidPredictions:', error);
  }
}
