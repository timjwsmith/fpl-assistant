import OpenAI from "openai";
import { storage } from "./storage";
import { understatService } from "./understat-api";
import type {
  FPLPlayer,
  FPLFixture,
  FPLTeam,
  TransferRecommendation,
  CaptainRecommendation,
  Prediction,
  ChipStrategy,
} from "@shared/schema";

// Using Replit AI Integrations blueprint - the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

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
    const position = context.player.element_type === 1 ? 'GK' : context.player.element_type === 2 ? 'DEF' : context.player.element_type === 3 ? 'MID' : 'FWD';
    const isDefensive = position === 'GK' || position === 'DEF';
    
    const prompt = `
You are an expert Fantasy Premier League analyst. Predict the expected points for the following player:

Player: ${context.player.web_name}
Position: ${position}
Current Form: ${context.player.form}
Points Per Game: ${context.player.points_per_game}
Total Points: ${context.player.total_points}

ATTACKING METRICS:
- Expected Goals (xG): ${context.player.expected_goals}
- Expected Assists (xA): ${context.player.expected_assists}
- Actual Goals: ${context.player.goals_scored} | Actual Assists: ${context.player.assists}
- Expected Goal Involvements: ${context.player.expected_goal_involvements}

${isDefensive ? `DEFENSIVE METRICS:
- Clean Sheets: ${context.player.clean_sheets}
- Expected Goals Conceded: ${context.player.expected_goals_conceded}
${position === 'GK' ? `- Saves: ${context.player.saves}` : ''}` : ''}

ICT INDEX (Influence/Creativity/Threat):
- Overall ICT: ${context.player.ict_index}
- Influence: ${context.player.influence}
- Creativity: ${context.player.creativity}
- Threat: ${context.player.threat}

BONUS POINTS SYSTEM:
- Total Bonus: ${context.player.bonus}
- BPS Score: ${context.player.bps}

AVAILABILITY:
- Minutes Played: ${context.player.minutes}
- Status: ${context.player.status}
- Chance of Playing: ${context.player.chance_of_playing_this_round !== null ? context.player.chance_of_playing_this_round + '%' : 'Unknown'}
- News: ${context.player.news || 'None'}
- Yellow Cards: ${context.player.yellow_cards} | Red Cards: ${context.player.red_cards}

Upcoming Fixtures (next 3):
${context.upcomingFixtures.slice(0, 3).map((f, i) => `${i + 1}. Difficulty: ${f.team_h_difficulty || f.team_a_difficulty}`).join('\n')}

Based on form, fixtures, underlying stats, ICT metrics, and bonus potential, provide a prediction in JSON format:
{
  "predicted_points": <number>,
  "confidence": <0-100>,
  "reasoning": "<brief explanation>",
  "fixtures_considered": [<fixture_ids>]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 4000,
      temperature: 0, // Deterministic predictions for consistency
    });

    let result;
    try {
      result = JSON.parse(response.choices[0].message.content || "{}");
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
    // Get team data for fixture context
    const { fplApi } = await import("./fpl-api");
    const teams = await fplApi.getTeams();
    
    // Analyze current squad weaknesses
    const squadAnalysis = currentPlayers.map(p => {
      const team = teams.find((t: FPLTeam) => t.id === p.team);
      const upcomingFixtures = fixtures
        .filter((f: FPLFixture) => !f.finished && f.event && f.event >= (gameweek || 1) && (f.team_h === p.team || f.team_a === p.team))
        .slice(0, 3)
        .map((f: FPLFixture) => {
          const isHome = f.team_h === p.team;
          const opponent = teams.find((t: FPLTeam) => t.id === (isHome ? f.team_a : f.team_h));
          const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
          return `${isHome ? 'H' : 'A'} vs ${opponent?.short_name} (Diff: ${difficulty})`;
        });
      
      return {
        id: p.id,
        name: p.web_name,
        team: team?.short_name || 'Unknown',
        position: p.element_type === 1 ? 'GK' : p.element_type === 2 ? 'DEF' : p.element_type === 3 ? 'MID' : 'FWD',
        form: parseFloat(p.form),
        ppg: parseFloat(p.points_per_game),
        price: p.now_cost / 10,
        fixtures: upcomingFixtures.join(', ') || 'No upcoming fixtures',
        status: p.status,
        chanceOfPlaying: p.chance_of_playing_this_round,
        news: p.news || 'None',
        yellowCards: p.yellow_cards,
        ict: parseFloat(p.ict_index || '0'),
        bps: p.bps,
      };
    });

    // Find potential replacements in good form with favorable fixtures
    const potentialTargets = allPlayers
      .filter(p => !currentPlayers.some(cp => cp.id === p.id) && parseFloat(p.form) > 4)
      .slice(0, 20)
      .map(p => {
        const team = teams.find((t: FPLTeam) => t.id === p.team);
        const upcomingFixtures = fixtures
          .filter((f: FPLFixture) => !f.finished && f.event && f.event >= (gameweek || 1) && (f.team_h === p.team || f.team_a === p.team))
          .slice(0, 3)
          .map((f: FPLFixture) => {
            const isHome = f.team_h === p.team;
            const opponent = teams.find((t: FPLTeam) => t.id === (isHome ? f.team_a : f.team_h));
            const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
            return `${isHome ? 'H' : 'A'} vs ${opponent?.short_name} (Diff: ${difficulty})`;
          });
        
        return {
          id: p.id,
          name: p.web_name,
          team: team?.short_name || 'Unknown',
          position: p.element_type === 1 ? 'GK' : p.element_type === 2 ? 'DEF' : p.element_type === 3 ? 'MID' : 'FWD',
          form: parseFloat(p.form),
          ppg: parseFloat(p.points_per_game),
          price: p.now_cost / 10,
          fixtures: upcomingFixtures.join(', ') || 'No upcoming fixtures',
          ict: parseFloat(p.ict_index || '0'),
          xGI: parseFloat(p.expected_goal_involvements || '0'),
          status: p.status,
        };
      });

    const prompt = `You are an expert FPL transfer analyst. Analyze the current squad and recommend the top 3 transfer moves.

