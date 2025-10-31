/**
 * ANALYSIS VALIDATOR
 * 
 * This module provides runtime validation for AI-generated analysis to ensure:
 * 1. No speculative language (factual statements only)
 * 2. Proper scoring breakdown format
 * 3. Mathematically valid point calculations
 * 4. Correct clean sheet logic
 * 
 * Purpose: Catch AI hallucinations and logical errors before they reach users.
 * This acts as a safety net to prevent regression bugs from affecting production.
 */

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate AI-generated analysis text for quality and accuracy
 */
export function validateAnalysisText(analysisText: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: No speculative language
  const bannedSpeculativeWords = [
    'likely', 'probably', 'may have', 'might have',
    'appears to', 'seems to', 'could have', 'would have',
    'potentially', 'possibly', 'perhaps', 'maybe'
  ];

  for (const word of bannedSpeculativeWords) {
    if (analysisText.toLowerCase().includes(word.toLowerCase())) {
      errors.push(`Contains speculative language: "${word}"`);
    }
  }

  // Rule 2: Should contain numerical values
  if (!/\d+/.test(analysisText)) {
    warnings.push('Analysis lacks numerical values');
  }

  // Rule 3: Should use proper scoring breakdown format
  const hasProperFormat = /\[.*:\s*[+-]\d+.*\]/.test(analysisText);
  if (!hasProperFormat && analysisText.length > 50) {
    warnings.push('Missing proper scoring breakdown format [stat: ±points]');
  }

  // Rule 4: If mentions "GC:" should also mention "conceded X goals"
  if (analysisText.includes('GC:')) {
    if (!/conceded \d+ goal/i.test(analysisText)) {
      errors.push('Mentions "GC:" but does not explain how many goals were conceded');
    }
  }

  // Rule 5: Should not claim team conceded without "GC:" in breakdown
  const hasNoConcededStat = !analysisText.includes('GC:');
  const claimsTeamConceded = /conceded.*goal/i.test(analysisText);
  
  if (hasNoConcededStat && claimsTeamConceded) {
    errors.push('Claims team conceded goals without goals_conceded stat in breakdown (possible <60 min threshold issue)');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate scoring breakdown data structure
 */
export function validateScoringBreakdown(
  scoringBreakdown: Record<string, { points: number; value: number }>,
  totalPoints: number
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Calculate sum of points
  const calculatedTotal = Object.values(scoringBreakdown).reduce(
    (sum, stat) => sum + stat.points,
    0
  );

  // Allow small rounding differences
  if (Math.abs(calculatedTotal - totalPoints) > 0.01) {
    errors.push(
      `Scoring breakdown sum (${calculatedTotal}) does not match total points (${totalPoints})`
    );
  }

  // Rule 2: Validate common stat ranges
  if (scoringBreakdown.minutes) {
    const minutes = scoringBreakdown.minutes.value;
    if (minutes < 0 || minutes > 180) {
      errors.push(`Invalid minutes value: ${minutes} (expected 0-180)`);
    }
  }

  if (scoringBreakdown.goals_scored) {
    const goals = scoringBreakdown.goals_scored.value;
    if (goals < 0 || goals > 10) {
      warnings.push(`Unusual goals_scored value: ${goals}`);
    }
  }

  // Rule 3: Yellow and red cards should be negative points
  if (scoringBreakdown.yellow_cards && scoringBreakdown.yellow_cards.points > 0) {
    errors.push('Yellow cards should have negative points');
  }

  if (scoringBreakdown.red_cards && scoringBreakdown.red_cards.points > 0) {
    errors.push('Red cards should have negative points');
  }

  // Rule 4: Clean sheet logic validation
  const hasGoalsConceded = 'goals_conceded' in scoringBreakdown;
  const hasCleanSheet = 'clean_sheets' in scoringBreakdown;
  const minutes = scoringBreakdown.minutes?.value || 0;

  if (hasGoalsConceded && hasCleanSheet) {
    errors.push('Player has both goals_conceded and clean_sheet - logically impossible');
  }

  if (hasCleanSheet && minutes < 60) {
    errors.push('Player has clean_sheet points but played <60 minutes - invalid per FPL rules');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Comprehensive validation for prediction analysis
 */
export function validatePredictionAnalysis(
  analysis: string,
  scoringBreakdown: Record<string, { points: number; value: number }>,
  totalPoints: number
): ValidationResult {
  const textValidation = validateAnalysisText(analysis);
  const breakdownValidation = validateScoringBreakdown(scoringBreakdown, totalPoints);

  return {
    isValid: textValidation.isValid && breakdownValidation.isValid,
    errors: [...textValidation.errors, ...breakdownValidation.errors],
    warnings: [...textValidation.warnings, ...breakdownValidation.warnings]
  };
}

/**
 * Log validation errors and warnings
 */
export function logValidationResult(
  context: string,
  result: ValidationResult
): void {
  if (!result.isValid) {
    console.error(`[Validation] ${context} - FAILED`);
    for (const error of result.errors) {
      console.error(`[Validation]   ❌ ${error}`);
    }
  }

  if (result.warnings.length > 0) {
    console.warn(`[Validation] ${context} - WARNINGS`);
    for (const warning of result.warnings) {
      console.warn(`[Validation]   ⚠️  ${warning}`);
    }
  }

  if (result.isValid && result.warnings.length === 0) {
    console.log(`[Validation] ${context} - ✓ PASSED`);
  }
}
