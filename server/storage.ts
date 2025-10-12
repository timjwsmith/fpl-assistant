import type { UserSettings } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUserSettings(userId: string): Promise<UserSettings | undefined>;
  saveUserSettings(userId: string, settings: UserSettings): Promise<UserSettings>;
  deleteUserSettings(userId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private settings: Map<string, UserSettings>;

  constructor() {
    this.settings = new Map();
  }

  async getUserSettings(userId: string): Promise<UserSettings | undefined> {
    return this.settings.get(userId);
  }

  async saveUserSettings(userId: string, settings: UserSettings): Promise<UserSettings> {
    this.settings.set(userId, settings);
    return settings;
  }

  async deleteUserSettings(userId: string): Promise<boolean> {
    return this.settings.delete(userId);
  }
}

export const storage = new MemStorage();
