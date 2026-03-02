import { Insight, MonthlyReportContext } from './types';

function formatDollars(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export type Rule = (
  ctx: MonthlyReportContext,
) => Insight | Insight[] | null | undefined;

export function ruleSpendingExceededIncome(
  context: MonthlyReportContext,
): Insight | null {
  const { incomeCents, expenseCents } = context.summary.totals;
  if (expenseCents <= incomeCents) return null;
  return {
    id: 'spending-exceeded-income',
    title: 'Spending Alert',
    body: 'Spending exceeded income this month.',
    severity: 'warn',
    meta: {
      evidence: { incomeCents, expenseCents },
      confidence: 0.9,
      explain: 'Expenses were higher than income in the selected month.',
    },
  };
}

export function ruleSavedThisMonth(
  context: MonthlyReportContext,
): Insight | null {
  const { netCents } = context.summary.totals;
  if (netCents <= 0) return null;
  return {
    id: 'saved-this-month',
    title: 'Savings',
    body: `You saved ${formatDollars(netCents)} this month.`,
    severity: 'good',
    meta: {
      evidence: { netCents },
      confidence: 0.85,
      explain: 'Net cashflow is positive after subtracting expenses.',
    },
  };
}

export function ruleTopSpendingCategory(
  context: MonthlyReportContext,
): Insight | null {
  const topCategory = context.categoryBreakdown.totals.reduce<
    (typeof context.categoryBreakdown.totals)[number] | null
  >((currentMax, current) => {
    if (!currentMax || current.expenseCents > currentMax.expenseCents) {
      return current;
    }
    return currentMax;
  }, null);

  if (!topCategory) return null;

  return {
    id: 'top-spending-category',
    title: 'Top Spending Category',
    body: `Top spending category: ${topCategory.categoryName} (${formatDollars(topCategory.expenseCents)}).`,
    severity: 'info',
    meta: {
      evidence: {
        categoryId: topCategory.categoryId,
        expenseCents: topCategory.expenseCents,
      },
      confidence: 0.8,
      explain: 'This category has the highest expense total this month.',
    },
  };
}

export function ruleMoMNetChange(
  context: MonthlyReportContext,
): Insight | null {
  const netDelta = context.summary.deltaPercent?.net;
  if (context.summary.previousMonth?.totals == null || netDelta == null) {
    return null;
  }
  const sign = netDelta > 0 ? '+' : '';
  return {
    id: 'mom-net-change',
    title: 'Month-over-Month',
    body: `Net cashflow changed ${sign}${netDelta.toFixed(2)}% vs last month.`,
    severity: 'info',
    meta: {
      evidence: {
        netDeltaPercent: netDelta,
        previousNetCents: context.summary.previousMonth.totals.netCents,
        currentNetCents: context.summary.totals.netCents,
      },
      confidence: 0.7,
      explain:
        'Month-over-month net comparison uses previous and current totals.',
    },
  };
}

export const RULES: Rule[] = [
  ruleSpendingExceededIncome,
  ruleSavedThisMonth,
  ruleTopSpendingCategory,
  ruleMoMNetChange,
];

export function generateRuleInsights(context: MonthlyReportContext): Insight[] {
  const insights: Insight[] = [];

  for (const rule of RULES) {
    const result = rule(context);
    if (!result) continue;
    if (Array.isArray(result)) {
      for (const item of result) {
        if (item) insights.push(item);
      }
    } else {
      insights.push(result);
    }
  }

  return insights;
}
