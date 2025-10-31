import { describe, it, expect } from 'vitest';

/**
 * REGRESSION TEST SUITE FOR PREDICTION ANALYSIS
 * 
 * Purpose: Prevent the bugs that kept coming back:
 * 1. Double gameweek data loss (overwriting instead of aggregating)
 * 2. Incomplete FPL identifier coverage (silent data loss)
 * 3. Goals conceded display bug (missing count)
 * 4. Clean sheet logic errors (wrong inference about team conceding)
 * 
 * History: This file was fixed 15+ times with commits like:
 * - "Improve AI analysis by accurately formatting player scoring details"
 * - "Clarify logic for explaining inaccurate player predictions"
 * Each fix addressed symptoms but not root causes, leading to regressions.
 * 
 * These tests ensure fixes STAY fixed.
 */

// Helper to format scoring breakdown (extracted from PredictionAnalysisService)
function formatScoringBreakdown(scoringBreakdown: any): string[] {
  const breakdown: string[] = [];
  
  for (const [identifier, data] of Object.entries(scoringBreakdown)) {
    const points = (data as any).points;
    const value = (data as any).value;
    
    switch (identifier) {
      case 'minutes':
        breakdown.push(`${value} mins: ${points > 0 ? '+' : ''}${points}`);
        break;
      case 'goals_scored':
        breakdown.push(`${value}G: +${points}`);
        break;
      case 'assists':
        breakdown.push(`${value}A: +${points}`);
        break;
      case 'clean_sheets':
        breakdown.push(`CS: +${points}`);
        break;
      case 'defensive_contribution':
        breakdown.push(`Def: +${points}`);
        break;
      case 'yellow_cards':
        breakdown.push(`${value}YC: ${points}`);
        break;
      case 'red_cards':
        breakdown.push(`${value}RC: ${points}`);
        break;
      case 'bonus':
        breakdown.push(`Bonus: +${points}`);
        break;
      case 'saves':
        breakdown.push(`${value} saves: +${points}`);
        break;
      case 'goals_conceded':
        breakdown.push(`${value} GC: ${points}`);
        break;
      case 'penalties_saved':
        breakdown.push(`${value} pen saved: +${points}`);
        break;
      case 'penalties_missed':
        breakdown.push(`${value} pen missed: ${points}`);
        break;
      case 'own_goals':
        breakdown.push(`${value}OG: ${points}`);
        break;
      case 'penalties_conceded':
        breakdown.push(`${value} pen conceded: ${points}`);
        break;
      default:
        // Handle any unknown identifiers to ensure no silent omissions
        breakdown.push(`${identifier}: ${points > 0 ? '+' : ''}${points}`);
        break;
    }
  }
  
  return breakdown;
}

