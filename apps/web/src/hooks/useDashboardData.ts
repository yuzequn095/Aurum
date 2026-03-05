'use client';

import { useEffect, useState } from 'react';
import {
  CategoryBreakdownResponse,
  getCategoryBreakdown,
  getMonthlySummary,
  getSummarySeries,
  MonthlySummaryResponse,
  SummarySeriesResponse,
} from '@/lib/api/analytics';

type DashboardDataState = {
  summary: MonthlySummaryResponse | null;
  categoryBreakdown: CategoryBreakdownResponse | null;
  summarySeries: SummarySeriesResponse | null;
  loading: boolean;
  error: string | null;
};

export function useDashboardData(year: number, month: number): DashboardDataState {
  const [summary, setSummary] = useState<MonthlySummaryResponse | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] =
    useState<CategoryBreakdownResponse | null>(null);
  const [summarySeries, setSummarySeries] = useState<SummarySeriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const [summaryData, categoryData, seriesData] = await Promise.all([
          getMonthlySummary(year, month),
          getCategoryBreakdown(year, month),
          getSummarySeries(6, year, month),
        ]);

        if (!cancelled) {
          setSummary(summaryData);
          setCategoryBreakdown(categoryData);
          setSummarySeries(seriesData);
        }
      } catch (e) {
        if (!cancelled) {
          setSummary(null);
          setCategoryBreakdown(null);
          setSummarySeries(null);
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

  return { summary, categoryBreakdown, summarySeries, loading, error };
}