CURRENT SQUAD:
${squadAnalysis.map(p => `
${p.name} (${p.position}) - ${p.team}
- Form: ${p.form.toFixed(1)} | PPG: ${p.ppg} | Price: £${p.price}m
- ICT Index: ${p.ict.toFixed(1)} | BPS: ${p.bps}
- Status: ${p.status}${p.chanceOfPlaying !== null ? ` (${p.chanceOfPlaying}% chance)` : ''}
- News: ${p.news}
- Cards: ${p.yellowCards} yellow
- Fixtures: ${p.fixtures}
`).join('\n')}

BUDGET AVAILABLE: £${budget.toFixed(1)}m

TOP TARGETS IN FORM:
${potentialTargets.slice(0, 10).map(p => `
${p.name} (${p.position}) - ${p.team}
- Form: ${p.form.toFixed(1)} | PPG: ${p.ppg} | Price: £${p.price}m
- ICT Index: ${p.ict.toFixed(1)} | xGI: ${p.xGI.toFixed(2)}
- Status: ${p.status}
- Fixtures: ${p.fixtures}
`).join('\n')}

TRANSFER STRATEGY:
1. Identify underperforming players (low PPG/form), injury concerns, or difficult fixtures
2. Consider suspension risk (players on 4 yellows)
3. Find in-form replacements with high ICT index and favorable upcoming fixtures
4. Ensure affordability within the budget
5. Prioritize consistency (PPG) and expected goal involvements (xGI)

