import type { AIReportArtifact } from '@aurum/core';
import { apiPost } from '@/lib/api';

export interface CreateMonthlyFinancialReviewRequest {
  year?: number;
  month?: number;
  sourceSnapshotId?: string;
}

export async function createMonthlyFinancialReview(
  body: CreateMonthlyFinancialReviewRequest,
): Promise<AIReportArtifact> {
  return apiPost<AIReportArtifact>('/v1/ai/monthly-financial-review', body);
}
