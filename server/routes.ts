import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fplApi } from "./fpl-api";
import { aiPredictions } from "./ai-predictions";
import { managerSync } from "./manager-sync";
import { actualPointsService } from "./actual-points";
import { z } from "zod";
import { userSettingsSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // FPL Data Endpoints
  app.get("/api/fpl/bootstrap", async (req, res) => {
    try {
      const data = await fplApi.getBootstrapData();
      res.json(data);
    } catch (error) {
      console.error("Error fetching bootstrap data:", error);
      res.status(500).json({ error: "Failed to fetch FPL data" });
    }
  });

  app.get("/api/fpl/players", async (req, res) => {
    try {
      const players = await fplApi.getPlayers();
      res.json(players);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  app.get("/api/fpl/teams", async (req, res) => {
    try {
      const teams = await fplApi.getTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  app.get("/api/fpl/gameweeks", async (req, res) => {
    try {
      const gameweeks = await fplApi.getGameweeks();
      res.json(gameweeks);
    } catch (error) {
      console.error("Error fetching gameweeks:", error);
      res.status(500).json({ error: "Failed to fetch gameweeks" });
    }
  });

  app.get("/api/fpl/fixtures", async (req, res) => {
    try {
      const gameweek = req.query.gameweek ? parseInt(req.query.gameweek as string) : undefined;
      const fixtures = await fplApi.getFixtures(gameweek);
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

      const allPlayers = await fplApi.getPlayers();
      const fixtures = await fplApi.getFixtures();
      
      const recommendations = await aiPredictions.getTransferRecommendations(
        currentPlayers,
        allPlayers,
        fixtures,
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

      const allPlayers = await fplApi.getPlayers();
      const fixtures = await fplApi.getFixtures();
      
      const players = allPlayers.filter(p => playerIds.includes(p.id));
      const recommendations = await aiPredictions.getCaptainRecommendations(players, fixtures);
      
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
      console.log('[ROUTE] Analysis complete, sending response');
      res.json(analysis);
    } catch (error) {
      console.error("Error analyzing team:", error);
      res.status(500).json({ error: "Failed to analyze team" });
    }
  });

  // User Settings Endpoints
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
          preferred_formation: "4-4-2",
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

  const httpServer = createServer(app);
  return httpServer;
}