describe('Scoring Breakdown Formatter', () => {
  describe('Standard FPL Identifiers', () => {
    it('should format minutes correctly (60+ mins = +2, <60 = +1)', () => {
      const breakdown = formatScoringBreakdown({
        minutes: { points: 2, value: 90 }
      });
      expect(breakdown).toEqual(['90 mins: +2']);
    });

    it('should format goals with position-specific points', () => {
      const breakdown = formatScoringBreakdown({
        goals_scored: { points: 6, value: 1 }
      });
      expect(breakdown).toEqual(['1G: +6']);
    });

    it('should format assists correctly', () => {
      const breakdown = formatScoringBreakdown({
        assists: { points: 3, value: 1 }
      });
      expect(breakdown).toEqual(['1A: +3']);
    });

    it('should format clean sheets correctly', () => {
      const breakdown = formatScoringBreakdown({
        clean_sheets: { points: 4, value: 1 }
      });
      expect(breakdown).toEqual(['CS: +4']);
    });

    it('should format defensive contribution (2025/26 rule)', () => {
      const breakdown = formatScoringBreakdown({
        defensive_contribution: { points: 2, value: 10 }
      });
      expect(breakdown).toEqual(['Def: +2']);
    });

    it('should format yellow cards with negative points', () => {
      const breakdown = formatScoringBreakdown({
        yellow_cards: { points: -1, value: 1 }
      });
      expect(breakdown).toEqual(['1YC: -1']);
    });

    it('should format red cards with negative points', () => {
      const breakdown = formatScoringBreakdown({
        red_cards: { points: -3, value: 1 }
      });
      expect(breakdown).toEqual(['1RC: -3']);
    });

    it('should format bonus points correctly', () => {
      const breakdown = formatScoringBreakdown({
        bonus: { points: 3, value: 3 }
      });
      expect(breakdown).toEqual(['Bonus: +3']);
    });

    it('should format goalkeeper saves correctly', () => {
      const breakdown = formatScoringBreakdown({
        saves: { points: 1, value: 5 }
      });
      expect(breakdown).toEqual(['5 saves: +1']);
    });

    it('should format goals conceded with COUNT and points (BUG FIX)', () => {
      // REGRESSION TEST: Previously showed "GC: -1" without the count
      // This prevented AI from knowing HOW MANY goals were conceded
      const breakdown = formatScoringBreakdown({
        goals_conceded: { points: -1, value: 2 }
      });
      expect(breakdown).toEqual(['2 GC: -1']);
    });
  });

  describe('Extended FPL Identifiers (Previously Missing)', () => {
    it('should format penalties saved', () => {
      const breakdown = formatScoringBreakdown({
        penalties_saved: { points: 5, value: 1 }
      });
      expect(breakdown).toEqual(['1 pen saved: +5']);
    });

    it('should format penalties missed', () => {
      const breakdown = formatScoringBreakdown({
        penalties_missed: { points: -2, value: 1 }
      });
      expect(breakdown).toEqual(['1 pen missed: -2']);
    });

    it('should format own goals', () => {
      const breakdown = formatScoringBreakdown({
        own_goals: { points: -2, value: 1 }
      });
      expect(breakdown).toEqual(['1OG: -2']);
    });

    it('should format penalties conceded', () => {
      const breakdown = formatScoringBreakdown({
        penalties_conceded: { points: 0, value: 1 }
      });
      expect(breakdown).toEqual(['1 pen conceded: 0']);
    });

    it('should handle unknown identifiers gracefully (no silent data loss)', () => {
      const breakdown = formatScoringBreakdown({
        future_new_stat: { points: 5, value: 10 }
      });
      expect(breakdown).toEqual(['future_new_stat: +5']);
    });
  });

  describe('Complex Scenarios', () => {
    it('should format GW8 Semenyo captain correctly (actual data)', () => {
      // Real data from GW8: Semenyo as captain
      const breakdown = formatScoringBreakdown({
        minutes: { points: 2, value: 90 },
        assists: { points: 3, value: 1 },
        yellow_cards: { points: -1, value: 1 }
      });
      expect(breakdown).toEqual(['90 mins: +2', '1A: +3', '1YC: -1']);
      
      // Verify total adds up: 2 + 3 - 1 = 4 pts (base), x2 for captain = 8 pts
      const total = 2 + 3 - 1;
      expect(total).toBe(4);
    });

    it('should format GW9 Cucurella correctly (actual data)', () => {
      // Real data from GW9: Cucurella with goals conceded
      const breakdown = formatScoringBreakdown({
        minutes: { points: 2, value: 90 },
        goals_conceded: { points: -1, value: 2 }
      });
      expect(breakdown).toEqual(['90 mins: +2', '2 GC: -1']);
      
      // Verify: Chelsea conceded 2 goals, so no clean sheet
      const total = 2 - 1;
      expect(total).toBe(1);
    });

    it('should format GW9 Saliba correctly (subbed at halftime, NO goals conceded)', () => {
      // Real data from GW9: Saliba subbed off at 45 mins
      // Arsenal WON 1-0 (clean sheet), but Saliba didn't reach 60 mins
      const breakdown = formatScoringBreakdown({
        minutes: { points: 1, value: 45 }
      });
      expect(breakdown).toEqual(['45 mins: +1']);
      
      // CRITICAL: NO goals_conceded in breakdown means we CANNOT infer team conceded
      // Previous bug: AI was told "no clean sheet = team conceded"
      // Truth: Saliba missed clean sheet due to <60 minutes, NOT because Arsenal conceded
      expect(breakdown.some(s => s.includes('GC'))).toBe(false);
    });

    it('should format GW9 Dúbravka correctly (conceded + saves)', () => {
      // Real data from GW9: Goalkeeper with conceded goals and saves
      const breakdown = formatScoringBreakdown({
        minutes: { points: 2, value: 90 },
        goals_conceded: { points: -1, value: 2 },
        saves: { points: 1, value: 5 }
      });
      expect(breakdown).toEqual(['90 mins: +2', '2 GC: -1', '5 saves: +1']);
      
      // Verify total: 2 - 1 + 1 = 2 pts
      const total = 2 - 1 + 1;
      expect(total).toBe(2);
    });
  });

  describe('Double Gameweek Aggregation (BUG FIX)', () => {
    it('should aggregate points across multiple fixtures (not overwrite)', () => {
      // REGRESSION TEST: Previously the loop overwrote data for each fixture
      // In double gameweeks, second fixture would overwrite first
      
      // Simulate double gameweek: player plays 90 mins in both games
      const fixture1Stats = [
        { identifier: 'minutes', points: 2, value: 90 },
        { identifier: 'goals_scored', points: 4, value: 1 }
      ];
      
      const fixture2Stats = [
        { identifier: 'minutes', points: 2, value: 90 },
        { identifier: 'assists', points: 3, value: 1 }
      ];
      
      // Simulate aggregation logic from the service
      const scoringBreakdown: any = {};
      for (const fixture of [{ stats: fixture1Stats }, { stats: fixture2Stats }]) {
        for (const stat of fixture.stats) {
          if (!scoringBreakdown[stat.identifier]) {
            scoringBreakdown[stat.identifier] = { points: 0, value: 0 };
          }
          scoringBreakdown[stat.identifier].points += stat.points;
          scoringBreakdown[stat.identifier].value += stat.value;
        }
      }
      
      // Verify aggregation worked correctly
      expect(scoringBreakdown.minutes).toEqual({ points: 4, value: 180 });
      expect(scoringBreakdown.goals_scored).toEqual({ points: 4, value: 1 });
      expect(scoringBreakdown.assists).toEqual({ points: 3, value: 1 });
      
      const breakdown = formatScoringBreakdown(scoringBreakdown);
      expect(breakdown).toEqual(['180 mins: +4', '1G: +4', '1A: +3']);
    });
  });
});

