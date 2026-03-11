import type {
  FinancialHealthDimensionScore,
  FinancialHealthGrade,
  FinancialHealthPositionInput,
  FinancialHealthScoreInput,
  FinancialHealthScoreResult,
} from './types';

const DIMENSION_MAX_SCORE = 25;
const TOTAL_MAX_SCORE = 100;

interface PositionWithDerivedWeight extends FinancialHealthPositionInput {
  derivedWeightRatio: number;
}

function normalizeWeightRatio(rawWeight: number): number {
  if (!Number.isFinite(rawWeight) || rawWeight <= 0) {
    return 0;
  }

  if (rawWeight <= 1) {
    return rawWeight;
  }

  if (rawWeight <= 100) {
    return rawWeight / 100;
  }

  return 1;
}

function clampRatio(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (value >= 1) {
    return 1;
  }

  return value;
}

function toPercent(ratio: number): number {
  return Math.round(ratio * 1000) / 10;
}

function formatPercent(percentValue: number): string {
  return `${percentValue.toFixed(1)}%`;
}

function derivePositionsWithWeights(
  input: FinancialHealthScoreInput,
  safeTotalAssets: number,
): PositionWithDerivedWeight[] {
  return input.positions.map((position) => {
    const explicitWeight = position.portfolioWeight;
    const derivedWeight =
      typeof explicitWeight === 'number'
        ? normalizeWeightRatio(explicitWeight)
        : normalizeWeightRatio(position.marketValue / safeTotalAssets);

    return {
      ...position,
      derivedWeightRatio: clampRatio(derivedWeight),
    };
  });
}

function getGrade(totalScore: number): FinancialHealthGrade {
  if (totalScore >= 85) {
    return 'excellent';
  }

  if (totalScore >= 70) {
    return 'good';
  }

  if (totalScore >= 50) {
    return 'fair';
  }

  return 'needs_attention';
}

function scoreLiquidity(cashRatio: number): FinancialHealthDimensionScore {
  const cashPercent = toPercent(cashRatio);

  if (cashPercent >= 5 && cashPercent <= 20) {
    return {
      dimension: 'liquidity',
      score: 25,
      maxScore: DIMENSION_MAX_SCORE,
      label: 'Balanced cash buffer',
      reason: `Cash ratio is ${formatPercent(cashPercent)}, which is in the target 5%-20% range.`,
    };
  }

  if ((cashPercent >= 3 && cashPercent < 5) || (cashPercent > 20 && cashPercent <= 30)) {
    return {
      dimension: 'liquidity',
      score: 18,
      maxScore: DIMENSION_MAX_SCORE,
      label: 'Slightly imbalanced cash buffer',
      reason: `Cash ratio is ${formatPercent(cashPercent)}, slightly outside the ideal buffer range.`,
    };
  }

  if ((cashPercent >= 0 && cashPercent < 3) || (cashPercent > 30 && cashPercent <= 40)) {
    return {
      dimension: 'liquidity',
      score: 10,
      maxScore: DIMENSION_MAX_SCORE,
      label: 'Weak cash balance',
      reason: `Cash ratio is ${formatPercent(cashPercent)}, indicating either low buffer or elevated idle cash.`,
    };
  }

  return {
    dimension: 'liquidity',
    score: 5,
    maxScore: DIMENSION_MAX_SCORE,
    label: 'Excessive idle cash',
    reason: `Cash ratio is ${formatPercent(cashPercent)}, which is above 40% and may reduce capital efficiency.`,
  };
}

function scoreDiversification(top1Percent: number, top3Percent: number): FinancialHealthDimensionScore {
  if (top1Percent <= 20 && top3Percent <= 55) {
    return {
      dimension: 'diversification',
      score: 25,
      maxScore: DIMENSION_MAX_SCORE,
      label: 'Well diversified',
      reason: `Top holding is ${formatPercent(top1Percent)} and top 3 holdings are ${formatPercent(top3Percent)}, indicating broad diversification.`,
    };
  }

  if (top1Percent <= 30 && top3Percent <= 70) {
    return {
      dimension: 'diversification',
      score: 18,
      maxScore: DIMENSION_MAX_SCORE,
      label: 'Moderately diversified',
      reason: `Top holding is ${formatPercent(top1Percent)} and top 3 holdings are ${formatPercent(top3Percent)}, showing moderate concentration.`,
    };
  }

  if (top1Percent <= 40 && top3Percent <= 80) {
    return {
      dimension: 'diversification',
      score: 10,
      maxScore: DIMENSION_MAX_SCORE,
      label: 'Concentrated',
      reason: `Top holding is ${formatPercent(top1Percent)} and top 3 holdings are ${formatPercent(top3Percent)}, suggesting notable concentration.`,
    };
  }

  return {
    dimension: 'diversification',
    score: 5,
    maxScore: DIMENSION_MAX_SCORE,
    label: 'Highly concentrated',
    reason: `Top holding is ${formatPercent(top1Percent)} and top 3 holdings are ${formatPercent(top3Percent)}, indicating high concentration risk.`,
  };
}

