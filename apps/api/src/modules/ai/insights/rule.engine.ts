import { Insight, MonthlyReportContext } from './types';

function formatDollars(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export function generateRuleInsights(context: MonthlyReportContext): Insight[] {
  const { summary, categoryBreakdown } = context;
  const insights: Insight[] = [];
  const { incomeCents, expenseCents, netCents } = summary.totals;

  if (expenseCents > incomeCents) {
    insights.push({
      id: 'spending-exceeded-income',
      title: 'Spending Alert',
      body: 'Spending exceeded income this month.',
      severity: 'warn',
      meta: { incomeCents, expenseCents },
    });
  }

  if (netCents > 0) {
    insights.push({
      id: 'saved-this-month',
      title: 'Savings',
      body: `You saved ${formatDollars(netCents)} this month.`,
      severity: 'good',
      meta: { netCents },
    });
  }

  const topCategory = categoryBreakdown.totals[0];
  if (topCategory) {
    insights.push({
      id: 'top-spending-category',
      title: 'Top Spending Category',
      body: `Top spending category: ${topCategory.categoryName} (${formatDollars(topCategory.expenseCents)}).`,
      severity: 'info',
      meta: {
        categoryId: topCategory.categoryId,
        expenseCents: topCategory.expenseCents,
      },
    });
  }

  const netDelta = summary.deltaPercent?.net;
  if (summary.previousMonth?.totals && netDelta != null) {
    const sign = netDelta > 0 ? '+' : '';
    insights.push({
      id: 'mom-net-change',
      title: 'Month-over-Month',
      body: `Net cashflow changed ${sign}${netDelta.toFixed(2)}% vs last month.`,
      severity: 'info',
      meta: {
        netDeltaPercent: netDelta,
        previousNetCents: summary.previousMonth.totals.netCents,
        currentNetCents: netCents,
      },
    });
  }

  return insights;
}