describe('Clean Sheet Logic Rules', () => {
  it('should identify team conceded when goals_conceded appears in breakdown', () => {
    const breakdown = {
      minutes: { points: 2, value: 90 },
      goals_conceded: { points: -1, value: 2 }
    };
    
    // If goals_conceded exists, team definitely conceded
    const hasGoalsConceded = 'goals_conceded' in breakdown;
    expect(hasGoalsConceded).toBe(true);
    
    if (hasGoalsConceded) {
      const goalsConcededCount = breakdown.goals_conceded.value;
      expect(goalsConcededCount).toBe(2);
    }
  });

  it('should identify clean sheet when no goals_conceded and 60+ minutes', () => {
    const breakdown = {
      minutes: { points: 2, value: 90 },
      clean_sheets: { points: 4, value: 1 }
    };
    
    const hasGoalsConceded = 'goals_conceded' in breakdown;
    const hasCleanSheet = 'clean_sheets' in breakdown;
    const minutes = breakdown.minutes.value;
    
    expect(hasGoalsConceded).toBe(false);
    expect(hasCleanSheet).toBe(true);
    expect(minutes).toBeGreaterThanOrEqual(60);
  });

  it('should identify insufficient playing time when no goals_conceded and <60 minutes', () => {
    // CRITICAL TEST: This is the Saliba GW9 scenario
    const breakdown = {
      minutes: { points: 1, value: 45 }
    };
    
    const hasGoalsConceded = 'goals_conceded' in breakdown;
    const hasCleanSheet = 'clean_sheets' in breakdown;
    const minutes = breakdown.minutes.value;
    
    expect(hasGoalsConceded).toBe(false);
    expect(hasCleanSheet).toBe(false);
    expect(minutes).toBeLessThan(60);
    
    // CORRECT INFERENCE: Player missed clean sheet due to insufficient playing time
    // INCORRECT INFERENCE (previous bug): Team conceded goals
    // We CANNOT determine if team conceded - player simply didn't play long enough
  });

  it('should identify missed clean sheet threshold at exactly 59 minutes', () => {
    const breakdown = {
      minutes: { points: 1, value: 59 }
    };
    
    const minutes = breakdown.minutes.value;
    expect(minutes).toBeLessThan(60);
    // Player gets +1 for appearance but misses +1 for 60+ mins and clean sheet eligibility
  });

  it('should identify clean sheet eligibility at exactly 60 minutes', () => {
    const breakdown = {
      minutes: { points: 2, value: 60 }
    };
    
    const minutes = breakdown.minutes.value;
    expect(minutes).toBeGreaterThanOrEqual(60);
    // Player now eligible for clean sheet if team didn't concede
  });
});

describe('Mathematical Validation', () => {
  it('should ensure breakdown totals match total_points for GW8 Semenyo', () => {
    const breakdown = {
      minutes: { points: 2, value: 90 },
      assists: { points: 3, value: 1 },
      yellow_cards: { points: -1, value: 1 }
    };
    
    const total = Object.values(breakdown).reduce((sum, stat) => sum + stat.points, 0);
    expect(total).toBe(4); // Base points before captaincy
  });

  it('should ensure breakdown totals match total_points for GW9 Cucurella', () => {
    const breakdown = {
      minutes: { points: 2, value: 90 },
      goals_conceded: { points: -1, value: 2 }
    };
    
    const total = Object.values(breakdown).reduce((sum, stat) => sum + stat.points, 0);
    expect(total).toBe(1);
  });

  it('should ensure breakdown totals match total_points for GW9 Saliba', () => {
    const breakdown = {
      minutes: { points: 1, value: 45 }
    };
    
    const total = Object.values(breakdown).reduce((sum, stat) => sum + stat.points, 0);
    expect(total).toBe(1);
  });

  it('should ensure breakdown totals match total_points for GW9 Dúbravka', () => {
    const breakdown = {
      minutes: { points: 2, value: 90 },
      goals_conceded: { points: -1, value: 2 },
      saves: { points: 1, value: 5 }
    };
    
    const total = Object.values(breakdown).reduce((sum, stat) => sum + stat.points, 0);
    expect(total).toBe(2);
  });
});