function scoreConcentrationRisk(
  positions: PositionWithDerivedWeight[],
  top1Percent: number,
  top3Percent: number,
): FinancialHealthDimensionScore {
  const categoryWeights = new Map<string, number>();

  for (const position of positions) {
    const categoryKey =
      typeof position.category === 'string' && position.category.trim().length > 0
        ? position.category.trim().toLowerCase()
        : '';

    if (!categoryKey) {
      continue;
    }

    const current = categoryWeights.get(categoryKey) ?? 0;
    categoryWeights.set(categoryKey, current + position.derivedWeightRatio);
  }

  if (categoryWeights.size > 0) {
    let dominantCategoryRatio = 0;
    let dominantCategory = '';

    for (const [category, ratio] of categoryWeights.entries()) {
      if (ratio > dominantCategoryRatio) {
        dominantCategoryRatio = ratio;
        dominantCategory = category;
      }
    }

    const dominantCategoryPercent = toPercent(clampRatio(dominantCategoryRatio));

    if (dominantCategoryPercent <= 45 && top1Percent <= 20) {
      return {
        dimension: 'concentration_risk',
        score: 25,
        maxScore: DIMENSION_MAX_SCORE,
        label: 'Low concentration risk',
        reason: `Largest category (${dominantCategory}) is ${formatPercent(dominantCategoryPercent)} with top holding at ${formatPercent(top1Percent)}.`,
      };
    }

    if (dominantCategoryPercent <= 60 && top1Percent <= 30) {
      return {
        dimension: 'concentration_risk',
        score: 18,
        maxScore: DIMENSION_MAX_SCORE,
        label: 'Manageable concentration risk',
        reason: `Largest category (${dominantCategory}) is ${formatPercent(dominantCategoryPercent)} and top holding is ${formatPercent(top1Percent)}.`,
      };
    }

    if (dominantCategoryPercent <= 75 && top1Percent <= 40) {
      return {
        dimension: 'concentration_risk',
        score: 10,
        maxScore: DIMENSION_MAX_SCORE,
        label: 'Elevated concentration risk',
        reason: `Largest category (${dominantCategory}) is ${formatPercent(dominantCategoryPercent)} and top holding is ${formatPercent(top1Percent)}.`,
      };
    }

    return {
      dimension: 'concentration_risk',
      score: 5,
      maxScore: DIMENSION_MAX_SCORE,
      label: 'High concentration risk',
      reason: `Largest category (${dominantCategory}) is ${formatPercent(dominantCategoryPercent)} with top holding at ${formatPercent(top1Percent)}.`,
    };
  }

  if (top1Percent <= 20 && top3Percent <= 55) {
    return {
      dimension: 'concentration_risk',
      score: 18,
      maxScore: DIMENSION_MAX_SCORE,
      label: 'Moderate confidence, low concentration risk',
      reason: `Categories are unavailable; fallback to weight-based check with top holding ${formatPercent(top1Percent)} and top 3 at ${formatPercent(top3Percent)}.`,
    };
  }

  if (top1Percent <= 30 && top3Percent <= 70) {
    return {
      dimension: 'concentration_risk',
      score: 10,
      maxScore: DIMENSION_MAX_SCORE,
      label: 'Moderate concentration risk',
      reason: `Categories are unavailable; top holding ${formatPercent(top1Percent)} and top 3 at ${formatPercent(top3Percent)} indicate concentration risk.`,
    };
  }

  return {
    dimension: 'concentration_risk',
    score: 5,
    maxScore: DIMENSION_MAX_SCORE,
    label: 'High concentration risk',
    reason: `Categories are unavailable and fallback weight check shows concentrated exposure (top holding ${formatPercent(top1Percent)}, top 3 ${formatPercent(top3Percent)}).`,
  };
}

