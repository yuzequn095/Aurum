import type { FinancialHealthInsight } from './insight-types';
import type { FinancialHealthScoreResult } from './types';

export interface FinancialHealthScoreArtifact {
  id: string;
  sourceSnapshotId: string;
  scoringVersion: string;
  result: FinancialHealthScoreResult;
  insight: FinancialHealthInsight;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}
