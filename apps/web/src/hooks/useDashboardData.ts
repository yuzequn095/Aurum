'use client';

import { useEffect, useState } from 'react';
import {
  CategoryBreakdownResponse,
  getCategoryBreakdown,
  getMonthlySummary,
  MonthlySummaryResponse,
} from '@/lib/api/analytics';

type DashboardDataState = {
  summary: MonthlySummaryResponse | null;
  categoryBreakdown: CategoryBreakdownResponse | null;
  loading: boolean;
  error: string | null;
};

export function useDashboardData(year: number, month: number): DashboardDataState {
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] =
    useState<CategoryBreakdownResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [summaryData, categoryData] = await Promise.all([
          getMonthlySummary(year, month),
          getCategoryBreakdown(year, month),
        ]);

        if (!cancelled) {
          setSummary(summaryData);
          setCategoryBreakdown(categoryData);
        }
      } catch (e) {
        if (!cancelled) {
          setSummary(null);
          setCategoryBreakdown(null);
          setError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [year, month]);

  return { summary, categoryBreakdown, loading, error };
}
