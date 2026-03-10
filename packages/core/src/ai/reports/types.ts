import type { AITaskType } from '../types';

export type AIReportType = 'portfolio_report_v1';

export interface AIReportArtifact {
  id: string;
  reportType: AIReportType;
  taskType: AITaskType;
  sourceRunId: string;
  title: string;
  contentMarkdown: string;
  promptVersion: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}
