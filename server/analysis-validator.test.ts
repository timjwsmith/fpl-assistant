import { describe, it, expect } from 'vitest';
import {
  validateAnalysisText,
  validateScoringBreakdown,
  validatePredictionAnalysis
} from './analysis-validator';

describe('Analysis Validator', () => {
  describe('validateAnalysisText', () => {
    it('should pass for factual analysis with proper format', () => {
      const analysis = `• Cucurella scored 1 pt [90 mins: +2, 2 GC: -1]. Chelsea conceded 2 goals, no clean sheet cost him 4 points.`;
      
      const result = validateAnalysisText(analysis);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for speculative language', () => {
      const analysis = `• Player likely scored 1 pt. Team probably conceded goals.`;
      
      const result = validateAnalysisText(analysis);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('speculative language'))).toBe(true);
    });

    it('should fail if mentions GC without explaining count', () => {
      const analysis = `• Player scored 1 pt [90 mins: +2, GC: -1].`;
      
      const result = validateAnalysisText(analysis);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('conceded'))).toBe(true);
    });

    it('should fail if claims team conceded without GC stat (Saliba bug)', () => {
      const analysis = `• Saliba scored 1 pt [45 mins: +1]. Arsenal conceded goals, no clean sheet cost him 4 points.`;
      
      const result = validateAnalysisText(analysis);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('goals_conceded stat'))).toBe(true);
    });

    it('should pass for <60 mins without team conceding claim', () => {
      const analysis = `• Saliba scored 1 pt [45 mins: +1]. Subbed off at halftime, missing the 60-minute threshold. He also missed clean sheet points due to insufficient playing time.`;
      
      const result = validateAnalysisText(analysis);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateScoringBreakdown', () => {
    it('should pass for valid breakdown that sums correctly', () => {
      const breakdown = {
        minutes: { points: 2, value: 90 },
        goals_conceded: { points: -1, value: 2 }
      };
      
      const result = validateScoringBreakdown(breakdown, 1);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail if points do not sum to total', () => {
      const breakdown = {
        minutes: { points: 2, value: 90 }
      };
      
      const result = validateScoringBreakdown(breakdown, 5); // Should be 2
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('does not match'))).toBe(true);
    });

    it('should fail for invalid minutes range', () => {
      const breakdown = {
        minutes: { points: 2, value: 200 } // Invalid: >180
      };
      
      const result = validateScoringBreakdown(breakdown, 2);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('minutes'))).toBe(true);
    });

    it('should fail if yellow card has positive points', () => {
      const breakdown = {
        minutes: { points: 2, value: 90 },
        yellow_cards: { points: 1, value: 1 } // Should be negative
      };
      
      const result = validateScoringBreakdown(breakdown, 3);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Yellow cards'))).toBe(true);
    });

    it('should fail if player has both goals_conceded and clean_sheet', () => {
      const breakdown = {
        minutes: { points: 2, value: 90 },
        goals_conceded: { points: -1, value: 1 },
        clean_sheets: { points: 4, value: 1 } // Impossible
      };
      
      const result = validateScoringBreakdown(breakdown, 5);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('logically impossible'))).toBe(true);
    });

    it('should fail if clean_sheet awarded with <60 minutes', () => {
      const breakdown = {
        minutes: { points: 1, value: 45 },
        clean_sheets: { points: 4, value: 1 } // Invalid: <60 mins
      };
      
      const result = validateScoringBreakdown(breakdown, 5);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('<60 minutes'))).toBe(true);
    });
  });

  describe('validatePredictionAnalysis', () => {
    it('should pass for complete valid analysis (GW9 Cucurella)', () => {
      const analysis = `• Cucurella scored 1 pt [90 mins: +2, 2 GC: -1]. Chelsea conceded 2 goals, no clean sheet cost him 4 points.`;
      const breakdown = {
        minutes: { points: 2, value: 90 },
        goals_conceded: { points: -1, value: 2 }
      };
      
      const result = validatePredictionAnalysis(analysis, breakdown, 1);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for analysis with mismatched points (GW9 Saliba bug)', () => {
      const analysis = `• Saliba scored 1 pt [45 mins: +1]. Arsenal conceded goals, no clean sheet cost him 4 points.`;
      const breakdown = {
        minutes: { points: 1, value: 45 }
      };
      
      const result = validatePredictionAnalysis(analysis, breakdown, 1);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('goals_conceded stat'))).toBe(true);
    });

    it('should accumulate errors from both text and breakdown validation', () => {
      const analysis = `• Player likely scored 3 pts [90 mins: +2, GC: -1].`; // Speculative + no conceded count
      const breakdown = {
        minutes: { points: 2, value: 90 },
        goals_conceded: { points: 1, value: 2 } // Wrong sign
      };
      
      const result = validatePredictionAnalysis(analysis, breakdown, 3);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1); // Multiple errors
    });
  });
});
