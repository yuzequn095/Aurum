import type { FinancialHealthScoreArtifact } from '@aurum/core';
import { apiGet, apiPost } from '@/lib/api';

export interface CreateFinancialHealthScoreForSnapshotRequest {
  scoringVersion: string;
}

export async function createFinancialHealthScoreForSnapshot(
  sourceSnapshotId: string,
  body: CreateFinancialHealthScoreForSnapshotRequest,
): Promise<FinancialHealthScoreArtifact> {
  return apiPost<FinancialHealthScoreArtifact>(
    `/v1/portfolio-snapshots/${sourceSnapshotId}/financial-health-scores`,
    body,
  );
}

export async function listFinancialHealthScores(): Promise<FinancialHealthScoreArtifact[]> {
  return apiGet<FinancialHealthScoreArtifact[]>('/v1/financial-health-scores');
}

export async function getFinancialHealthScoreById(
  id: string,
): Promise<FinancialHealthScoreArtifact> {
  return apiGet<FinancialHealthScoreArtifact>(`/v1/financial-health-scores/${id}`);
}

export async function listFinancialHealthScoresBySourceSnapshotId(
  sourceSnapshotId: string,
): Promise<FinancialHealthScoreArtifact[]> {
  return apiGet<FinancialHealthScoreArtifact[]>(
    `/v1/financial-health-scores/by-snapshot/${sourceSnapshotId}`,
  );
}
