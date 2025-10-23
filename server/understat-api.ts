import * as cheerio from 'cheerio';

interface UnderstatPlayerData {
  id: string;
  player_name: string;
  games: string;
  time: string;
  goals: string;
  xG: string;
  assists: string;
  xA: string;
  shots: string;
  key_passes: string;
  yellow_cards: string;
  red_cards: string;
  position: string;
  team_title: string;
  npg: string; // non-penalty goals
  npxG: string; // non-penalty expected goals
  xGChain: string; // total xG of shots in sequences player involved in
  xGBuildup: string; // xG contribution excluding own shots/key passes
}

interface UnderstatCache {
  data: UnderstatPlayerData[];
  timestamp: number;
}

class UnderstatService {
  private cache: Map<string, UnderstatCache> = new Map();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly BASE_URL = 'https://understat.com';

  /**
   * Extract JSON data from Understat page script tags
   */
  private extractJsonFromScript(html: string, variableName: string): any[] {
    const $ = cheerio.load(html);
    const scripts = $('script').toArray();

    for (const script of scripts) {
      const scriptContent = $(script).html();
      if (scriptContent && scriptContent.includes(variableName)) {
        try {
          // Find the JSON.parse() call
          const jsonParseMatch = scriptContent.match(new RegExp(`var ${variableName}\\s*=\\s*JSON\\.parse\\('(.+?)'\\)`));
          if (jsonParseMatch && jsonParseMatch[1]) {
            // Decode the escaped JSON string
            const escapedJson = jsonParseMatch[1];
            const decodedJson = escapedJson
              .replace(/\\x([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
              .replace(/\\'/g, "'")
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
            
            return JSON.parse(decodedJson);
          }
        } catch (error) {
          console.error(`[Understat] Failed to parse ${variableName}:`, error);
        }
      }
    }

    return [];
  }

  /**
   * Get EPL player stats from Understat for a specific season
   */
  async getLeaguePlayers(season: string = '2024'): Promise<UnderstatPlayerData[]> {
    const cacheKey = `epl_${season}`;
    const cached = this.cache.get(cacheKey);

    // Return cached data if valid
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      console.log(`[Understat] Using cached data for ${cacheKey}`);
      return cached.data;
    }

    try {
      console.log(`[Understat] Fetching EPL player data for season ${season}`);
      const url = `${this.BASE_URL}/league/EPL/${season}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Understat request failed: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const playersData = this.extractJsonFromScript(html, 'playersData');

      if (!playersData || playersData.length === 0) {
        console.warn('[Understat] No player data found');
        return [];
      }

      console.log(`[Understat] Successfully fetched ${playersData.length} players`);

      // Cache the results
      this.cache.set(cacheKey, {
        data: playersData,
        timestamp: Date.now(),
      });

      return playersData;
    } catch (error) {
      console.error('[Understat] Error fetching player data:', error);
      // Return cached data even if expired, if available
      if (cached) {
        console.log('[Understat] Returning stale cache due to error');
        return cached.data;
      }
      return [];
    }
  }

  /**
   * Get Understat data for a specific player by name
   */
  async getPlayerByName(playerName: string, season: string = '2024'): Promise<UnderstatPlayerData | null> {
    const players = await this.getLeaguePlayers(season);
    const normalizedName = playerName.toLowerCase().trim();

    // Try exact match first
    let player = players.find(p => p.player_name.toLowerCase() === normalizedName);

    // Try partial match (for names like "Saliba" matching "William Saliba")
    if (!player) {
      player = players.find(p => 
        p.player_name.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(p.player_name.toLowerCase())
      );
    }

    return player || null;
  }

  /**
   * Enrich FPL player data with Understat metrics
   */
  async enrichPlayerData(fplPlayerName: string, season: string = '2024'): Promise<{
    npxG: number;
    xGChain: number;
    xGBuildup: number;
  } | null> {
    const understatPlayer = await this.getPlayerByName(fplPlayerName, season);

    if (!understatPlayer) {
      return null;
    }

    return {
      npxG: parseFloat(understatPlayer.npxG || '0'),
      xGChain: parseFloat(understatPlayer.xGChain || '0'),
      xGBuildup: parseFloat(understatPlayer.xGBuildup || '0'),
    };
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.cache.clear();
    console.log('[Understat] Cache cleared');
  }
}

export const understatService = new UnderstatService();