function scorePortfolioBalance(
  cashPercent: number,
  top1Percent: number,
  top3Percent: number,
): FinancialHealthDimensionScore {
  if (
    cashPercent >= 5 &&
    cashPercent <= 25 &&
    top1Percent <= 25 &&
    top3Percent <= 65
  ) {
    return {
      dimension: 'portfolio_balance',
      score: 25,
      maxScore: DIMENSION_MAX_SCORE,
      label: 'Balanced profile',
      reason: `Cash (${formatPercent(cashPercent)}) and concentration profile (top1 ${formatPercent(top1Percent)}, top3 ${formatPercent(top3Percent)}) look balanced.`,
    };
  }

  if (
    cashPercent >= 3 &&
    cashPercent <= 30 &&
    top1Percent <= 30 &&
    top3Percent <= 75
  ) {
    return {
      dimension: 'portfolio_balance',
      score: 18,
      maxScore: DIMENSION_MAX_SCORE,
      label: 'Mostly balanced profile',
      reason: `Portfolio shows minor imbalance: cash ${formatPercent(cashPercent)}, top1 ${formatPercent(top1Percent)}, top3 ${formatPercent(top3Percent)}.`,
    };
  }

  if (cashPercent <= 40 && top1Percent <= 40 && top3Percent <= 85) {
    return {
      dimension: 'portfolio_balance',
      score: 10,
      maxScore: DIMENSION_MAX_SCORE,
      label: 'Imbalanced profile',
      reason: `Portfolio balance is constrained by cash ${formatPercent(cashPercent)} and concentration metrics (top1 ${formatPercent(top1Percent)}, top3 ${formatPercent(top3Percent)}).`,
    };
  }

  return {
    dimension: 'portfolio_balance',
    score: 5,
    maxScore: DIMENSION_MAX_SCORE,
    label: 'Severely imbalanced profile',
    reason: `Portfolio appears extreme on cash/concentration metrics: cash ${formatPercent(cashPercent)}, top1 ${formatPercent(top1Percent)}, top3 ${formatPercent(top3Percent)}.`,
  };
}

export function calculateFinancialHealthScore(
  input: FinancialHealthScoreInput,
): FinancialHealthScoreResult {
  const sanitizedCashValue = Math.max(0, input.cashValue ?? 0);
  const totalMarketValue = input.positions.reduce(
    (sum, position) => sum + Math.max(0, position.marketValue),
    0,
  );

  const fallbackTotalAssets = totalMarketValue + sanitizedCashValue;
  const safeTotalAssets = input.totalAssets > 0 ? input.totalAssets : fallbackTotalAssets;
  const denominator = safeTotalAssets > 0 ? safeTotalAssets : 1;

  const positionsWithWeights = derivePositionsWithWeights(input, denominator);
  const sortedWeights = positionsWithWeights
    .map((position) => position.derivedWeightRatio)
    .sort((a, b) => b - a);

  const top1Ratio = sortedWeights[0] ?? 0;
  const top3Ratio = (sortedWeights[0] ?? 0) + (sortedWeights[1] ?? 0) + (sortedWeights[2] ?? 0);
  const cashRatio = clampRatio(sanitizedCashValue / denominator);

  const top1Percent = toPercent(clampRatio(top1Ratio));
  const top3Percent = toPercent(clampRatio(top3Ratio));
  const cashPercent = toPercent(cashRatio);

  const breakdown: FinancialHealthDimensionScore[] = [
    scoreLiquidity(cashRatio),
    scoreDiversification(top1Percent, top3Percent),
    scoreConcentrationRisk(positionsWithWeights, top1Percent, top3Percent),
    scorePortfolioBalance(cashPercent, top1Percent, top3Percent),
  ];

  const totalScore = breakdown.reduce((sum, dimension) => sum + dimension.score, 0);

  return {
    totalScore,
    maxScore: TOTAL_MAX_SCORE,
    grade: getGrade(totalScore),
    breakdown,
    createdAt: new Date().toISOString(),
    metadata: {
      snapshotDate: input.snapshotDate,
      totalAssetsUsed: denominator,
      cashRatioPercent: cashPercent,
      top1WeightPercent: top1Percent,
      top3WeightPercent: top3Percent,
      positionCount: input.positions.length,
      hasCategoryCoverage: positionsWithWeights.some(
        (position) => typeof position.category === 'string' && position.category.trim().length > 0,
      ),
    },
  };
}
