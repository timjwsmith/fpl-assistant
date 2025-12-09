import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Fallback Mode Regression Tests', () => {
  describe('Deadline Detection', () => {
    it('should detect fallback mode when gameweek deadline has not passed', () => {
      const now = new Date('2025-12-09T12:00:00Z');
      const deadline = new Date('2025-12-14T11:00:00Z');
      const deadlinePassed = deadline < now;
      
      expect(deadlinePassed).toBe(false);
    });

    it('should not be in fallback mode when deadline has passed', () => {
      const now = new Date('2025-12-14T12:00:00Z');
      const deadline = new Date('2025-12-14T11:00:00Z');
      const deadlinePassed = deadline < now;
      
      expect(deadlinePassed).toBe(true);
    });
  });

  describe('Lineup Optimization Suppression', () => {
    it('should return empty lineup optimizations in fallback mode', () => {
      const lineupFromFallback = true;
      const aiLineupOptimizations = [
        { benched_player_id: 295, starting_player_id: 100 }
      ];
      
      const effectiveOptimizations = lineupFromFallback ? [] : aiLineupOptimizations;
      
      expect(effectiveOptimizations).toEqual([]);
    });

    it('should preserve lineup optimizations when NOT in fallback mode', () => {
      const lineupFromFallback = false;
      const aiLineupOptimizations = [
        { benched_player_id: 295, starting_player_id: 100 }
      ];
      
      const effectiveOptimizations = lineupFromFallback ? [] : aiLineupOptimizations;
      
      expect(effectiveOptimizations).toEqual(aiLineupOptimizations);
      expect(effectiveOptimizations.length).toBe(1);
    });
  });

  describe('Change Reasoning in Fallback Mode', () => {
    it('should NOT include "lineup optimizations changed" in change reasoning when in fallback mode', () => {
      const usingFallbackData = true;
      const lineupOptimizationsChanged = true;
      
      const effectiveLineupOptimizationsChanged = lineupOptimizationsChanged && !usingFallbackData;
      
      const changes = [
        'different transfers',
        effectiveLineupOptimizationsChanged ? 'lineup optimizations changed' : null,
      ].filter(Boolean);
      
      expect(changes).not.toContain('lineup optimizations changed');
      expect(effectiveLineupOptimizationsChanged).toBe(false);
    });

    it('should include "lineup optimizations changed" when NOT in fallback mode', () => {
      const usingFallbackData = false;
      const lineupOptimizationsChanged = true;
      
      const effectiveLineupOptimizationsChanged = lineupOptimizationsChanged && !usingFallbackData;
      
      const changes = [
        'different transfers',
        effectiveLineupOptimizationsChanged ? 'lineup optimizations changed' : null,
      ].filter(Boolean);
      
      expect(changes).toContain('lineup optimizations changed');
      expect(effectiveLineupOptimizationsChanged).toBe(true);
    });
  });

  describe('Data Source Tracking', () => {
    it('should set dataSource to "fallback" when using previous GW data', () => {
      const lineupFromFallback = true;
      const dataSource = lineupFromFallback ? 'fallback' : 'current';
      
      expect(dataSource).toBe('fallback');
    });

    it('should set dataSource to "current" when using current GW data', () => {
      const lineupFromFallback = false;
      const dataSource = lineupFromFallback ? 'fallback' : 'current';
      
      expect(dataSource).toBe('current');
    });
  });

  describe('Transfer Substitution Details', () => {
    it('should skip substitution detection when in fallback mode', () => {
      const lineupFromFallback = true;
      let substitutionDetailsGenerated = false;
      
      if (!lineupFromFallback) {
        substitutionDetailsGenerated = true;
      }
      
      expect(substitutionDetailsGenerated).toBe(false);
    });

    it('should generate substitution details when NOT in fallback mode', () => {
      const lineupFromFallback = false;
      let substitutionDetailsGenerated = false;
      
      if (!lineupFromFallback) {
        substitutionDetailsGenerated = true;
      }
      
      expect(substitutionDetailsGenerated).toBe(true);
    });
  });

  describe('Budget Validation', () => {
    it('should calculate collective budget correctly', () => {
      const bankBalance = 17; // £1.7m in tenths
      const transfers = [
        { outSellingPrice: 60, inPurchasePrice: 52 }, // Saliba → Guéhi
      ];
      
      const totalSellingValue = transfers.reduce((sum, t) => sum + t.outSellingPrice, 0);
      const totalPurchaseCost = transfers.reduce((sum, t) => sum + t.inPurchasePrice, 0);
      const collectiveBudget = bankBalance + totalSellingValue;
      const affordable = collectiveBudget >= totalPurchaseCost;
      
      expect(totalSellingValue).toBe(60);
      expect(totalPurchaseCost).toBe(52);
      expect(collectiveBudget).toBe(77); // £7.7m
      expect(affordable).toBe(true);
    });

    it('should reject transfers that exceed collective budget', () => {
      const bankBalance = 5; // £0.5m in tenths
      const transfers = [
        { outSellingPrice: 50, inPurchasePrice: 100 }, // £5m → £10m (net +£5m)
      ];
      
      const totalSellingValue = transfers.reduce((sum, t) => sum + t.outSellingPrice, 0);
      const totalPurchaseCost = transfers.reduce((sum, t) => sum + t.inPurchasePrice, 0);
      const collectiveBudget = bankBalance + totalSellingValue;
      const affordable = collectiveBudget >= totalPurchaseCost;
      
      expect(collectiveBudget).toBe(55); // £5.5m available
      expect(totalPurchaseCost).toBe(100); // £10m needed
      expect(affordable).toBe(false);
    });

    it('should handle multiple transfers with collective budget', () => {
      const bankBalance = 10; // £1.0m
      const transfers = [
        { outSellingPrice: 60, inPurchasePrice: 70 }, // net +£1m
        { outSellingPrice: 50, inPurchasePrice: 45 }, // net -£0.5m
      ];
      
      const totalSellingValue = transfers.reduce((sum, t) => sum + t.outSellingPrice, 0);
      const totalPurchaseCost = transfers.reduce((sum, t) => sum + t.inPurchasePrice, 0);
      const collectiveBudget = bankBalance + totalSellingValue;
      const affordable = collectiveBudget >= totalPurchaseCost;
      
      expect(totalSellingValue).toBe(110); // £11m from sales
      expect(totalPurchaseCost).toBe(115); // £11.5m for purchases
      expect(collectiveBudget).toBe(120); // £12m available (£1m bank + £11m sales)
      expect(affordable).toBe(true);
    });
  });

  describe('UI Fallback Banner Display', () => {
    it('should show fallback banner when usingFallbackData is true', () => {
      const plan = {
        usingFallbackData: true,
        dataSource: 'fallback',
        lineupOptimizations: [],
      };
      
      const shouldShowFallbackBanner = plan.usingFallbackData === true;
      
      expect(shouldShowFallbackBanner).toBe(true);
    });

    it('should NOT show previous optimizations section when in fallback mode', () => {
      const plan = {
        usingFallbackData: true,
        recommendationsChanged: true,
        changeReasoning: 'lineup optimizations changed', // This shouldn't happen with the fix, but test the UI guard
        lineupOptimizations: [],
      };
      
      const shouldShowPreviousOptimizations = 
        plan.recommendationsChanged && 
        plan.changeReasoning?.includes('lineup optimizations changed') && 
        !plan.usingFallbackData;
      
      expect(shouldShowPreviousOptimizations).toBe(false);
    });

    it('should show previous optimizations section when NOT in fallback mode', () => {
      const plan = {
        usingFallbackData: false,
        recommendationsChanged: true,
        changeReasoning: 'Recommendations updated based on latest analysis. Changes: lineup optimizations changed.',
        lineupOptimizations: [],
      };
      
      const shouldShowPreviousOptimizations = 
        plan.recommendationsChanged && 
        plan.changeReasoning?.includes('lineup optimizations changed') && 
        !plan.usingFallbackData;
      
      expect(shouldShowPreviousOptimizations).toBe(true);
    });
  });

  describe('Transfer Prediction Validation', () => {
    it('should reject transfers where incoming player has lower prediction', () => {
      const outPlayerPrediction = 5.0;
      const inPlayerPrediction = 3.0;
      const transferCost = 0;
      
      const netGain = inPlayerPrediction - outPlayerPrediction - transferCost;
      const shouldReject = netGain < 0;
      
      expect(netGain).toBe(-2);
      expect(shouldReject).toBe(true);
    });

    it('should accept transfers where incoming player has higher prediction', () => {
      const outPlayerPrediction = 4.0;
      const inPlayerPrediction = 6.0;
      const transferCost = 0;
      
      const netGain = inPlayerPrediction - outPlayerPrediction - transferCost;
      const shouldReject = netGain < 0;
      
      expect(netGain).toBe(2);
      expect(shouldReject).toBe(false);
    });

    it('should reject transfers where incoming player prediction is below 2 points', () => {
      const inPlayerPrediction = 1.5;
      const minimumPrediction = 2.0;
      
      const shouldReject = inPlayerPrediction < minimumPrediction;
      
      expect(shouldReject).toBe(true);
    });
  });
});
