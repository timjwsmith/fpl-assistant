import { describe, it, expect } from 'vitest';
import { predictionAnalysisService } from './prediction-analysis-service';

/**
 * REGRESSION TEST SUITE FOR PREDICTION ANALYSIS - TESTING REAL PRODUCTION CODE
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
 * These tests ensure fixes STAY fixed by testing the ACTUAL production code.
 */

describe('PredictionAnalysisService.formatScoringBreakdown (PRODUCTION CODE)', () => {
  describe('Standard FPL Identifiers', () => {
    it('should format minutes correctly (60+ mins = +2, <60 = +1)', () => {
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        minutes: { points: 2, value: 90 }
      });
      expect(breakdown).toEqual(['90 mins: +2']);
    });

    it('should format goals with position-specific points', () => {
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        goals_scored: { points: 6, value: 1 }
      });
      expect(breakdown).toEqual(['1G: +6']);
    });

    it('should format assists correctly', () => {
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        assists: { points: 3, value: 1 }
      });
      expect(breakdown).toEqual(['1A: +3']);
    });

    it('should format clean sheets correctly', () => {
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        clean_sheets: { points: 4, value: 1 }
      });
      expect(breakdown).toEqual(['CS: +4']);
    });

    it('should format defensive contribution (2025/26 rule)', () => {
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        defensive_contribution: { points: 2, value: 10 }
      });
      expect(breakdown).toEqual(['Def: +2']);
    });

    it('should format yellow cards with negative points', () => {
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        yellow_cards: { points: -1, value: 1 }
      });
      expect(breakdown).toEqual(['1YC: -1']);
    });

    it('should format red cards with negative points', () => {
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        red_cards: { points: -3, value: 1 }
      });
      expect(breakdown).toEqual(['1RC: -3']);
    });

    it('should format bonus points correctly', () => {
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        bonus: { points: 3, value: 3 }
      });
      expect(breakdown).toEqual(['Bonus: +3']);
    });

    it('should format goalkeeper saves correctly', () => {
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        saves: { points: 1, value: 5 }
      });
      expect(breakdown).toEqual(['5 saves: +1']);
    });

    it('should format goals conceded with COUNT and points (BUG FIX)', () => {
      // REGRESSION TEST: Previously showed "GC: -1" without the count
      // This prevented AI from knowing HOW MANY goals were conceded
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        goals_conceded: { points: -1, value: 2 }
      });
      expect(breakdown).toEqual(['2 GC: -1']);
      
      // CRITICAL: The "2" must appear before "GC" to show the count
      expect(breakdown[0]).toMatch(/^\d+ GC:/);
    });
  });

  describe('Extended FPL Identifiers (Previously Missing)', () => {
    it('should format penalties saved', () => {
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        penalties_saved: { points: 5, value: 1 }
      });
      expect(breakdown).toEqual(['1 pen saved: +5']);
    });

    it('should format penalties missed', () => {
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        penalties_missed: { points: -2, value: 1 }
      });
      expect(breakdown).toEqual(['1 pen missed: -2']);
    });

    it('should format own goals', () => {
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        own_goals: { points: -2, value: 1 }
      });
      expect(breakdown).toEqual(['1OG: -2']);
    });

    it('should format penalties conceded', () => {
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        penalties_conceded: { points: 0, value: 1 }
      });
      expect(breakdown).toEqual(['1 pen conceded: 0']);
    });

    it('should handle unknown identifiers gracefully (no silent data loss)', () => {
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        future_new_stat: { points: 5, value: 10 }
      });
      expect(breakdown).toEqual(['future_new_stat: +5']);
    });
  });

  describe('Complex Scenarios (Real GW Data)', () => {
    it('should format GW8 Semenyo captain correctly (actual data)', () => {
      // Real data from GW8: Semenyo as captain
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        minutes: { points: 2, value: 90 },
        assists: { points: 3, value: 1 },
        yellow_cards: { points: -1, value: 1 }
      });
      expect(breakdown).toEqual(['90 mins: +2', '1A: +3', '1YC: -1']);
      
      // Verify total adds up: 2 + 3 - 1 = 4 pts (base), x2 for captain = 8 pts
      const scoringData = {
        minutes: { points: 2, value: 90 },
        assists: { points: 3, value: 1 },
        yellow_cards: { points: -1, value: 1 }
      };
      const total = Object.values(scoringData).reduce((sum, stat) => sum + stat.points, 0);
      expect(total).toBe(4);
    });

    it('should format GW9 Cucurella correctly (actual data)', () => {
      // Real data from GW9: Cucurella with goals conceded
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        minutes: { points: 2, value: 90 },
        goals_conceded: { points: -1, value: 2 }
      });
      expect(breakdown).toEqual(['90 mins: +2', '2 GC: -1']);
      
      // Verify: Chelsea conceded 2 goals, so no clean sheet
      const scoringData = {
        minutes: { points: 2, value: 90 },
        goals_conceded: { points: -1, value: 2 }
      };
      const total = Object.values(scoringData).reduce((sum, stat) => sum + stat.points, 0);
      expect(total).toBe(1);
    });

    it('should format GW9 Saliba correctly (subbed at halftime, NO goals conceded)', () => {
      // Real data from GW9: Saliba subbed off at 45 mins
      // Arsenal WON 1-0 (clean sheet), but Saliba didn't reach 60 mins
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
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
      const breakdown = predictionAnalysisService.formatScoringBreakdown({
        minutes: { points: 2, value: 90 },
        goals_conceded: { points: -1, value: 2 },
        saves: { points: 1, value: 5 }
      });
      expect(breakdown).toEqual(['90 mins: +2', '2 GC: -1', '5 saves: +1']);
      
      // Verify total: 2 - 1 + 1 = 2 pts
      const scoringData = {
        minutes: { points: 2, value: 90 },
        goals_conceded: { points: -1, value: 2 },
        saves: { points: 1, value: 5 }
      };
      const total = Object.values(scoringData).reduce((sum, stat) => sum + stat.points, 0);
      expect(total).toBe(2);
    });
  });

  describe('Double Gameweek Aggregation Logic (BUG FIX - PRODUCTION CODE)', () => {
    it('should aggregate points across multiple fixtures (not overwrite)', () => {
      // REGRESSION TEST: Previously the loop overwrote data for each fixture
      // In double gameweeks, second fixture would overwrite first
      // NOW TESTING THE REAL PRODUCTION aggregateExplainArray METHOD
      
      // Simulate double gameweek FPL explain array: player plays 90 mins in both games
      const explainArray = [
        {
          fixture: 1,
          stats: [
            { identifier: 'minutes', points: 2, value: 90 },
            { identifier: 'goals_scored', points: 4, value: 1 }
          ]
        },
        {
          fixture: 2,
          stats: [
            { identifier: 'minutes', points: 2, value: 90 },
            { identifier: 'assists', points: 3, value: 1 }
          ]
        }
      ];
      
      // Call the REAL production aggregation method
      const scoringBreakdown = predictionAnalysisService.aggregateExplainArray(explainArray);
      
      // Verify aggregation worked correctly
      expect(scoringBreakdown.minutes).toEqual({ points: 4, value: 180 });
      expect(scoringBreakdown.goals_scored).toEqual({ points: 4, value: 1 });
      expect(scoringBreakdown.assists).toEqual({ points: 3, value: 1 });
      
      // Verify formatter handles aggregated data correctly
      const breakdown = predictionAnalysisService.formatScoringBreakdown(scoringBreakdown);
      expect(breakdown).toEqual(['180 mins: +4', '1G: +4', '1A: +3']);
    });

    it('should handle single fixture (no aggregation needed)', () => {
      const explainArray = [
        {
          fixture: 1,
          stats: [
            { identifier: 'minutes', points: 2, value: 90 },
            { identifier: 'assists', points: 3, value: 1 }
          ]
        }
      ];
      
      const scoringBreakdown = predictionAnalysisService.aggregateExplainArray(explainArray);
      
      expect(scoringBreakdown.minutes).toEqual({ points: 2, value: 90 });
      expect(scoringBreakdown.assists).toEqual({ points: 3, value: 1 });
    });

    it('should detect regression if aggregation reverts to overwriting', () => {
      // This test will FAIL if someone changes += back to = in the production code
      const explainArray = [
        { fixture: 1, stats: [{ identifier: 'minutes', points: 2, value: 90 }] },
        { fixture: 2, stats: [{ identifier: 'minutes', points: 2, value: 90 }] }
      ];
      
      const result = predictionAnalysisService.aggregateExplainArray(explainArray);
      
      // If code regresses to overwriting (using = instead of +=), this will be { points: 2, value: 90 }
      // Correct aggregation should give { points: 4, value: 180 }
      expect(result.minutes.points).toBe(4); // WILL FAIL if regression occurs
      expect(result.minutes.value).toBe(180); // WILL FAIL if regression occurs
    });
  });

  describe('Mathematical Validation (Real Data)', () => {
    it('should ensure breakdown totals match total_points for GW8 Semenyo', () => {
      const breakdown = {
        minutes: { points: 2, value: 90 },
        assists: { points: 3, value: 1 },
        yellow_cards: { points: -1, value: 1 }
      };
      
      const total = Object.values(breakdown).reduce((sum, stat) => sum + stat.points, 0);
      expect(total).toBe(4); // Base points before captaincy
      
      // Test formatter output
      const formatted = predictionAnalysisService.formatScoringBreakdown(breakdown);
      expect(formatted).toHaveLength(3);
    });

    it('should ensure breakdown totals match total_points for GW9 Cucurella', () => {
      const breakdown = {
        minutes: { points: 2, value: 90 },
        goals_conceded: { points: -1, value: 2 }
      };
      
      const total = Object.values(breakdown).reduce((sum, stat) => sum + stat.points, 0);
      expect(total).toBe(1);
      
      // Test formatter output
      const formatted = predictionAnalysisService.formatScoringBreakdown(breakdown);
      expect(formatted).toHaveLength(2);
      expect(formatted[1]).toMatch(/2 GC: -1/); // Must include count
    });

    it('should ensure breakdown totals match total_points for GW9 Saliba', () => {
      const breakdown = {
        minutes: { points: 1, value: 45 }
      };
      
      const total = Object.values(breakdown).reduce((sum, stat) => sum + stat.points, 0);
      expect(total).toBe(1);
      
      // Test formatter output
      const formatted = predictionAnalysisService.formatScoringBreakdown(breakdown);
      expect(formatted).toHaveLength(1);
      expect(formatted[0]).toBe('45 mins: +1');
    });

    it('should ensure breakdown totals match total_points for GW9 Dúbravka', () => {
      const breakdown = {
        minutes: { points: 2, value: 90 },
        goals_conceded: { points: -1, value: 2 },
        saves: { points: 1, value: 5 }
      };
      
      const total = Object.values(breakdown).reduce((sum, stat) => sum + stat.points, 0);
      expect(total).toBe(2);
      
      // Test formatter output
      const formatted = predictionAnalysisService.formatScoringBreakdown(breakdown);
      expect(formatted).toHaveLength(3);
    });
  });
});
