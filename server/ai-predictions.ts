import { getAIJsonResponse } from "./ai-client";
import { storage } from "./storage";
import type {
  FPLPlayer,
  FPLFixture,
  TransferRecommendation,
  CaptainRecommendation,
  Prediction,
  ChipStrategy,
} from "@shared/schema";

interface PredictionContext {
  player: FPLPlayer;
  upcomingFixtures: FPLFixture[];
  userId?: number;
  gameweek?: number;
  teamStrength?: {
    attack_home: number;
    attack_away: number;
    defence_home: number;
    defence_away: number;
  };
}

export class AIPredictionService {
  async predictPlayerPoints(context: PredictionContext): Promise<Prediction> {
    const prompt = `
You are an expert Fantasy Premier League analyst. Predict the expected points for the following player:

Player: ${context.player.web_name}
Position: ${context.player.element_type === 1 ? 'GK' : context.player.element_type === 2 ? 'DEF' : context.player.element_type === 3 ? 'MID' : 'FWD'}
Current Form: ${context.player.form}
Total Points: ${context.player.total_points}
Expected Goals (xG): ${context.player.expected_goals}
Expected Assists (xA): ${context.player.expected_assists}
Minutes Played: ${context.player.minutes}
Status: ${context.player.status}

Upcoming Fixtures (next 3):
${context.upcomingFixtures.slice(0, 3).map((f, i) => `${i + 1}. Difficulty: ${f.team_h_difficulty || f.team_a_difficulty}`).join('\n')}

Based on form, fixtures, and underlying stats, provide a prediction in JSON format:
{
  "predicted_points": <number>,
  "confidence": <0-100>,
  "reasoning": "<brief explanation>",
  "fixtures_considered": [<fixture_ids>]
}
`;

    let result;
    try {
      const content = await getAIJsonResponse(prompt, 500);
      result = JSON.parse(content || "{}");
    } catch (error) {
      console.error("Failed to parse AI response for player points prediction:", error);
      result = {};
    }

    const prediction: Prediction = {
      player_id: context.player.id,
      predicted_points: result.predicted_points || 0,
      confidence: result.confidence || 50,
      reasoning: result.reasoning || "Analysis based on current form and fixtures",
      fixtures_considered: result.fixtures_considered || context.upcomingFixtures.slice(0, 3).map(f => f.id),
    };

    if (context.userId && context.gameweek) {
      try {
        await storage.upsertPrediction({
          userId: context.userId,
          gameweek: context.gameweek,
          playerId: context.player.id,
          predictedPoints: prediction.predicted_points,
          actualPoints: null,
          confidence: prediction.confidence,
        });
      } catch (error) {
        console.error('Error saving prediction to database:', error);
      }
    }

    return prediction;
  }

  async getTransferRecommendations(
    currentPlayers: FPLPlayer[],
    allPlayers: FPLPlayer[],
    fixtures: FPLFixture[],
    budget: number,
    userId?: number,
    gameweek?: number
  ): Promise<TransferRecommendation[]> {
    const prompt = `
You are a Fantasy Premier League transfer expert. Analyze the current squad and suggest the top 3 transfer recommendations.

Current Squad (summarized):
${currentPlayers.slice(0, 5).map(p => `- ${p.web_name}: ${p.form} form, ${p.total_points} pts`).join('\n')}

Budget Available: £${budget}m

Consider:
1. Players in poor form or with tough fixtures ahead
2. In-form players with good upcoming fixtures
3. Price changes and value
4. Injury concerns

Provide 3 transfer recommendations in JSON format:
{
  "recommendations": [
    {
      "player_out_id": <id>,
      "player_in_id": <id>,
      "expected_points_gain": <number>,
      "reasoning": "<explanation>",
      "priority": "high|medium|low",
      "cost_impact": <number>
    }
  ]
}
`;

    let result;
    try {
      const content = await getAIJsonResponse(prompt, 1000);
      result = JSON.parse(content || '{ "recommendations": [] }');
    } catch (error) {
      console.error("Failed to parse AI response for transfer recommendations:", error);
      result = { recommendations: [] };
    }
    const recommendations = result.recommendations || [];

    if (userId && gameweek && recommendations.length > 0) {
      for (const rec of recommendations) {
        try {
          const playerIn = allPlayers.find(p => p.id === rec.player_in_id);
          if (playerIn) {
            const upcomingFixtures = fixtures.filter(f => f.event && f.event >= gameweek).slice(0, 3);
            const prediction = await this.predictPlayerPoints({
              player: playerIn,
              upcomingFixtures,
              userId,
              gameweek,
            });

            await storage.upsertPrediction({
              userId,
              gameweek,
              playerId: rec.player_in_id,
              predictedPoints: prediction.predicted_points,
              actualPoints: null,
              confidence: rec.priority === 'high' ? 80 : rec.priority === 'medium' ? 60 : 40,
            });
          }
        } catch (error) {
          console.error(`Error saving transfer recommendation prediction for player ${rec.player_in_id}:`, error);
        }
      }
    }

    return recommendations;
  }

