import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get FPL player shirt image URL (official FPL shirt images)
 * @param teamCode - Team code from FPL API (e.g., 3 for Arsenal)
 * @param size - Image size: 66 (small), 110 (medium), 220 (large)
 */
export function getPlayerShirtUrl(teamCode: number, size: 66 | 110 | 220 = 110): string {
  return `https://fantasy.premierleague.com/dist/img/shirts/standard/shirt_${teamCode}-${size}.png`;
}

/**
 * Get team badge image URL
 * @param teamCode - Team code from FPL API
 */
export function getTeamBadgeUrl(teamCode: number): string {
  return `https://resources.premierleague.com/premierleague/badges/t${teamCode}.png`;
}

/**
 * Get player photo URL (headshot)
 * @param photoCode - Photo code from player data (e.g., "223340.jpg")
 * @param size - Image size
 */
export function getPlayerPhotoUrl(photoCode: string, size: '110x140' | '250x250' = '110x140'): string {
  const cleanCode = photoCode.replace('.jpg', '').replace('.png', '');
  return `https://resources.premierleague.com/premierleague/photos/players/${size}/p${cleanCode}.png`;
}