Provide exactly 3 transfer recommendations in this JSON format:
{
  "recommendations": [
    {
      "player_out_id": <id to transfer out>,
      "player_in_id": <id to bring in>,
      "expected_points_gain": <expected additional points over next 3 GWs>,
      "reasoning": "<brief explanation focusing on consistency, fixtures, injuries, and ICT metrics>",
      "priority": "high|medium|low",
      "cost_impact": <price difference (positive = money saved, negative = money spent)>
    }
  ]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 4000,
        temperature: 0, // Deterministic predictions for consistency
      });

      const result = JSON.parse(response.choices[0].message.content || "{ \"recommendations\": [] }");
      console.log('[AI] Transfer recommendations result:', JSON.stringify(result, null, 2));
      
      const recommendations = Array.isArray(result.recommendations) ? result.recommendations : [];

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
    } catch (error) {
      console.error("Error in transfer recommendations:", error);
      return [];
    }
  }

  async getCaptainRecommendations(
    players: FPLPlayer[],
    fixtures: FPLFixture[],
    userId?: number,
    gameweek?: number
  ): Promise<CaptainRecommendation[]> {
    // Get team data for fixture context
    const { fplApi } = await import("./fpl-api");
    const teams = await fplApi.getTeams();
    
    // Filter and enrich top players with fixture data
    const topPlayers = players
      .filter(p => parseFloat(p.form) > 3 && p.total_points > 20)
      .slice(0, 15)
      .map(p => {
        const team = teams.find((t: FPLTeam) => t.id === p.team);
        const nextFixture = fixtures.find((f: FPLFixture) => 
          !f.finished && f.event === gameweek && (f.team_h === p.team || f.team_a === p.team)
        );
        
        let fixtureInfo = 'No fixture';
        if (nextFixture) {
          const isHome = nextFixture.team_h === p.team;
          const opponent = teams.find((t: FPLTeam) => t.id === (isHome ? nextFixture.team_a : nextFixture.team_h));
          const difficulty = isHome ? nextFixture.team_h_difficulty : nextFixture.team_a_difficulty;
          fixtureInfo = `${isHome ? 'H' : 'A'} vs ${opponent?.short_name} (Diff: ${difficulty})`;
        }
        
        return {
          id: p.id,
          name: p.web_name,
          team: team?.short_name || 'Unknown',
          form: parseFloat(p.form),
          ppg: parseFloat(p.points_per_game),
          totalPoints: p.total_points,
          ownership: parseFloat(p.selected_by_percent),
          expectedGoals: parseFloat(p.expected_goals || '0'),
          expectedAssists: parseFloat(p.expected_assists || '0'),
          ict: parseFloat(p.ict_index || '0'),
          influence: parseFloat(p.influence || '0'),
          creativity: parseFloat(p.creativity || '0'),
          threat: parseFloat(p.threat || '0'),
          bps: p.bps,
          bonus: p.bonus,
          fixture: fixtureInfo,
        };
      });

    const prompt = `You are an expert Fantasy Premier League captain analyst. Analyze these players and recommend the top 3 captain choices for gameweek ${gameweek || 'upcoming'}.

CANDIDATES:
${topPlayers.map(p => `
${p.name} (${p.team})
- Form: ${p.form.toFixed(1)} | PPG: ${p.ppg} | Total Points: ${p.totalPoints}
- Fixture: ${p.fixture}
- Ownership: ${p.ownership.toFixed(1)}% ${p.ownership < 20 ? '(DIFFERENTIAL)' : '(TEMPLATE)'}
- xG: ${p.expectedGoals.toFixed(2)} | xA: ${p.expectedAssists.toFixed(2)}
- ICT Index: ${p.ict.toFixed(1)} (I: ${p.influence.toFixed(1)}, C: ${p.creativity.toFixed(1)}, T: ${p.threat.toFixed(1)})
- BPS: ${p.bps} | Total Bonus: ${p.bonus}
`).join('\n')}

ANALYSIS CRITERIA:
1. Fixture difficulty and home/away advantage
2. Current form (PPG) and recent performances
3. Expected goals/assists (xG/xA) and goal involvement potential
4. ICT Index - high Threat/Creativity = higher ceiling
5. BPS potential - high BPS players often get bonus points (3/2/1 pts)
6. Ownership % - consider differentials (<20%) vs safe picks for rank climbing
7. Consistency vs ceiling - PPG shows consistency, ICT shows upside

Provide exactly 3 captain recommendations in this JSON format:
{
  "recommendations": [
    {
      "player_id": <id>,
      "expected_points": <realistic points estimate>,
      "confidence": <0-100>,
      "reasoning": "<concise explanation focusing on fixtures, form, BPS potential, and ownership strategy>",
      "differential": <true if ownership < 20%, false otherwise>,
      "ownership_percent": <ownership %>
    }
  ]
}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 4000,
        temperature: 0, // Deterministic predictions for consistency
      });

      const result = JSON.parse(response.choices[0].message.content || "{ \"recommendations\": [] }");
      console.log('[AI] Captain recommendations result:', JSON.stringify(result, null, 2));
      
      const recommendations = Array.isArray(result.recommendations) ? result.recommendations : [];

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
    } catch (error) {
      console.error("Error in captain recommendations:", error);
      return [];
    }
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

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
      temperature: 0, // Deterministic predictions for consistency
    });

    let result;
    try {
      result = JSON.parse(response.choices[0].message.content || "{ \"strategies\": [] }");
    } catch (error) {
      console.error("Failed to parse AI response for chip strategy:", error);
      result = { strategies: [] };
    }
    return result.strategies || [];
  }

  async analyzeTeamCompositionStream(
    players: FPLPlayer[],
    formation: string,
    onChunk: (data: string) => void
  ): Promise<void> {
    const { fplApi } = await import("./fpl-api");
    const fixtures = await fplApi.getFixtures();
    const teams = await fplApi.getTeams();
    
    // Fetch Understat data for all players in parallel
    const understatDataPromises = players.map(p => 
      understatService.enrichPlayerData(p.web_name).catch(() => null)
    );
    const understatDataResults = await Promise.all(understatDataPromises);
    
    const playerDetails = players.map((p, index) => {
      const team = teams.find((t: FPLTeam) => t.id === p.team);
      const position = p.element_type === 1 ? 'GK' : p.element_type === 2 ? 'DEF' : p.element_type === 3 ? 'MID' : 'FWD';
      const isDefensive = position === 'GK' || position === 'DEF';
      const upcomingFixtures = fixtures
        .filter((f: FPLFixture) => !f.finished && f.event && (f.team_h === p.team || f.team_a === p.team))
        .slice(0, 3)
        .map((f: FPLFixture) => {
          const isHome = f.team_h === p.team;
          const opponent = teams.find((t: FPLTeam) => t.id === (isHome ? f.team_a : f.team_h));
          const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
          return `${isHome ? 'H' : 'A'} vs ${opponent?.short_name} (Diff: ${difficulty})`;
        });
      
      const understatData = understatDataResults[index];
      
      return {
        name: p.web_name,
        position,
        team: team?.short_name || 'Unknown',
        form: parseFloat(p.form),
        ppg: parseFloat(p.points_per_game),
        totalPoints: p.total_points,
        price: p.now_cost / 10,
        upcomingFixtures,
        selectedBy: parseFloat(p.selected_by_percent),
        expectedGoals: parseFloat(p.expected_goals || '0'),
        expectedAssists: parseFloat(p.expected_assists || '0'),
        ict: parseFloat(p.ict_index || '0'),
        bps: p.bps,
        cleanSheets: isDefensive ? p.clean_sheets : undefined,
        expectedGoalsConceded: isDefensive ? parseFloat(p.expected_goals_conceded || '0') : undefined,
        // Understat advanced metrics (null if not available)
        npxG: understatData?.npxG,
        xGChain: understatData?.xGChain,
        xGBuildup: understatData?.xGBuildup,
      };
    });

    const prompt = `You are an expert Fantasy Premier League analyst. Analyze this team and provide concise insights.

TEAM:
Formation: ${formation} | Value: £${(players.reduce((sum, p) => sum + p.now_cost, 0) / 10).toFixed(1)}m

PLAYERS:
${playerDetails.map(p => {
  const baseInfo = `${p.name} (${p.position}) ${p.team}: Form ${p.form.toFixed(1)} | PPG ${p.ppg} | ICT ${p.ict.toFixed(1)}`;
  const attackInfo = `xG ${p.expectedGoals.toFixed(1)} xA ${p.expectedAssists.toFixed(1)}`;
  const understatInfo = p.npxG !== undefined && p.npxG !== null ? ` npxG ${p.npxG.toFixed(1)} xGChain ${p.xGChain?.toFixed(1)} xGBuild ${p.xGBuildup?.toFixed(1)}` : '';
  const defenseInfo = p.cleanSheets !== undefined ? `CS ${p.cleanSheets} xGC ${p.expectedGoalsConceded?.toFixed(1)}` : '';
  const fixtureInfo = p.upcomingFixtures[0] || 'No fixtures';
  return `${baseInfo} | ${defenseInfo || attackInfo}${understatInfo} | ${fixtureInfo}`;
}).join('\n')}

Provide 3 BRIEF insights (max 2 sentences each):
1. Team balance, formation fit, and defensive coverage
2. Best fixtures, attack threat, and top differential picks
3. Transfer priority based on PPG, ICT index, and fixture difficulty

JSON format (be concise):
{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "predicted_points": <number>,
  "confidence": <0-100>
}`;

    try {
      console.log('[AI STREAM] Starting stream for', players.length, 'players');
      
      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 4000,
        temperature: 0, // Deterministic predictions for consistency
        stream: true,
      });

      let fullContent = '';
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullContent += content;
          onChunk(content);
        }
      }

      console.log('[AI STREAM] Complete. Full response:', fullContent);
      
      try {
        const result = JSON.parse(fullContent);
        onChunk('\n[DONE]');
        console.log('[AI STREAM] Parsed result:', result.predicted_points, 'pts,', result.confidence, '% confidence');
      } catch (parseError) {
        console.error('[AI STREAM] Failed to parse final result:', parseError);
        onChunk('\n[ERROR]');
      }
    } catch (error) {
      console.error('[AI STREAM] Error:', error);
      onChunk('\n[ERROR]');
    }
  }

  async analyzeTeamComposition(
    players: FPLPlayer[],
    formation: string
  ): Promise<{ insights: string[]; predicted_points: number; confidence: number }> {
    // Get upcoming fixtures and team data for comprehensive analysis
    const { fplApi } = await import("./fpl-api");
    const fixtures = await fplApi.getFixtures();
    const teams = await fplApi.getTeams();
    
    // Fetch Understat data for all players in parallel
    const understatDataPromises = players.map(p => 
      understatService.enrichPlayerData(p.web_name).catch(() => null)
    );
    const understatDataResults = await Promise.all(understatDataPromises);
    
    // Build detailed player analysis
    const playerDetails = players.map((p, index) => {
      const team = teams.find((t: FPLTeam) => t.id === p.team);
      const position = p.element_type === 1 ? 'GK' : p.element_type === 2 ? 'DEF' : p.element_type === 3 ? 'MID' : 'FWD';
      const isDefensive = position === 'GK' || position === 'DEF';
      const upcomingFixtures = fixtures
        .filter((f: FPLFixture) => !f.finished && f.event && (f.team_h === p.team || f.team_a === p.team))
        .slice(0, 3)
        .map((f: FPLFixture) => {
          const isHome = f.team_h === p.team;
          const opponent = teams.find((t: FPLTeam) => t.id === (isHome ? f.team_a : f.team_h));
          const difficulty = isHome ? f.team_h_difficulty : f.team_a_difficulty;
          return `${isHome ? 'H' : 'A'} vs ${opponent?.short_name} (Diff: ${difficulty})`;
        });
      
      const understatData = understatDataResults[index];
      
      return {
        name: p.web_name,
        position,
        team: team?.short_name || 'Unknown',
        form: parseFloat(p.form),
        ppg: parseFloat(p.points_per_game),
        totalPoints: p.total_points,
        price: p.now_cost / 10,
        upcomingFixtures,
        selectedBy: parseFloat(p.selected_by_percent),
        expectedGoals: parseFloat(p.expected_goals || '0'),
        expectedAssists: parseFloat(p.expected_assists || '0'),
        ict: parseFloat(p.ict_index || '0'),
        bps: p.bps,
        cleanSheets: isDefensive ? p.clean_sheets : undefined,
        expectedGoalsConceded: isDefensive ? parseFloat(p.expected_goals_conceded || '0') : undefined,
        // Understat advanced metrics (null if not available)
        npxG: understatData?.npxG,
        xGChain: understatData?.xGChain,
        xGBuildup: understatData?.xGBuildup,
      };
    });

    const prompt = `You are an expert Fantasy Premier League analyst. Analyze this team and provide concise insights.

TEAM:
Formation: ${formation} | Value: £${(players.reduce((sum, p) => sum + p.now_cost, 0) / 10).toFixed(1)}m

PLAYERS:
${playerDetails.map(p => {
  const baseInfo = `${p.name} (${p.position}) ${p.team}: Form ${p.form.toFixed(1)} | PPG ${p.ppg} | ICT ${p.ict.toFixed(1)}`;
  const attackInfo = `xG ${p.expectedGoals.toFixed(1)} xA ${p.expectedAssists.toFixed(1)}`;
  const understatInfo = p.npxG !== undefined && p.npxG !== null ? ` npxG ${p.npxG.toFixed(1)} xGChain ${p.xGChain?.toFixed(1)} xGBuild ${p.xGBuildup?.toFixed(1)}` : '';
  const defenseInfo = p.cleanSheets !== undefined ? `CS ${p.cleanSheets} xGC ${p.expectedGoalsConceded?.toFixed(1)}` : '';
  const fixtureInfo = p.upcomingFixtures[0] || 'No fixtures';
  return `${baseInfo} | ${defenseInfo || attackInfo}${understatInfo} | ${fixtureInfo}`;
}).join('\n')}

Provide 3 BRIEF insights (max 2 sentences each):
1. Team balance, formation fit, and defensive coverage
2. Best fixtures, attack threat, and top differential picks
3. Transfer priority based on PPG, ICT index, and fixture difficulty

JSON format (be concise):
{
  "insights": ["insight 1", "insight 2", "insight 3"],
  "predicted_points": <number>,
  "confidence": <0-100>
}`;

    try {
      console.log('[AI] Analyzing team with', players.length, 'players');
      console.log('[AI] Prompt:', prompt);
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 4000,
        temperature: 0, // Deterministic predictions for consistency
      });

      console.log('[AI] Full response:', JSON.stringify(response, null, 2));
      console.log('[AI] Choices:', response.choices);
      console.log('[AI] First choice:', response.choices[0]);
      console.log('[AI] Message:', response.choices[0]?.message);
      
      const rawContent = response.choices[0]?.message?.content || "{}";
      console.log('[AI] Raw response content:', rawContent);
      const result = JSON.parse(rawContent);
      console.log('[AI] Parsed result:', JSON.stringify(result));
      console.log('[AI] Team analysis complete:', result.predicted_points, 'pts,', result.confidence, '% confidence');
      
      return {
        insights: Array.isArray(result.insights) ? result.insights : [],
        predicted_points: typeof result.predicted_points === 'number' ? result.predicted_points : 0,
        confidence: typeof result.confidence === 'number' ? result.confidence : 50,
      };
    } catch (error) {
      console.error("Error in team composition analysis:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      return {
        insights: ["Unable to generate AI insights at this time"],
        predicted_points: 0,
        confidence: 0,
      };
    }
  }
}

export const aiPredictions = new AIPredictionService();
