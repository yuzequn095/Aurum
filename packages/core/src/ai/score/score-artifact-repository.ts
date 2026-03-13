import type { FinancialHealthScoreArtifact } from './artifact-types';

export interface FinancialHealthScoreArtifactRepository {
  create(artifact: FinancialHealthScoreArtifact): FinancialHealthScoreArtifact;
  update(artifact: FinancialHealthScoreArtifact): FinancialHealthScoreArtifact;
  getById(id: string): FinancialHealthScoreArtifact | undefined;
  list(): FinancialHealthScoreArtifact[];
  listBySourceSnapshotId(sourceSnapshotId: string): FinancialHealthScoreArtifact[];
}
