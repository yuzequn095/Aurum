import {
  ruleMoMNetChange,
  ruleSavedThisMonth,
  ruleSpendingExceededIncome,
  ruleTopSpendingCategory,
} from '../rule.engine';
import type { MonthlyReportContext } from '../types';

const baseContext: MonthlyReportContext = {
  summary: {
    year: 2026,
    month: 2,
    range: {
      startDate: '2026-02-01T00:00:00.000Z',
      endDate: '2026-02-28T23:59:59.999Z',
    },
    totals: {
      incomeCents: 120000,
      expenseCents: 150000,
      netCents: -30000,
    },
    previousMonth: {
      year: 2026,
      month: 1,
      totals: {
        incomeCents: 100000,
        expenseCents: 90000,
        netCents: 10000,
      },
    },
    deltaPercent: {
      income: 20,
      expense: 66.67,
      net: -400,
    },
  },
  categoryBreakdown: {
    year: 2026,
    month: 2,
    totals: [
      { categoryId: 'cat-a', categoryName: 'Food', expenseCents: 70000 },
      { categoryId: 'cat-b', categoryName: 'Transport', expenseCents: 30000 },
    ],
  },
};

describe('rule insight metadata', () => {
  it('adds evidence/confidence/explain for spending-exceeded-income', () => {
    const insight = ruleSpendingExceededIncome(baseContext);
    expect(insight?.meta).toMatchObject({
      confidence: 0.9,
      evidence: { incomeCents: 120000, expenseCents: 150000 },
    });
    expect(typeof insight?.meta?.explain).toBe('string');
  });

  it('adds evidence/confidence/explain for saved-this-month', () => {
    const insight = ruleSavedThisMonth({
      ...baseContext,
      summary: {
        ...baseContext.summary,
        totals: { incomeCents: 200000, expenseCents: 150000, netCents: 50000 },
      },
    });
    expect(insight?.meta).toMatchObject({
      confidence: 0.85,
      evidence: { netCents: 50000 },
    });
    expect(typeof insight?.meta?.explain).toBe('string');
  });

  it('adds evidence/confidence/explain for top-spending-category', () => {
    const insight = ruleTopSpendingCategory(baseContext);
    expect(insight?.meta).toMatchObject({
      confidence: 0.8,
      evidence: { categoryId: 'cat-a', expenseCents: 70000 },
    });
    expect(typeof insight?.meta?.explain).toBe('string');
  });

  it('adds evidence/confidence/explain for mom-net-change', () => {
    const insight = ruleMoMNetChange(baseContext);
    expect(insight?.meta).toMatchObject({
      confidence: 0.7,
      evidence: {
        netDeltaPercent: -400,
        previousNetCents: 10000,
        currentNetCents: -30000,
      },
    });
    expect(typeof insight?.meta?.explain).toBe('string');
  });
});
