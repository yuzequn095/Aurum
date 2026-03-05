import { apiGet } from '@/lib/api';

export type DashboardDeltaMap = {
  income?: number | null;
  expense?: number | null;
  net?: number | null;
};

export type MonthlySummaryResponse = {
  totals: {
    incomeCents: number;
    expenseCents: number;
    netCents: number;
  };
  previousMonth?: {
    totals?: {
      incomeCents: number;
      expenseCents: number;
      netCents: number;
    };
  };
  deltaPercent?: DashboardDeltaMap;
  delta?: DashboardDeltaMap;
};

export type CategoryBreakdownResponse = {
  totals: Array<{
    categoryId: string | null;
    categoryName: string | null;
    expenseCents: number;
  }>;
};

export async function getMonthlySummary(
  year: number,
  month: number,
): Promise<MonthlySummaryResponse> {
  const qs = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  return apiGet<MonthlySummaryResponse>(`/v1/analytics/monthly-summary?${qs.toString()}`);
}

export async function getCategoryBreakdown(
  year: number,
  month: number,
): Promise<CategoryBreakdownResponse> {
  const qs = new URLSearchParams({
    year: String(year),
    month: String(month),
  });
  return apiGet<CategoryBreakdownResponse>(`/v1/analytics/category-breakdown?${qs.toString()}`);
}

export async function getSummarySeries(..._args: number[]): Promise<never> {
  void _args;
  throw new Error('getSummarySeries is not implemented yet.');
}
