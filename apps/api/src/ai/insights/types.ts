import { AnalyticsService } from '../../analytics/analytics.service';

export type InsightSeverity = 'info' | 'warn' | 'good' | 'error';

export type Insight = {
  id: string;
  title: string;
  body: string;
  severity: InsightSeverity;
  meta?: Record<string, unknown>;
};

export type MonthlyReportContext = {
  summary: Awaited<ReturnType<AnalyticsService['getMonthlySummary']>>;
  categoryBreakdown: Awaited<
    ReturnType<AnalyticsService['getCategoryBreakdown']>
  >;
};

export type MonthlyReportResponse = {
  year: number;
  month: number;
  summary: MonthlyReportContext['summary'];
  categoryBreakdown: MonthlyReportContext['categoryBreakdown'];
  insights: Insight[];
};
