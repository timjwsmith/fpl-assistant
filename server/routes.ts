import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage, db } from "./storage";
import { fplApi } from "./fpl-api";
import { aiPredictions } from "./ai-predictions";
import { managerSync } from "./manager-sync";
import { actualPointsService } from "./actual-points";
import { fplAuth } from "./fpl-auth";
import { gameweekAnalyzer } from "./gameweek-analyzer";
import { transferApplication } from "./transfer-application";
import { leagueAnalysis } from "./league-analysis";
import { competitorPredictor } from "./competitor-predictor";
import { leagueProjection } from "./league-projection";
import { aiImpactAnalysis } from "./ai-impact-analysis";
import { predictionAccuracyService } from "./prediction-accuracy";
import { predictionAnalysisService } from "./prediction-analysis-service";
import { gameweekSnapshot } from "./gameweek-data-snapshot";
import { precomputationCache } from "./precomputation-cache";
import { predictionEvaluator } from "./prediction-evaluator";
import { calibrationService } from "./calibration-service";
import { z } from "zod";
import { userSettingsSchema, multiWeekTransferPredictions, type MultiWeekTransferPrediction } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export async function registerRoutes(app: Express): Promise<Server> {
  // FPL Data Endpoints
  app.get("/api/fpl/bootstrap", async (req, res) => {
    try {
      const planningGameweek = await fplApi.getPlanningGameweek();
      const gameweek = planningGameweek?.id || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      
      // Construct bootstrap-compatible response with snapshot metadata
      res.json({
        elements: snapshot.data.players,
        teams: snapshot.data.teams,
        events: snapshot.data.gameweeks,
        element_types: snapshot.data.element_types,
        // Include snapshot metadata for debugging data consistency
        _snapshot: {
          gameweek: snapshot.gameweek,
          timestamp: snapshot.timestamp,
          enriched: snapshot.data.players.some(p => p.understat !== undefined)
        }
      });
    } catch (error) {
      console.error("Error fetching bootstrap data:", error);
      res.status(500).json({ error: "Failed to fetch FPL data" });
    }
  });

  app.get("/api/fpl/players", async (req, res) => {
    try {
      const planningGameweek = await fplApi.getPlanningGameweek();
      const gameweek = planningGameweek?.id || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      res.json(snapshot.data.players);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  app.get("/api/fpl/teams", async (req, res) => {
    try {
      const planningGameweek = await fplApi.getPlanningGameweek();
      const gameweek = planningGameweek?.id || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      res.json(snapshot.data.teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.get("/api/fpl/gameweeks", async (req, res) => {
    try {
      const planningGameweek = await fplApi.getPlanningGameweek();
      const gameweek = planningGameweek?.id || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      res.json(snapshot.data.gameweeks);
    } catch (error) {
      console.error("Error fetching gameweeks:", error);
      res.status(500).json({ error: "Failed to fetch gameweeks" });
    }
  });

  app.get("/api/fpl/planning-gameweek", async (req, res) => {
    try {
      const gameweek = await fplApi.getPlanningGameweek();
      if (!gameweek) {
        return res.status(404).json({ error: "No planning gameweek found" });
      }
      res.json(gameweek);
    } catch (error) {
      console.error("Error fetching planning gameweek:", error);
      res.status(500).json({ error: "Failed to fetch planning gameweek" });
    }
  });

  app.get("/api/fpl/fixtures", async (req, res) => {
    try {
      const planningGameweek = await fplApi.getPlanningGameweek();
      const defaultGameweek = planningGameweek?.id || 1;
      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek as string) : defaultGameweek;
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      
      // Filter fixtures by gameweek if specified in query
      const fixtures = req.query.gameweek 
        ? snapshot.data.fixtures.filter(f => f.event === gameweek)
        : snapshot.data.fixtures;
      
      res.json(fixtures);
    } catch (error) {
      console.error("Error fetching fixtures:", error);
      res.status(500).json({ error: "Failed to fetch fixtures" });
    }
  });

  app.get("/api/fpl/positions", async (req, res) => {
    try {
      const positions = await fplApi.getPositionTypes();
      res.json(positions);
    } catch (error) {
      console.error("Error fetching positions:", error);
      res.status(500).json({ error: "Failed to fetch positions" });
    }
  });

  app.post("/api/fpl/refresh", async (req, res) => {
    try {
      console.log("[API] Force refreshing FPL data");
      
      // Clear FPL API cache (contains players, teams, gameweeks)
      fplApi.clearCache();
      
      // Clear gameweek snapshot cache (contains enriched player data + fixtures)
      gameweekSnapshot.clearCache();
      
      res.json({ 
        success: true, 
        message: "FPL data caches cleared successfully. Fresh data will be fetched on next request." 
      });
    } catch (error) {
      console.error("Error refreshing FPL data:", error);
      res.status(500).json({ error: "Failed to refresh FPL data" });
    }
  });

  app.get("/api/fpl/player/:id", async (req, res) => {
    try {
      const playerId = parseInt(req.params.id);
      const playerDetails = await fplApi.getPlayerDetails(playerId);
      res.json(playerDetails);
    } catch (error) {
      console.error("Error fetching player details:", error);
      res.status(500).json({ error: "Failed to fetch player details" });
    }
  });

  app.get("/api/fpl/manager/:id", async (req, res) => {
    try {
      const managerId = parseInt(req.params.id);
      const manager = await fplApi.getManagerDetails(managerId);
      res.json(manager);
    } catch (error) {
      console.error("Error fetching manager:", error);
      res.status(500).json({ error: "Failed to fetch manager details" });
    }
  });

  app.get("/api/fpl/manager/:id/picks/:gameweek", async (req, res) => {
    try {
      const managerId = parseInt(req.params.id);
      const gameweek = parseInt(req.params.gameweek);
      const picks = await fplApi.getManagerPicks(managerId, gameweek);
      res.json(picks);
    } catch (error) {
      console.error("Error fetching manager picks:", error);
      res.status(500).json({ error: "Failed to fetch manager picks" });
    }
  });

  app.get("/api/fpl/manager/:id/transfers", async (req, res) => {
    try {
      const managerId = parseInt(req.params.id);
      const transfers = await fplApi.getManagerTransfers(managerId);
      res.json(transfers);
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ error: "Failed to fetch transfers" });
    }
  });

  app.get("/api/fpl/manager/:id/history", async (req, res) => {
    try {
      const managerId = parseInt(req.params.id);
      const history = await fplApi.getManagerHistory(managerId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching manager history:", error);
      res.status(500).json({ error: "Failed to fetch manager history" });
    }
  });

  // League Analysis Endpoints
  app.get("/api/fpl/league/:leagueId/standings", async (req, res) => {
    try {
      const leagueId = parseInt(req.params.leagueId);
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const standings = await fplApi.getLeagueStandings(leagueId, page);
      res.json(standings);
    } catch (error) {
      console.error("Error fetching league standings:", error);
      res.status(500).json({ error: "Failed to fetch league standings" });
    }
  });

  app.get("/api/fpl/set-piece-takers", async (req, res) => {
    try {
      const setPieceTakers = await fplApi.getSetPieceTakers();
      res.json(setPieceTakers);
    } catch (error) {
      console.error("Error fetching set piece takers:", error);
      res.status(500).json({ error: "Failed to fetch set piece takers" });
    }
  });

  app.get("/api/fpl/dream-team/:gameweek", async (req, res) => {
    try {
      const gameweek = parseInt(req.params.gameweek);
      const dreamTeam = await fplApi.getDreamTeam(gameweek);
      res.json(dreamTeam);
    } catch (error) {
      console.error("Error fetching dream team:", error);
      res.status(500).json({ error: "Failed to fetch dream team" });
    }
  });

  app.get("/api/fpl/event-status", async (req, res) => {
    try {
      const status = await fplApi.getEventStatus();
      res.json(status);
    } catch (error) {
      console.error("Error fetching event status:", error);
      res.status(500).json({ error: "Failed to fetch event status" });
    }
  });

  // Manager Sync Endpoints
  app.post("/api/manager/sync/:managerId", async (req, res) => {
    try {
      const managerId = parseInt(req.params.managerId);
      
      if (isNaN(managerId)) {
        return res.status(400).json({ error: "Invalid manager ID" });
      }

      const managerDetails = await fplApi.getManagerDetails(managerId);
      
      if (!managerDetails) {
        return res.status(404).json({ error: "Manager not found" });
      }

      const user = await storage.getOrCreateUser(managerId);
      
      const syncResult = await managerSync.syncManagerTeam(managerId, user.id);
      
      if (!syncResult.success) {
        return res.status(500).json({ error: syncResult.error || "Failed to sync team" });
      }

      res.json(syncResult);
    } catch (error) {
      console.error("Error syncing manager:", error);
      res.status(500).json({ error: "Failed to sync manager team" });
    }
  });

  app.get("/api/manager/:managerId/status", async (req, res) => {
    try {
      const managerId = parseInt(req.params.managerId);
      
      if (isNaN(managerId)) {
        return res.status(400).json({ error: "Invalid manager ID" });
      }

      const user = await storage.getOrCreateUser(managerId);
      const status = await managerSync.getManagerStatus(managerId, user.id);
      
      if (!status) {
        return res.status(404).json({ error: "No team data found. Please sync first." });
      }

      res.json(status);
    } catch (error) {
      console.error("Error fetching manager status:", error);
      res.status(500).json({ error: "Failed to fetch manager status" });
    }
  });

  // AI Prediction Endpoints
  app.post("/api/ai/predict-player", async (req, res) => {
    try {
      const { player, fixtures } = req.body;
      if (!player || !fixtures) {
        return res.status(400).json({ error: "Missing player or fixtures data" });
      }
      const prediction = await aiPredictions.predictPlayerPoints({ player, upcomingFixtures: fixtures });
      res.json(prediction);
    } catch (error) {
      console.error("Error predicting player points:", error);
      res.status(500).json({ error: "Failed to predict player points" });
    }
  });

  app.post("/api/ai/transfer-recommendations", async (req, res) => {
    try {
      const { currentPlayers, budget } = req.body;
      if (!currentPlayers || budget === undefined) {
        return res.status(400).json({ error: "Missing required data" });
      }

      const planningGameweek = await fplApi.getPlanningGameweek();
      const gameweek = planningGameweek?.id || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      
      const recommendations = await aiPredictions.getTransferRecommendations(
        currentPlayers,
        snapshot.data.players,
        snapshot.data.fixtures,
        budget
      );
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error getting transfer recommendations:", error);
      res.status(500).json({ error: "Failed to get transfer recommendations" });
    }
  });

  app.post("/api/ai/captain-recommendations", async (req, res) => {
    try {
      const { playerIds } = req.body;
      if (!playerIds || !Array.isArray(playerIds)) {
        return res.status(400).json({ error: "Missing or invalid playerIds" });
      }

      const planningGameweek = await fplApi.getPlanningGameweek();
      const gameweek = planningGameweek?.id || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      
      const players = snapshot.data.players.filter(p => playerIds.includes(p.id));
      const recommendations = await aiPredictions.getCaptainRecommendations(players, snapshot.data.fixtures);
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error getting captain recommendations:", error);
      res.status(500).json({ error: "Failed to get captain recommendations" });
    }
  });

  app.post("/api/ai/chip-strategy", async (req, res) => {
    try {
      const { currentGameweek, remainingChips } = req.body;
      if (!currentGameweek || !remainingChips) {
        return res.status(400).json({ error: "Missing required data" });
      }

      const strategies = await aiPredictions.getChipStrategy(currentGameweek, remainingChips);
      res.json(strategies);
    } catch (error) {
      console.error("Error getting chip strategy:", error);
      res.status(500).json({ error: "Failed to get chip strategy" });
    }
  });

  app.post("/api/ai/analyze-team/stream", async (req, res) => {
    console.log('[ROUTE SSE] Analyze team stream endpoint called');
    try {
      const { players, formation } = req.body;
      console.log('[ROUTE SSE] Players count:', players?.length, 'Formation:', formation);
      
      if (!players || !formation) {
        console.log('[ROUTE SSE] Missing required data!');
        return res.status(400).json({ error: "Missing required data" });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Send initial ping to establish connection
      res.write(`data: ${JSON.stringify({ status: 'started' })}\n\n`);
      
      let buffer = '';

      await aiPredictions.analyzeTeamCompositionStream(
        players,
        formation,
        (chunk: string) => {
          buffer += chunk;
          res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
        }
      );

      res.write(`data: ${JSON.stringify({ done: true, fullContent: buffer })}\n\n`);
      res.end();
      console.log('[ROUTE SSE] Stream complete');
    } catch (error) {
      console.error('[ROUTE SSE] Error:', error);
      res.write(`data: ${JSON.stringify({ error: 'Failed to analyze team' })}\n\n`);
      res.end();
    }
  });

  app.post("/api/ai/analyze-team", async (req, res) => {
    console.log('[ROUTE] Analyze team endpoint called');
    try {
      const { players, formation } = req.body;
      console.log('[ROUTE] Players count:', players?.length, 'Formation:', formation);
      if (!players || !formation) {
        console.log('[ROUTE] Missing required data!');
        return res.status(400).json({ error: "Missing required data" });
      }

      const analysis = await aiPredictions.analyzeTeamComposition(players, formation);
      console.log('[ROUTE] Analysis complete:', JSON.stringify(analysis));
      console.log('[ROUTE] Sending response with status 200');
      
      // Use send() which handles both JSON serialization and response completion
      res.status(200).send(analysis);
      console.log('[ROUTE] Response sent');
    } catch (error) {
      console.error("Error analyzing team:", error);
      res.status(500).json({ error: "Failed to analyze team" });
    }
  });

  // Async polling-based team analysis (workaround for proxy issues)
  app.post("/api/ai/analyze-team-async", async (req, res) => {
    console.log('[ROUTE ASYNC] Analyze team async endpoint called');
    try {
      const { players, formation, userId = 1, captainId, viceCaptainId } = req.body;
      if (!players || !formation) {
        return res.status(400).json({ error: "Missing required data" });
      }

      // Create prediction record with pending status
      const predictionId = await storage.createTeamPrediction(userId, { players, formation, captainId, viceCaptainId });
      console.log('[ROUTE ASYNC] Created prediction ID:', predictionId, 'Captain:', captainId);

      // Start async processing (don't await - let it run in background)
      (async () => {
        try {
          await storage.updateTeamPredictionStatus(predictionId, 'processing');
          const analysis = await aiPredictions.analyzeTeamComposition(players, formation, captainId, viceCaptainId);
          await storage.completeTeamPrediction(predictionId, analysis);
          console.log('[ROUTE ASYNC] Background processing complete for ID:', predictionId);
        } catch (error) {
          console.error('[ROUTE ASYNC] Background processing error:', error);
          await storage.failTeamPrediction(predictionId, error instanceof Error ? error.message : 'Unknown error');
        }
      })();

      // Immediately return the prediction ID for polling
      res.json({ predictionId });
    } catch (error) {
      console.error('[ROUTE ASYNC] Error creating prediction:', error);
      res.status(500).json({ error: "Failed to create prediction" });
    }
  });

  // Poll for prediction status
  app.get("/api/ai/prediction/:id", async (req, res) => {
    try {
      const predictionId = parseInt(req.params.id);
      if (isNaN(predictionId)) {
        return res.status(400).json({ error: "Invalid prediction ID" });
      }

      const prediction = await storage.getTeamPrediction(predictionId);
      if (!prediction) {
        return res.status(404).json({ error: "Prediction not found" });
      }

      res.json({
        id: prediction.id,
        status: prediction.status,
        result: prediction.result,
        error: prediction.error,
      });
    } catch (error) {
      console.error('[ROUTE] Error fetching prediction:', error);
      res.status(500).json({ error: "Failed to fetch prediction" });
    }
  });

  // FPL Authentication Routes
  app.post("/api/fpl-auth/login", async (req, res) => {
    try {
      const { userId, email, password } = req.body;
      
      if (!userId || !email || !password) {
        return res.status(400).json({ error: "Missing required fields: userId, email, password" });
      }

      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      console.log(`[FPL Auth Route] Login attempt for user ${userIdNum}`);
      
      await fplAuth.login(email, password, userIdNum);
      
      console.log(`[FPL Auth Route] Login successful for user ${userIdNum}`);
      res.json({ success: true, message: "Successfully authenticated with FPL" });
    } catch (error) {
      console.error("[FPL Auth Route] Login error:", error);
      res.status(401).json({ 
        error: "Failed to authenticate with FPL", 
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  app.post("/api/fpl-auth/login-with-cookies", async (req, res) => {
    try {
      const { userId, cookies, email, password } = req.body;
      
      if (!userId || !cookies) {
        return res.status(400).json({ 
          error: "Missing required fields: userId, cookies",
          example: "Cookies should be in format: cookie_name=value; cookie_name2=value2"
        });
      }

      if (typeof cookies !== 'string') {
        return res.status(400).json({ 
          error: "Invalid cookie format: cookies must be a string",
          example: "Cookies should be in format: cookie_name=value; cookie_name2=value2"
        });
      }

      const trimmedCookies = cookies.trim();
      
      if (trimmedCookies.length === 0) {
        return res.status(400).json({ 
          error: "Cookie string cannot be empty",
          example: "Cookies should be in format: cookie_name=value; cookie_name2=value2"
        });
      }

      if (trimmedCookies.includes('\n') || trimmedCookies.includes('\r')) {
        return res.status(400).json({ 
          error: "Invalid cookie format: cookies cannot contain newlines. Please provide cookies as a single line.",
          example: "Correct format: cookie_name=value; cookie_name2=value2"
        });
      }

      if (!trimmedCookies.includes('=')) {
        return res.status(400).json({ 
          error: "Invalid cookie format: cookies must contain at least one '=' character",
          example: "Cookies should be in format: cookie_name=value; cookie_name2=value2"
        });
      }

      const userIdNum = parseInt(userId);
      if (isNaN(userIdNum)) {
        return res.status(400).json({ error: "Invalid userId: must be a number" });
      }

      console.log(`[FPL Auth Route] Manual cookie authentication for user ${userIdNum}`);
      
      await fplAuth.loginWithCookies(userIdNum, trimmedCookies, email, password);
      
      console.log(`[FPL Auth Route] Cookie authentication successful for user ${userIdNum}`);
      res.json({ success: true, message: "Successfully authenticated with FPL cookies" });
    } catch (error) {
      console.error("[FPL Auth Route] Cookie authentication error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      res.status(401).json({ 
        error: "Failed to authenticate with cookies", 
        details: errorMessage,
        example: "Cookies should be in format: cookie_name=value; cookie_name2=value2"
      });
    }
  });

  app.get("/api/fpl-auth/status/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const authenticated = await fplAuth.isAuthenticated(userId);
      
      // Get expiry information
      let cookieExpiry = null;
      let daysUntilExpiry = null;
      let expiryWarning = false;
      
      if (authenticated) {
        const credentials = await storage.getFplCredentials(userId);
        if (credentials?.cookiesExpiresAt) {
          const expiryDate = new Date(credentials.cookiesExpiresAt);
          cookieExpiry = expiryDate.toISOString();
          const now = new Date();
          const diffMs = expiryDate.getTime() - now.getTime();
          daysUntilExpiry = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          expiryWarning = daysUntilExpiry <= 2; // Warn if 2 days or less
        }
      }
      
      res.json({ 
        authenticated,
        cookieExpiry,
        daysUntilExpiry,
        expiryWarning
      });
    } catch (error) {
      console.error("[FPL Auth Route] Status check error:", error);
      res.status(500).json({ 
        error: "Failed to check authentication status",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/fpl-auth/logout/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      console.log(`[FPL Auth Route] Logout request for user ${userId}`);
      
      await fplAuth.logout(userId);
      
      console.log(`[FPL Auth Route] Logout successful for user ${userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error("[FPL Auth Route] Logout error:", error);
      res.status(500).json({ 
        error: "Failed to logout",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/fpl-auth/debug-cookies/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const cookies = await fplAuth.getSessionCookies(userId);
      const csrfToken = await fplAuth.getCsrfToken(userId);
      
      res.json({ 
        cookies: cookies.substring(0, 100) + '...',
        csrfToken,
        cookiesLength: cookies.length,
        hasColons: cookies.includes(':'),
        hasUrlEncoding: cookies.includes('%')
      });
    } catch (error) {
      console.error("[FPL Auth Route] Debug cookies error:", error);
      res.status(500).json({ 
        error: "Failed to debug cookies",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Automation Settings Routes
  app.get("/api/automation/settings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const settings = await storage.getAutomationSettings(userId);
      
      res.json(settings || null);
    } catch (error) {
      console.error("[Automation Settings Route] Error fetching settings:", error);
      res.status(500).json({ 
        error: "Failed to fetch automation settings",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/automation/settings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      console.log(`[Automation Settings Route] Saving settings for user ${userId}:`, req.body);

      const settings = await storage.saveAutomationSettings(userId, req.body);
      
      console.log(`[Automation Settings Route] Settings saved successfully for user ${userId}`);
      res.json(settings);
    } catch (error) {
      console.error("[Automation Settings Route] Error saving settings:", error);
      res.status(500).json({ 
        error: "Failed to save automation settings",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Gameweek Analysis Routes
  app.post("/api/automation/analyze/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const planningGameweek = await fplApi.getPlanningGameweek();
      const defaultGW = planningGameweek?.id || 1;
      
      const gameweek = req.query.gameweek 
        ? parseInt(req.query.gameweek as string) 
        : defaultGW;

      const targetPlayerId = req.query.targetPlayerId 
        ? parseInt(req.query.targetPlayerId as string) 
        : undefined;

      const rawCustomLineup = req.body?.customLineup as Array<{
        player_id: number | null;
        position: number;
        is_captain: boolean;
        is_vice_captain: boolean;
      }> | undefined;

      // Validate custom lineup for incomplete squads
      if (rawCustomLineup && rawCustomLineup.length > 0) {
        const emptySlots = rawCustomLineup.filter(p => !p.player_id);
        if (emptySlots.length > 0) {
          const emptyPositions = emptySlots.map(p => p.position).join(', ');
          console.log(`[Automation Analyze Route] Incomplete squad detected: ${emptySlots.length} empty slot(s) at position(s) ${emptyPositions}`);
          return res.status(400).json({ 
            error: "Incomplete squad",
            details: `Your team has ${emptySlots.length} empty slot(s). Please complete your squad before analyzing. Missing positions: ${emptyPositions}`,
            missingPositions: emptySlots.map(p => p.position)
          });
        }
      }

      // After validation, we know all player_ids are non-null
      const customLineup = rawCustomLineup as Array<{
        player_id: number;
        position: number;
        is_captain: boolean;
        is_vice_captain: boolean;
      }> | undefined;

      console.log(`[Automation Analyze Route] Starting analysis for user ${userId}, gameweek ${gameweek}${targetPlayerId ? `, target player: ${targetPlayerId}` : ''}${customLineup ? `, with custom lineup (${customLineup.length} players)` : ''}`);

      const plan = await gameweekAnalyzer.analyzeGameweek(userId, gameweek, targetPlayerId, customLineup);
      
      console.log(`[Automation Analyze Route] Analysis complete for user ${userId}, plan ID: ${plan.id}${customLineup ? ' (what-if analysis)' : ''}`);
      res.json(plan);
    } catch (error) {
      console.error("[Automation Analyze Route] Error analyzing gameweek:", error);
      res.status(500).json({ 
        error: "Failed to analyze gameweek",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/automation/plan/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const gameweek = req.query.gameweek 
        ? parseInt(req.query.gameweek as string) 
        : undefined;

      let rawPlan;
      if (gameweek) {
        rawPlan = await storage.getGameweekPlan(userId, gameweek);
      } else {
        rawPlan = await storage.getLatestGameweekPlan(userId);
      }
      
      if (!rawPlan) {
        return res.json(null);
      }

      // Get players from snapshot for hydration
      const snapshot = await gameweekSnapshot.getSnapshot(rawPlan.gameweek);
      
      // Hydrate the plan with player names and calculated fields
      const { gameweekPlanHydrator } = await import("./gameweek-plan-hydrator");
      const hydratedPlan = await gameweekPlanHydrator.hydratePlan(rawPlan, snapshot.data.players);
      
      // Add usingFallbackData flag based on dataSource column
      const usingFallbackData = rawPlan.dataSource === 'fallback';
      
      res.json({
        ...hydratedPlan,
        usingFallbackData,
      });
    } catch (error) {
      console.error("[Automation Plan Route] Error fetching plan:", error);
      res.status(500).json({ 
        error: "Failed to fetch gameweek plan",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/automation/plans/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const rawPlans = await storage.getGameweekPlansByUser(userId);
      
      if (rawPlans.length === 0) {
        return res.json([]);
      }
      
      // Get players from snapshot (use latest plan's gameweek or current)
      const latestGameweek = rawPlans[rawPlans.length - 1]?.gameweek || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(latestGameweek);
      
      // Hydrate all plans with player names and calculated fields
      const { gameweekPlanHydrator } = await import("./gameweek-plan-hydrator");
      const hydratedPlans = await gameweekPlanHydrator.hydratePlans(rawPlans, snapshot.data.players);
      
      res.json(hydratedPlans);
    } catch (error) {
      console.error("[Automation Plans Route] Error fetching plans:", error);
      res.status(500).json({ 
        error: "Failed to fetch gameweek plans",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Transfer Application Routes
  app.post("/api/automation/apply/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const { gameweekPlanId } = req.body;
      
      if (!gameweekPlanId) {
        return res.status(400).json({ error: "Missing gameweekPlanId in request body" });
      }

      const planId = parseInt(gameweekPlanId);
      if (isNaN(planId)) {
        return res.status(400).json({ error: "Invalid gameweekPlanId" });
      }

      console.log(`[Automation Apply Route] Applying plan ${planId} for user ${userId}`);

      const result = await transferApplication.applyGameweekPlan(userId, planId);
      
      console.log(`[Automation Apply Route] Application result for user ${userId}:`, result);
      
      if (!result.success) {
        return res.status(400).json({
          error: "Failed to apply gameweek plan",
          details: result.errors.join(", "),
          result
        });
      }

      res.json(result);
    } catch (error) {
      console.error("[Automation Apply Route] Error applying plan:", error);
      res.status(500).json({ 
        error: "Failed to apply gameweek plan",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.put("/api/automation/plan/:planId/status", async (req, res) => {
    try {
      const planId = parseInt(req.params.planId);
      
      if (isNaN(planId)) {
        return res.status(400).json({ error: "Invalid planId" });
      }

      const { status } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: "Missing status in request body" });
      }

      const validStatuses = ['pending', 'previewed', 'applied', 'rejected'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ 
          error: "Invalid status", 
          details: `Status must be one of: ${validStatuses.join(', ')}` 
        });
      }

      console.log(`[Automation Plan Status Route] Updating plan ${planId} to status: ${status}`);

      await storage.updateGameweekPlanStatus(planId, status);
      
      const updatedPlan = await storage.getGameweekPlanById(planId);
      
      if (!updatedPlan) {
        return res.status(404).json({ error: "Gameweek plan not found" });
      }

      console.log(`[Automation Plan Status Route] Plan ${planId} status updated to: ${status}`);
      res.json(updatedPlan);
    } catch (error) {
      console.error("[Automation Plan Status Route] Error updating plan status:", error);
      res.status(500).json({ 
        error: "Failed to update plan status",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/automation/plan/:planId/update-acceptance", async (req, res) => {
    try {
      const planId = parseInt(req.params.planId);
      
      if (isNaN(planId)) {
        return res.status(400).json({ error: "Invalid planId" });
      }

      const { transfers, lineupOptimizations } = req.body;

      console.log(`[Update Acceptance Route] Updating acceptance for plan ${planId}`);
      console.log(`[Update Acceptance Route] Transfers:`, transfers);
      console.log(`[Update Acceptance Route] Lineup Optimizations:`, lineupOptimizations);

      // Get the current plan
      const plan = await storage.getGameweekPlanById(planId);
      if (!plan) {
        return res.status(404).json({ error: "Gameweek plan not found" });
      }

      // Get current user's team and FPL data
      const userTeam = await storage.getTeam(plan.userId, plan.gameweek);
      if (!userTeam) {
        return res.status(400).json({ error: "User team not found for this gameweek" });
      }

      // Get free transfers and max hit from automation settings
      const automationSettings = await storage.getAutomationSettings(plan.userId);
      const maxTransferHit = automationSettings?.maxTransferHit || 8;

      // Get snapshot for player data
      const snapshot = await gameweekSnapshot.getSnapshot(plan.gameweek);
      const allPlayers = snapshot.data.players;

      // Update acceptance status for transfers
      let updatedTransfers = [...(plan.transfers as any[])];
      if (transfers && Array.isArray(transfers)) {
        transfers.forEach(({ index, accepted }: { index: number; accepted: boolean }) => {
          if (index >= 0 && index < updatedTransfers.length) {
            updatedTransfers[index] = { ...updatedTransfers[index], accepted };
          }
        });
      }

      // Update acceptance status for lineup optimizations
      let updatedLineupOptimizations = [...((plan.lineupOptimizations as any[]) || [])];
      if (lineupOptimizations && Array.isArray(lineupOptimizations)) {
        lineupOptimizations.forEach(({ index, accepted }: { index: number; accepted: boolean }) => {
          if (index >= 0 && index < updatedLineupOptimizations.length) {
            updatedLineupOptimizations[index] = { ...updatedLineupOptimizations[index], accepted };
          }
        });
      }

      // Filter to only accepted transfers
      const acceptedTransfers = updatedTransfers.filter(t => t.accepted);
      const acceptedLineupOptimizations = updatedLineupOptimizations.filter(lo => lo.accepted);

      console.log(`[Update Acceptance Route] Accepted transfers: ${acceptedTransfers.length}/${updatedTransfers.length}`);
      console.log(`[Update Acceptance Route] Accepted lineup optimizations: ${acceptedLineupOptimizations.length}/${updatedLineupOptimizations.length}`);

      // Recalculate transfer cost based on accepted transfers only
      // Note: Free transfers should be fetched from FPL API in production
      // For now, default to 1 free transfer per gameweek
      const freeTransfers = 1;
      let transferCost = 0;
      if (acceptedTransfers.length > freeTransfers) {
        const extraTransfers = acceptedTransfers.length - freeTransfers;
        transferCost = extraTransfers * 4;

        if (transferCost > maxTransferHit) {
          return res.status(400).json({ 
            error: `Transfer cost (${transferCost} points) exceeds maximum allowed hit (${maxTransferHit} points)` 
          });
        }
      }

      console.log(`[Update Acceptance Route] Transfer cost: ${transferCost} (${acceptedTransfers.length} transfers, ${freeTransfers} free)`);

      // Regenerate lineup based on accepted transfers only
      // Apply accepted transfers to get final squad
      const transferredOutIds = new Set(acceptedTransfers.map((t: any) => t.player_out_id));
      const transferredInIds = acceptedTransfers.map((t: any) => t.player_in_id);
      
      const finalSquad = userTeam.players
        .filter(p => p.player_id && !transferredOutIds.has(p.player_id))
        .map(p => p.player_id!);
      
      finalSquad.push(...transferredInIds);

      console.log(`[Update Acceptance Route] Final squad after accepted transfers: ${finalSquad.length} players`);

      // Get AI predictions for all players in squad from database
      const allPredictions = await storage.getPredictions(plan.userId, plan.gameweek);

      // Create predictions map for quick lookup
      const predictionsMap = new Map(allPredictions.map(p => [p.playerId, p.predictedPoints]));

      // Parse formation
      const formationParts = plan.formation.split('-').map(Number);
      const [defenders, midfielders, forwards] = formationParts;
      
      // Group players by position type
      const playersByPosition: {[key: number]: Array<{id: number; predictedPoints: number}>} = {
        1: [], // GK
        2: [], // DEF
        3: [], // MID
        4: [], // FWD
      };
      
      for (const playerId of finalSquad) {
        const player = allPlayers.find(p => p.id === playerId);
        if (!player) continue;
        
        const predictedPoints = predictionsMap.get(playerId) || 0;
        
        playersByPosition[player.element_type].push({
          id: playerId,
          predictedPoints,
        });
      }
      
      // Sort each position by predicted points (highest first)
      for (const posType in playersByPosition) {
        playersByPosition[posType].sort((a, b) => b.predictedPoints - a.predictedPoints);
      }
      
      // Select starting XI based on formation
      const lineup: Array<{
        player_id: number;
        position: number;
        is_captain: boolean;
        is_vice_captain: boolean;
        multiplier: number;
      }> = [];
      
      let position = 1;
      
      // Always 1 goalkeeper
      if (playersByPosition[1].length > 0) {
        lineup.push({
          player_id: playersByPosition[1][0].id,
          position: position++,
          is_captain: playersByPosition[1][0].id === plan.captainId,
          is_vice_captain: playersByPosition[1][0].id === plan.viceCaptainId,
          multiplier: playersByPosition[1][0].id === plan.captainId ? 2 : 1,
        });
      }
      
      // Add defenders
      for (let i = 0; i < defenders && i < playersByPosition[2].length; i++) {
        lineup.push({
          player_id: playersByPosition[2][i].id,
          position: position++,
          is_captain: playersByPosition[2][i].id === plan.captainId,
          is_vice_captain: playersByPosition[2][i].id === plan.viceCaptainId,
          multiplier: playersByPosition[2][i].id === plan.captainId ? 2 : 1,
        });
      }
      
      // Add midfielders
      for (let i = 0; i < midfielders && i < playersByPosition[3].length; i++) {
        lineup.push({
          player_id: playersByPosition[3][i].id,
          position: position++,
          is_captain: playersByPosition[3][i].id === plan.captainId,
          is_vice_captain: playersByPosition[3][i].id === plan.viceCaptainId,
          multiplier: playersByPosition[3][i].id === plan.captainId ? 2 : 1,
        });
      }
      
      // Add forwards
      for (let i = 0; i < forwards && i < playersByPosition[4].length; i++) {
        lineup.push({
          player_id: playersByPosition[4][i].id,
          position: position++,
          is_captain: playersByPosition[4][i].id === plan.captainId,
          is_vice_captain: playersByPosition[4][i].id === plan.viceCaptainId,
          multiplier: playersByPosition[4][i].id === plan.captainId ? 2 : 1,
        });
      }

      // Add bench players (remaining players sorted by predicted points)
      const startingPlayerIds = new Set(lineup.map(p => p.player_id));
      const benchPlayers: Array<{id: number; predictedPoints: number; elementType: number}> = [];
      
      for (const posType in playersByPosition) {
        for (const player of playersByPosition[posType]) {
          if (!startingPlayerIds.has(player.id)) {
            benchPlayers.push({
              id: player.id,
              predictedPoints: player.predictedPoints,
              elementType: parseInt(posType)
            });
          }
        }
      }
      
      // Sort bench by predicted points
      benchPlayers.sort((a, b) => b.predictedPoints - a.predictedPoints);
      
      // Add bench players to lineup
      for (const benchPlayer of benchPlayers) {
        lineup.push({
          player_id: benchPlayer.id,
          position: position++,
          is_captain: false,
          is_vice_captain: false,
          multiplier: 1,
        });
      }

      console.log(`[Update Acceptance Route] Generated lineup with ${lineup.length} players`);

      // Calculate GROSS predicted points (before transfer cost)
      const isBenchBoostActive = plan.chipToPlay === 'benchboost';
      let grossPredictedPoints = 0;
      
      for (const pick of lineup) {
        const shouldInclude = pick.position <= 11 || isBenchBoostActive;
        if (shouldInclude) {
          const prediction = predictionsMap.get(pick.player_id) || 0;
          grossPredictedPoints += prediction * pick.multiplier;
        }
      }

      // Calculate NET predicted points (after transfer cost)
      const netPredictedPoints = Math.round(grossPredictedPoints - transferCost);

      console.log(`[Update Acceptance Route] GROSS points: ${grossPredictedPoints}, Transfer cost: ${transferCost}, NET points: ${netPredictedPoints}`);

      // Update the plan in the database
      const updatedPlan = {
        ...plan,
        transfers: updatedTransfers,
        lineupOptimizations: updatedLineupOptimizations,
        lineup,
        predictedPoints: netPredictedPoints,
        baselinePredictedPoints: plan.baselinePredictedPoints || Math.round(grossPredictedPoints), // Keep original baseline
      };

      // Save the updated plan using storage methods
      await storage.updateGameweekPlanTransfers(planId, updatedTransfers);
      if (updatedLineupOptimizations.length > 0) {
        await storage.updateGameweekPlanLineupOptimizations(planId, updatedLineupOptimizations);
      }
      await storage.updateGameweekPlanLineup(planId, lineup);
      await storage.updateGameweekPlanPredictedPoints(planId, netPredictedPoints);

      // Fetch the updated plan
      const finalPlan = await storage.getGameweekPlanById(planId);

      console.log(`[Update Acceptance Route] Plan ${planId} updated successfully`);
      res.json(finalPlan);
    } catch (error) {
      console.error("[Update Acceptance Route] Error updating plan acceptance:", error);
      res.status(500).json({ 
        error: "Failed to update plan acceptance",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Mark as Submitted Route
  app.post("/api/automation/plan/:id/mark-submitted", async (req, res) => {
    try {
      const planId = parseInt(req.params.id);
      
      if (isNaN(planId)) {
        return res.status(400).json({ error: "Invalid plan ID" });
      }

      // Get the current plan
      const plan = await storage.getGameweekPlanById(planId);
      if (!plan) {
        return res.status(404).json({ error: "Gameweek plan not found" });
      }

      // Toggle the submitted status
      const newSubmittedStatus = !plan.submitted;

      // Update the submitted field in the database
      await storage.updateGameweekPlanSubmitted(planId, newSubmittedStatus);

      // If marking as submitted (not un-submitting), record multi-week predictions
      if (newSubmittedStatus && plan.transfers && Array.isArray(plan.transfers) && plan.transfers.length > 0) {
        console.log(`[Mark Submitted Route] Recording ${plan.transfers.length} multi-week predictions for plan ${planId}`);
        await storage.createMultiWeekPredictions(
          plan.userId,
          planId,
          plan.gameweek,
          plan.transfers as any[]
        );
      }

      // Fetch the updated plan
      const updatedPlan = await storage.getGameweekPlanById(planId);

      console.log(`[Mark Submitted Route] Plan ${planId} submitted status toggled to ${newSubmittedStatus}`);
      res.json(updatedPlan);
    } catch (error) {
      console.error("[Mark Submitted Route] Error toggling submitted status:", error);
      res.status(500).json({ 
        error: "Failed to toggle submitted status",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Change History Routes
  app.get("/api/automation/history/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const gameweek = req.query.gameweek 
        ? parseInt(req.query.gameweek as string) 
        : undefined;

      let history;
      if (gameweek) {
        history = await storage.getChangeHistory(userId, gameweek);
      } else {
        history = await storage.getChangeHistoryByUser(userId);
      }
      
      res.json(history);
    } catch (error) {
      console.error("[Automation History Route] Error fetching change history:", error);
      res.status(500).json({ 
        error: "Failed to fetch change history",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Predictions Routes
  app.get("/api/predictions/:userId/:gameweek", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const gameweek = parseInt(req.params.gameweek);
      
      const predictions = await storage.getPredictionsByGameweek(userId, gameweek);
      
      // Get FPL players for fallback PPG values
      const fplPlayers = await fplApi.getPlayers();
      const playerPPGMap = new Map(fplPlayers.map(p => [p.id, parseFloat(p.points_per_game) || 0]));
      
      // Convert to a simple map for frontend consumption
      // Use PPG as fallback when stored prediction is 0 or missing
      const predictionsMap: Record<number, number> = {};
      predictions.forEach(p => {
        // If stored prediction is 0, use PPG as fallback
        if (p.predictedPoints === 0) {
          const ppg = playerPPGMap.get(p.playerId) || 0;
          predictionsMap[p.playerId] = Math.round(ppg * 10) / 10; // Round to 1 decimal
        } else {
          predictionsMap[p.playerId] = p.predictedPoints;
        }
      });
      
      res.json(predictionsMap);
    } catch (error) {
      console.error('[Predictions Route] Error fetching predictions:', error);
      res.status(500).json({ error: 'Failed to fetch predictions' });
    }
  });

  // Prediction Accuracy Routes
  app.get("/api/prediction-accuracy/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const startGameweek = req.query.startGameweek 
        ? parseInt(req.query.startGameweek as string) 
        : undefined;

      console.log(`[Prediction Accuracy Route] Fetching accuracy history for user ${userId}${startGameweek ? ` from GW${startGameweek}` : ''}`);
      
      const accuracyData = await predictionAccuracyService.getAccuracyHistory(userId, startGameweek);
      
      res.json(accuracyData);
    } catch (error) {
      console.error("[Prediction Accuracy Route] Error fetching accuracy history:", error);
      res.status(500).json({ 
        error: "Failed to fetch prediction accuracy",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/prediction-accuracy/update/:userId/:gameweek", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const gameweek = parseInt(req.params.gameweek);
      
      if (isNaN(userId) || isNaN(gameweek)) {
        return res.status(400).json({ error: "Invalid userId or gameweek" });
      }

      console.log(`[Prediction Accuracy Route] Updating actual points for user ${userId}, GW${gameweek}`);
      
      await predictionAccuracyService.updateActualPoints(userId, gameweek);
      
      res.json({ success: true, message: `Updated actual points for GW${gameweek}` });
    } catch (error) {
      console.error("[Prediction Accuracy Route] Error updating actual points:", error);
      res.status(500).json({ 
        error: "Failed to update actual points",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/prediction-accuracy/backfill/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { fromGameweek, toGameweek } = req.body;
      
      if (isNaN(userId) || !fromGameweek || !toGameweek) {
        return res.status(400).json({ error: "Invalid request parameters" });
      }

      console.log(`[Prediction Accuracy Route] Backfilling actual points for user ${userId}, GW${fromGameweek}-${toGameweek}`);
      
      const updated = await predictionAccuracyService.backfillActualPoints(userId, fromGameweek, toGameweek);
      
      res.json({ success: true, updated, message: `Backfilled ${updated} gameweeks` });
    } catch (error) {
      console.error("[Prediction Accuracy Route] Error backfilling actual points:", error);
      res.status(500).json({ 
        error: "Failed to backfill actual points",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/prediction-accuracy/analyze/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek as string) : undefined;
      const forceRegenerate = req.query.forceRegenerate === 'true';

      if (gameweek) {
        console.log(`[API] Generating AI analysis for GW${gameweek} for user ${userId} (force=${forceRegenerate})`);
      } else {
        console.log(`[API] Generating AI analysis for all completed gameweeks for user ${userId}`);
      }
      
      const results = await predictionAnalysisService.analyzeAllCompletedGameweeks(userId, { gameweek, forceRegenerate });
      
      res.json({ 
        message: `Successfully analyzed ${results.length} gameweeks`,
        analyses: results
      });
    } catch (error) {
      console.error("[API] Error generating analysis:", error);
      res.status(500).json({ 
        error: "Failed to generate prediction analysis",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Prediction Evaluation and Calibration Endpoints
  app.post("/api/prediction-evaluation/evaluate/:gameweek", async (req, res) => {
    try {
      const gameweek = parseInt(req.params.gameweek);
      
      if (isNaN(gameweek)) {
        return res.status(400).json({ error: "Invalid gameweek" });
      }

      console.log(`[Prediction Evaluation] Evaluating predictions for GW${gameweek}`);
      
      await predictionEvaluator.backfillActualPoints(gameweek);
      const evaluation = await predictionEvaluator.evaluateGameweek(gameweek);
      
      res.json(evaluation);
    } catch (error) {
      console.error("[Prediction Evaluation] Error:", error);
      res.status(500).json({ 
        error: "Failed to evaluate predictions",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/prediction-evaluation/evaluate-all", async (req, res) => {
    try {
      console.log(`[Prediction Evaluation] Evaluating all completed gameweeks`);
      
      await predictionEvaluator.evaluateAllCompletedGameweeks();
      const learningContext = await predictionEvaluator.getLearningContext();
      
      res.json({
        message: "Evaluation complete",
        ...learningContext
      });
    } catch (error) {
      console.error("[Prediction Evaluation] Error:", error);
      res.status(500).json({ 
        error: "Failed to evaluate predictions",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/calibration/status", async (req, res) => {
    try {
      const summary = await calibrationService.getCalibrationSummary();
      res.json(summary);
    } catch (error) {
      console.error("[Calibration] Error fetching calibration status:", error);
      res.status(500).json({ 
        error: "Failed to fetch calibration status",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/prediction-learning/context", async (req, res) => {
    try {
      const learningContext = await predictionEvaluator.getLearningContext();
      res.json(learningContext);
    } catch (error) {
      console.error("[Prediction Learning] Error fetching learning context:", error);
      res.status(500).json({ 
        error: "Failed to fetch learning context",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // AI Impact Analysis Endpoints
  app.post("/api/ai-impact/analyze/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID provided" });
      }

      console.log(`[AI Impact Analysis Route] Analyzing all completed gameweeks for user ${userId}`);
      
      const results = await aiImpactAnalysis.analyzeAllCompletedGameweeks(userId);
      
      console.log(`[AI Impact Analysis Route] Analysis complete: ${results.length} gameweeks analyzed`);
      res.json(results);
    } catch (error) {
      console.error("[AI Impact Analysis Route] Error analyzing gameweeks:", error);
      res.status(500).json({ 
        error: "Unable to analyze gameweeks - please try again later",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/ai-impact/analyze-plan/:planId", async (req, res) => {
    try {
      const planId = parseInt(req.params.planId);
      
      if (isNaN(planId)) {
        return res.status(400).json({ error: "Invalid plan ID provided" });
      }

      const plan = await storage.getGameweekPlanById(planId);
      if (!plan) {
        return res.status(404).json({ error: "Gameweek plan not found" });
      }

      console.log(`[AI Impact Analysis Route] Analyzing plan ${planId} for gameweek ${plan.gameweek}`);
      
      const result = await aiImpactAnalysis.analyzeGameweekImpact(planId);
      
      console.log(`[AI Impact Analysis Route] Analysis complete for plan ${planId}: ${result.pointsDelta >= 0 ? '+' : ''}${result.pointsDelta} points`);
      res.json(result);
    } catch (error) {
      console.error("[AI Impact Analysis Route] Error analyzing plan:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      if (errorMessage.includes("not finished")) {
        return res.status(400).json({ 
          error: "Unable to analyze gameweek - please ensure the gameweek has finished",
          details: errorMessage
        });
      }
      
      if (errorMessage.includes("was not applied")) {
        return res.status(400).json({ 
          error: "Cannot analyze plan that was not applied",
          details: errorMessage
        });
      }

      res.status(500).json({ 
        error: "Unable to analyze gameweek plan - please try again later",
        details: errorMessage
      });
    }
  });

  app.get("/api/ai-impact/summary/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID provided" });
      }

      console.log(`[AI Impact Analysis Route] Fetching impact summary for user ${userId}`);
      
      const allPlans = await storage.getGameweekPlansByUser(userId);
      const analyzedPlans = allPlans.filter(plan => 
        plan.analysisCompletedAt !== null && 
        plan.pointsDelta !== null
      );

      if (analyzedPlans.length === 0) {
        return res.json({
          totalGameweeksAnalyzed: 0,
          totalPointsDelta: 0,
          averagePointsDelta: 0,
          positiveImpactCount: 0,
          negativeImpactCount: 0,
          gameweekBreakdown: []
        });
      }

      const totalPointsDelta = analyzedPlans.reduce((sum, plan) => sum + (plan.pointsDelta || 0), 0);
      const averagePointsDelta = totalPointsDelta / analyzedPlans.length;
      const positiveImpactCount = analyzedPlans.filter(plan => (plan.pointsDelta || 0) > 0).length;
      const negativeImpactCount = analyzedPlans.filter(plan => (plan.pointsDelta || 0) < 0).length;

      const gameweekBreakdown = analyzedPlans.map(plan => ({
        planId: plan.id,
        gameweek: plan.gameweek,
        pointsDelta: plan.pointsDelta || 0,
        actualPointsWithAI: plan.actualPointsWithAI || 0,
        actualPointsWithoutAI: plan.actualPointsWithoutAI || 0,
        analysisCompletedAt: plan.analysisCompletedAt,
        status: plan.status,
        transfers: plan.transfers,
        captainId: plan.captainId,
      })).sort((a, b) => a.gameweek - b.gameweek);

      const summary = {
        totalGameweeksAnalyzed: analyzedPlans.length,
        totalPointsDelta: Math.round(totalPointsDelta * 100) / 100,
        averagePointsDelta: Math.round(averagePointsDelta * 100) / 100,
        positiveImpactCount,
        negativeImpactCount,
        gameweekBreakdown
      };

      console.log(`[AI Impact Analysis Route] Summary complete: ${summary.totalGameweeksAnalyzed} gameweeks, ${summary.totalPointsDelta >= 0 ? '+' : ''}${summary.totalPointsDelta} total impact`);
      res.json(summary);
    } catch (error) {
      console.error("[AI Impact Analysis Route] Error fetching summary:", error);
      res.status(500).json({ 
        error: "Unable to fetch impact summary - please try again later",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.get("/api/multi-week-predictions/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid user ID" });
      }

      // Fetch all predictions for this user, sorted by newest first
      const predictions = await db
        .select()
        .from(multiWeekTransferPredictions)
        .where(eq(multiWeekTransferPredictions.userId, userId))
        .orderBy(desc(multiWeekTransferPredictions.createdAt))
        .limit(20);

      // Enrich with player names
      const planningGameweek = await fplApi.getPlanningGameweek();
      const gameweek = planningGameweek?.id || 1;
      const snapshot = await gameweekSnapshot.getSnapshot(gameweek);
      const players = snapshot.data.players;
      
      const enrichedPredictions = predictions.map((pred: MultiWeekTransferPrediction) => {
        const playerIn = players.find(p => p.id === pred.playerInId);
        const playerOut = players.find(p => p.id === pred.playerOutId);
        
        return {
          ...pred,
          playerInName: playerIn?.web_name || 'Unknown',
          playerOutName: playerOut?.web_name || 'Unknown',
          // Calculate progress percentage
          progressPercent: pred.status === 'tracking' 
            ? (pred.weeksElapsed / pred.timeframeWeeks * 100)
            : pred.status === 'completed' ? 100 : 0
        };
      });
      
      res.json(enrichedPredictions);
    } catch (error) {
      console.error('Error fetching multi-week predictions:', error);
      res.status(500).json({ error: 'Failed to fetch multi-week predictions' });
    }
  });

  // User Settings Endpoints
  app.get("/api/ai/provider", async (req, res) => {
    try {
      const hasOpenAI = !!process.env.OPENAI_API_KEY;
      const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

      let provider = "none";
      let model = "Not configured";

      if (hasOpenAI) {
        provider = "openai";
        model = "GPT-4o";
      } else if (hasAnthropic) {
        provider = "anthropic";
        model = "Claude 3.5 Sonnet";
      }

      res.json({
        provider,
        model,
        configured: provider !== "none",
      });
    } catch (error) {
      console.error("Error checking AI provider:", error);
      res.status(500).json({ error: "Failed to check AI provider" });
    }
  });

  app.get("/api/settings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId parameter" });
      }

      const settings = await storage.getUserSettings(userId);
      if (!settings) {
        return res.json({
          manager_id: null,
          risk_tolerance: "balanced",
          auto_captain: false,
          notifications_enabled: false,
        });
      }
      res.json(settings);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId parameter" });
      }
      
      const validatedSettings = userSettingsSchema.parse(req.body);
      const settings = await storage.saveUserSettings(userId, validatedSettings);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid settings data", details: error.errors });
      }
      console.error("Error saving settings:", error);
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // Team Management Endpoints
  app.post("/api/teams", async (req, res) => {
    try {
      const { userId, gameweek, players, formation, teamValue, bank, transfersMade } = req.body;
      
      if (!userId || !gameweek || !players || !formation || teamValue === undefined || bank === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Validate squad is complete (no null player_ids)
      const playersArray = players as Array<{ player_id: number | null; position: number; is_captain: boolean; is_vice_captain: boolean }>;
      const emptySlots = playersArray.filter(p => !p.player_id);
      if (emptySlots.length > 0) {
        const emptyPositions = emptySlots.map(p => p.position).join(', ');
        console.log(`[Teams Route] Rejecting incomplete squad: ${emptySlots.length} empty slot(s) at position(s) ${emptyPositions}`);
        return res.status(400).json({ 
          error: "Incomplete squad",
          details: `Cannot save team with ${emptySlots.length} empty slot(s). Missing positions: ${emptyPositions}. Please fill all 15 positions.`,
          missingPositions: emptySlots.map(p => p.position)
        });
      }

      const team = await storage.saveTeam({
        userId,
        gameweek,
        players,
        formation,
        teamValue,
        bank,
        transfersMade: transfersMade || 0,
        lastDeadlineBank: bank,
      });

      // IMPORTANT: Trigger async plan regeneration when team is saved
      // This ensures Gameweek Planner shows the user's current team, not stale data
      console.log(`[Teams Route] Team saved for user ${userId}, GW${gameweek}. Triggering async plan regeneration...`);
      
      // Fire and forget - don't block the response
      gameweekAnalyzer.analyzeGameweek(userId, gameweek).then((newPlan) => {
        console.log(`[Teams Route] ✅ Plan regenerated after team save: Plan ID ${newPlan.id}`);
      }).catch((err) => {
        console.warn(`[Teams Route] ⚠️ Failed to regenerate plan after team save:`, err.message);
      });

      res.json(team);
    } catch (error) {
      console.error("Error saving team:", error);
      res.status(500).json({ error: "Failed to save team" });
    }
  });

  app.get("/api/teams/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek as string) : undefined;
      
      if (gameweek) {
        const team = await storage.getTeam(userId, gameweek);
        res.json(team || null);
      } else {
        const teams = await storage.getTeamsByUser(userId);
        res.json(teams);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  // Transfer Endpoints
  app.post("/api/transfers", async (req, res) => {
    try {
      const { userId, gameweek, playerInId, playerOutId, cost } = req.body;
      
      if (!userId || !gameweek || !playerInId || !playerOutId || cost === undefined) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const transfer = await storage.saveTransfer({
        userId,
        gameweek,
        playerInId,
        playerOutId,
        cost,
      });

      res.json(transfer);
    } catch (error) {
      console.error("Error saving transfer:", error);
      res.status(500).json({ error: "Failed to save transfer" });
    }
  });

  app.get("/api/transfers/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek as string) : undefined;
      
      if (gameweek) {
        const transfers = await storage.getTransfers(userId, gameweek);
        res.json(transfers);
      } else {
        const transfers = await storage.getTransfersByUser(userId);
        res.json(transfers);
      }
    } catch (error) {
      console.error("Error fetching transfers:", error);
      res.status(500).json({ error: "Failed to fetch transfers" });
    }
  });

  // Performance Tracking Endpoints
  app.get("/api/performance/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek as string) : undefined;
      
      if (!gameweek) {
        return res.status(400).json({ error: "Gameweek parameter is required" });
      }

      const performance = await actualPointsService.getPerformanceComparison(userId, gameweek);
      res.json(performance);
    } catch (error) {
      console.error("Error fetching performance data:", error);
      res.status(500).json({ error: "Failed to fetch performance data" });
    }
  });

  app.post("/api/performance/update-actual", async (req, res) => {
    try {
      const { userId, gameweek } = req.body;
      
      if (!userId || !gameweek) {
        return res.status(400).json({ error: "Missing userId or gameweek" });
      }

      const result = await actualPointsService.updateActualPoints(userId, gameweek);
      res.json(result);
    } catch (error) {
      console.error("Error updating actual points:", error);
      res.status(500).json({ error: "Failed to update actual points" });
    }
  });

  app.get("/api/league-analysis/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek as string) : undefined;
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      const userSettings = await storage.getUserSettings(userId);
      
      if (!userSettings?.manager_id) {
        return res.status(400).json({ error: "Manager ID not configured in user settings" });
      }

      if (!userSettings.primary_league_id) {
        return res.status(400).json({ error: "No primary league configured in user settings" });
      }

      const planningGameweek = await fplApi.getPlanningGameweek();
      const gwToUse = gameweek || planningGameweek?.id || 1;
      
      const snapshot = await gameweekSnapshot.getSnapshot(gwToUse);
      const players = snapshot.data.players;

      const analysis = await leagueAnalysis.analyzeLeague(
        userSettings.primary_league_id,
        userId,
        userSettings.manager_id,
        gwToUse,
        players
      );

      if (!analysis) {
        return res.status(404).json({ error: "Could not analyze league. League may be private or empty." });
      }

      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing league:", error);
      res.status(500).json({ error: "Failed to analyze league" });
    }
  });

  app.get("/api/league-projection/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek as string) : undefined;
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }

      console.log(`[LEAGUE PROJECTION] Fetching projection for user ${userId}, GW ${gameweek}`);

      const userSettings = await storage.getUserSettings(userId);
      
      if (!userSettings?.manager_id) {
        return res.status(400).json({ error: "Manager ID not configured in user settings" });
      }

      if (!userSettings.primary_league_id) {
        return res.status(400).json({ error: "No primary league configured in user settings" });
      }

      const planningGameweek = await fplApi.getPlanningGameweek();
      const gwToUse = gameweek || planningGameweek?.id || 1;
      
      const snapshot = await gameweekSnapshot.getSnapshot(gwToUse);
      const players = snapshot.data.players;
      const teams = snapshot.data.teams;
      const gameweeks = snapshot.data.gameweeks;
      const fixtures = snapshot.data.fixtures.filter((f: any) => f.event === gwToUse);

      console.log(`[LEAGUE PROJECTION] Fetching league standings for league ${userSettings.primary_league_id}`);
      const standings = await fplApi.getLeagueStandings(userSettings.primary_league_id);
      const entries = standings.standings?.results || [];
      
      if (entries.length === 0) {
        return res.status(404).json({ error: "No league standings found" });
      }

      const competitorIds = entries.map((e: any) => e.entry);

      console.log(`[LEAGUE PROJECTION] Predicting points for ${competitorIds.length} competitors`);
      const predictions = await competitorPredictor.predictCompetitorPoints(
        userSettings.primary_league_id,
        competitorIds,
        gwToUse,
        players,
        fixtures,
        teams,
        gameweeks
      );

      const aiPlan = await storage.getGameweekPlan(userId, gwToUse);
      const userPredictedPoints = aiPlan?.predictedPoints;

      console.log(`[LEAGUE PROJECTION] Calculating projections`);
      if (userPredictedPoints) {
        console.log(`[LEAGUE PROJECTION] Using AI plan prediction for user: ${userPredictedPoints} pts`);
      }
      
      const projection = leagueProjection.calculateProjection(
        entries,
        predictions,
        userSettings.manager_id,
        userPredictedPoints,
        gwToUse
      );

      res.json({
        gameweek: gwToUse,
        leagueId: userSettings.primary_league_id,
        ...projection,
      });
    } catch (error) {
      console.error("[LEAGUE PROJECTION] Error:", error);
      res.status(500).json({ error: "Failed to calculate league projection" });
    }
  });

  // Decision Ledger Endpoints
  app.get("/api/decision-ledger/user/:userId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: "Invalid userId" });
      }
      
      const decisions = await storage.getDecisionsByUser(userId, limit);
      res.json({ decisions, count: decisions.length });
    } catch (error) {
      console.error("Error fetching decisions by user:", error);
      res.status(500).json({ error: "Failed to fetch decisions" });
    }
  });

  app.get("/api/decision-ledger/user/:userId/gameweek/:gameweek", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const gameweek = parseInt(req.params.gameweek);
      
      if (isNaN(userId) || isNaN(gameweek)) {
        return res.status(400).json({ error: "Invalid userId or gameweek" });
      }
      
      const decisions = await storage.getDecisionsByGameweek(userId, gameweek);
      res.json({ decisions, count: decisions.length });
    } catch (error) {
      console.error("Error fetching decisions by gameweek:", error);
      res.status(500).json({ error: "Failed to fetch decisions" });
    }
  });

  app.get("/api/decision-ledger/snapshot/:snapshotId", async (req, res) => {
    try {
      const snapshotId = req.params.snapshotId;
      const decisions = await storage.getDecisionsBySnapshot(snapshotId);
      res.json({ decisions, count: decisions.length });
    } catch (error) {
      console.error("Error fetching decisions by snapshot:", error);
      res.status(500).json({ error: "Failed to fetch decisions" });
    }
  });

  app.get("/api/decision-ledger/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid decision ID" });
      }
      
      const decision = await storage.getDecisionById(id);
      if (decision) {
        res.json(decision);
      } else {
        res.status(404).json({ error: "Decision not found" });
      }
    } catch (error) {
      console.error("Error fetching decision by ID:", error);
      res.status(500).json({ error: "Failed to fetch decision" });
    }
  });

  // Monitoring Endpoints
  app.get("/api/monitoring/snapshot-cache", async (req, res) => {
    const status = gameweekSnapshot.getCacheStatus();
    res.json(status);
  });

  app.get("/api/monitoring/precomputation-cache", async (req, res) => {
    const stats = precomputationCache.getStats();
    res.json(stats);
  });

  app.get("/api/monitoring/dashboard", async (req, res) => {
    const snapshotStatus = gameweekSnapshot.getCacheStatus();
    const precomputationStats = precomputationCache.getStats();
    
    res.json({
      snapshot: snapshotStatus,
      precomputation: precomputationStats,
      timestamp: new Date().toISOString()
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
