import type { FinancialHealthInsight } from './insight-types';
import type { FinancialHealthDimension, FinancialHealthDimensionScore, FinancialHealthScoreResult } from './types';

const HIGH_SCORE_THRESHOLD = 18;
const LOW_SCORE_THRESHOLD = 10;

const HEADLINE_BY_GRADE: Record<FinancialHealthScoreResult['grade'], string> = {
  excellent: 'Strong financial health',
  good: 'Healthy overall position with manageable issues',
  fair: 'Moderate financial health with areas to improve',
  needs_attention: 'Financial health needs attention',
};

const SUMMARY_TONE_BY_GRADE: Record<FinancialHealthScoreResult['grade'], string> = {
  excellent: 'Overall condition is strong with balanced fundamentals.',
  good: 'Overall condition is healthy with a few manageable trade-offs.',
  fair: 'Overall condition is moderate and would benefit from targeted improvements.',
  needs_attention: 'Overall condition shows material weaknesses that should be addressed soon.',
};

const DIMENSION_LABEL: Record<FinancialHealthDimension, string> = {
  liquidity: 'Liquidity',
  diversification: 'Diversification',
  concentration_risk: 'Concentration risk',
  portfolio_balance: 'Portfolio balance',
};

const NEXT_ACTION_BY_DIMENSION: Record<FinancialHealthDimension, string> = {
  liquidity:
    'Adjust cash buffer toward a balanced range by building emergency liquidity or deploying excess idle cash gradually.',
  diversification:
    'Broaden exposure across additional holdings or asset sleeves to reduce reliance on a small set of positions.',
  concentration_risk:
    'Reduce stacked exposure in related holdings and add diversifying sleeves to lower concentration risk.',
  portfolio_balance:
    'Set target allocation guardrails and rebalance periodically to keep cash and concentration within intended ranges.',
};

function getSummary(result: FinancialHealthScoreResult): string {
  const best = [...result.breakdown].sort((a, b) => b.score - a.score)[0];
  const weakest = [...result.breakdown].sort((a, b) => a.score - b.score)[0];

  if (!best || !weakest) {
    return `Financial Health Score is ${result.totalScore}/${result.maxScore}. ${SUMMARY_TONE_BY_GRADE[result.grade]}`;
  }

  return `Financial Health Score is ${result.totalScore}/${result.maxScore}. ${SUMMARY_TONE_BY_GRADE[result.grade]} Strongest area: ${DIMENSION_LABEL[best.dimension]} (${best.score}/${best.maxScore}). Weakest area: ${DIMENSION_LABEL[weakest.dimension]} (${weakest.score}/${weakest.maxScore}).`;
}

function buildStrengths(breakdown: FinancialHealthDimensionScore[]): string[] {
  return breakdown
    .filter((dimension) => dimension.score >= HIGH_SCORE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .map(
      (dimension) =>
        `${DIMENSION_LABEL[dimension.dimension]} is a relative strength (${dimension.score}/${dimension.maxScore}): ${dimension.label.toLowerCase()}.`,
    );
}

function buildConcerns(breakdown: FinancialHealthDimensionScore[]): string[] {
  return breakdown
    .filter((dimension) => dimension.score <= LOW_SCORE_THRESHOLD)
    .sort((a, b) => a.score - b.score)
    .map(
      (dimension) =>
        `${DIMENSION_LABEL[dimension.dimension]} is a concern (${dimension.score}/${dimension.maxScore}): ${dimension.label.toLowerCase()}.`,
    );
}

function buildNextActions(breakdown: FinancialHealthDimensionScore[]): string[] {
  const weakerDimensions = breakdown
    .filter((dimension) => dimension.score <= LOW_SCORE_THRESHOLD)
    .sort((a, b) => a.score - b.score);

  const actions = weakerDimensions.map((dimension) => NEXT_ACTION_BY_DIMENSION[dimension.dimension]);

  return Array.from(new Set(actions));
}

export function buildFinancialHealthInsight(
  result: FinancialHealthScoreResult,
): FinancialHealthInsight {
  return {
    headline: HEADLINE_BY_GRADE[result.grade],
    summary: getSummary(result),
    strengths: buildStrengths(result.breakdown),
    concerns: buildConcerns(result.breakdown),
    nextActions: buildNextActions(result.breakdown),
  };
}