  async getCaptainRecommendations(
    players: FPLPlayer[],
    fixtures: FPLFixture[],
    userId?: number,
    gameweek?: number
  ): Promise<CaptainRecommendation[]> {
    const topPlayers = players
      .filter(p => parseFloat(p.form) > 4 && p.total_points > 30)
      .slice(0, 10);

    const prompt = `
You are a Fantasy Premier League captain selection expert. Recommend the top 3 captain choices for the upcoming gameweek.

Top Candidates:
${topPlayers.map(p => `- ${p.web_name}: ${p.form} form, ${p.total_points} pts, ${parseFloat(p.selected_by_percent).toFixed(1)}% owned`).join('\n')}

Analyze based on:
1. Current form and momentum
2. Fixture difficulty
3. Expected goals/assists
4. Ownership (for differential picks)
5. Historical performance

Provide 3 captain recommendations in JSON format:
{
  "recommendations": [
    {
      "player_id": <id>,
      "expected_points": <number>,
      "confidence": <0-100>,
      "reasoning": "<explanation>",
      "differential": <boolean>,
      "ownership_percent": <number>
    }
  ]
}
`;

    let result;
    try {
      const content = await getAIJsonResponse(prompt, 1000);
      result = JSON.parse(content || '{ "recommendations": [] }');
    } catch (error) {
      console.error("Failed to parse AI response for captain recommendations:", error);
      result = { recommendations: [] };
    }
    const recommendations = result.recommendations || [];

    if (userId && gameweek && recommendations.length > 0) {
      for (const rec of recommendations) {
        try {
          await storage.upsertPrediction({
            userId,
            gameweek,
            playerId: rec.player_id,
            predictedPoints: Math.round(rec.expected_points),
            actualPoints: null,
            confidence: rec.confidence,
          });
        } catch (error) {
          console.error(`Error saving captain recommendation prediction for player ${rec.player_id}:`, error);
        }
      }
    }

    return recommendations;
  }

  async getChipStrategy(
    currentGameweek: number,
    remainingChips: string[]
  ): Promise<ChipStrategy[]> {
    const prompt = `
You are a Fantasy Premier League chip strategy expert. Recommend when to use the following chips for maximum value:

Current Gameweek: ${currentGameweek}
Remaining Chips: ${remainingChips.join(', ')}

Chips Available:
- Wildcard: Unlimited free transfers for one GW
- Triple Captain: Captain scores 3x instead of 2x
- Bench Boost: All 15 players score points
- Free Hit: Unlimited transfers for one GW, team reverts after

Consider:
1. Double gameweeks (typically GW24, GW37)
2. Blank gameweeks (fewer teams playing)
3. Fixture swings
4. Team value and planning time

Provide chip strategy in JSON format:
{
  "strategies": [
    {
      "chip_name": "wildcard|freehit|benchboost|triplecaptain",
      "recommended_gameweek": <number>,
      "reasoning": "<explanation>",
      "expected_value": <number>,
      "confidence": <0-100>
    }
  ]
}
`;

    let result;
    try {
      const content = await getAIJsonResponse(prompt, 1000);
      result = JSON.parse(content || '{ "strategies": [] }');
    } catch (error) {
      console.error("Failed to parse AI response for chip strategy:", error);
      result = { strategies: [] };
    }
    return result.strategies || [];
  }

  async analyzeTeamComposition(
    players: FPLPlayer[],
    formation: string
  ): Promise<{ insights: string[]; predicted_points: number; confidence: number }> {
    const prompt = `
You are a Fantasy Premier League team analyst. Analyze this team composition:

Formation: ${formation}
Players: ${players.map(p => `${p.web_name} (${p.element_type === 1 ? 'GK' : p.element_type === 2 ? 'DEF' : p.element_type === 3 ? 'MID' : 'FWD'})`).join(', ')}

Total Team Value: £${players.reduce((sum, p) => sum + p.now_cost, 0) / 10}m
Average Form: ${(players.reduce((sum, p) => sum + parseFloat(p.form), 0) / players.length).toFixed(2)}

Provide analysis in JSON format:
{
  "insights": ["<insight1>", "<insight2>", "<insight3>"],
  "predicted_points": <number>,
  "confidence": <0-100>
}
`;

    let result;
    try {
      const content = await getAIJsonResponse(prompt, 500);
      result = JSON.parse(content || "{}");
    } catch (error) {
      console.error("Failed to parse AI response for team composition analysis:", error);
      result = {};
    }
    return {
      insights: result.insights || [],
      predicted_points: result.predicted_points || 0,
      confidence: result.confidence || 50,
    };
  }
}

export const aiPredictions = new AIPredictionService();
