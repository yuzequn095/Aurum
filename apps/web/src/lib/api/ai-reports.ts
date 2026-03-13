import type { AIReportArtifact } from '@aurum/core';
import { apiGet, apiPost } from '@/lib/api';

export interface CreateReportForSnapshotRequest {
  contentMarkdown: string;
  promptVersion: string;
  sourceRunId?: string;
}

export async function createAIReport(report: AIReportArtifact): Promise<AIReportArtifact> {
  return apiPost<AIReportArtifact>('/v1/ai-reports', report);
}

export async function createReportForSnapshot(
  sourceSnapshotId: string,
  body: CreateReportForSnapshotRequest,
): Promise<AIReportArtifact> {
  return apiPost<AIReportArtifact>(
    `/v1/portfolio-snapshots/${sourceSnapshotId}/reports`,
    body,
  );
}

export async function listAIReports(): Promise<AIReportArtifact[]> {
  return apiGet<AIReportArtifact[]>('/v1/ai-reports');
}

export async function getAIReportById(id: string): Promise<AIReportArtifact> {
  return apiGet<AIReportArtifact>(`/v1/ai-reports/${id}`);
}

export async function listAIReportsBySourceSnapshotId(
  sourceSnapshotId: string,
): Promise<AIReportArtifact[]> {
  return apiGet<AIReportArtifact[]>(`/v1/ai-reports/by-snapshot/${sourceSnapshotId}`);
}
