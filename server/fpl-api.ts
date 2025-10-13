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

  async getBootstrapData(): Promise<BootstrapData> {
    const now = Date.now();
    if (this.bootstrapCache && now - this.cacheTimestamp < this.CACHE_DURATION) {
      return this.bootstrapCache;
    }

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
}

export const fplApi = new FPLApiService();
