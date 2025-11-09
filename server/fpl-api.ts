import type {
  FPLPlayer,
  FPLTeam,
  FPLFixture,
  FPLGameweek,
  FPLManager,
  FPLTeamPicks,
  FPLTransfer,
} from "@shared/schema";

const FPL_BASE_URL = "https://fantasy.premierleague.com/api";

interface BootstrapData {
  elements: FPLPlayer[];
  teams: FPLTeam[];
  events: FPLGameweek[];
  element_types: Array<{
    id: number;
    plural_name: string;
    plural_name_short: string;
    singular_name: string;
    singular_name_short: string;
  }>;
}

class FPLApiService {
  private bootstrapCache: BootstrapData | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  clearCache(): void {
    console.log('[FPL API] Clearing bootstrap cache');
    this.bootstrapCache = null;
    this.cacheTimestamp = 0;
  }

  async getBootstrapData(forceRefresh: boolean = false): Promise<BootstrapData> {
    const now = Date.now();
    if (!forceRefresh && this.bootstrapCache && now - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.bootstrapCache;
    }

    console.log('[FPL API] Fetching fresh bootstrap data from FPL API');
    const response = await fetch(`${FPL_BASE_URL}/bootstrap-static/`);
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.statusText}`);
    }

    const data = await response.json();
    this.bootstrapCache = data;
    this.cacheTimestamp = now;
    return data;
  }

  async getPlayers(): Promise<FPLPlayer[]> {
    const data = await this.getBootstrapData();
    return data.elements;
  }

  async getTeams(): Promise<FPLTeam[]> {
    const data = await this.getBootstrapData();
    return data.teams;
  }

  async getGameweeks(): Promise<FPLGameweek[]> {
    const data = await this.getBootstrapData();
    return data.events;
  }

  async getCurrentGameweek(): Promise<FPLGameweek | undefined> {
    const gameweeks = await this.getGameweeks();
    return gameweeks.find((gw) => gw.is_current);
  }

  async getNextGameweek(): Promise<FPLGameweek | undefined> {
    const gameweeks = await this.getGameweeks();
    return gameweeks.find((gw) => gw.is_next);
  }

  async getPlanningGameweek(): Promise<FPLGameweek | undefined> {
    const gameweeks = await this.getGameweeks();
    const next = gameweeks.find((gw) => gw.is_next);
    const current = gameweeks.find((gw) => gw.is_current);
    
    return next || current;
  }

  async getPositionTypes() {
    const data = await this.getBootstrapData();
    return data.element_types;
  }

  async getFixtures(gameweek?: number): Promise<FPLFixture[]> {
    const url = gameweek
      ? `${FPL_BASE_URL}/fixtures/?event=${gameweek}`
      : `${FPL_BASE_URL}/fixtures/`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getPlayerDetails(playerId: number) {
    const response = await fetch(`${FPL_BASE_URL}/element-summary/${playerId}/`);
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getManagerDetails(managerId: number): Promise<FPLManager> {
    const response = await fetch(`${FPL_BASE_URL}/entry/${managerId}/`);
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getManagerPicks(managerId: number, gameweek: number): Promise<FPLTeamPicks> {
    const response = await fetch(`${FPL_BASE_URL}/entry/${managerId}/event/${gameweek}/picks/`);
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getManagerTransfers(managerId: number): Promise<FPLTransfer[]> {
    const response = await fetch(`${FPL_BASE_URL}/entry/${managerId}/transfers/`);
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getManagerHistory(managerId: number) {
    const response = await fetch(`${FPL_BASE_URL}/entry/${managerId}/history/`);
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getLiveGameweekData(gameweek: number) {
    const response = await fetch(`${FPL_BASE_URL}/event/${gameweek}/live/`);
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.statusText}`);
    }

    return response.json();
  }

  // League Analysis Endpoints
  async getLeagueStandings(leagueId: number, page: number = 1) {
    const response = await fetch(`${FPL_BASE_URL}/leagues-classic/${leagueId}/standings/?page_standings=${page}`);
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getSetPieceTakers() {
    const response = await fetch(`${FPL_BASE_URL}/set-piece-notes/`);
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getDreamTeam(gameweek: number) {
    const response = await fetch(`${FPL_BASE_URL}/dream-team/${gameweek}/`);
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getEventStatus() {
    const response = await fetch(`${FPL_BASE_URL}/event-status/`);
    if (!response.ok) {
      throw new Error(`FPL API error: ${response.statusText}`);
    }

    return response.json();
  }
}

export const fplApi = new FPLApiService();
