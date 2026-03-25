import type { AITaskType } from '../types';

export type AIReportType =
  | 'portfolio_report_v1'
  | 'monthly_financial_review_v1'
  | 'daily_market_brief_v1';

export interface AIReportArtifact {
  id: string;
  reportType: AIReportType;
  taskType: AITaskType;
  sourceRunId: string;
  sourceSnapshotId?: string;
  title: string;
  contentMarkdown: string;
  promptVersion: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}
