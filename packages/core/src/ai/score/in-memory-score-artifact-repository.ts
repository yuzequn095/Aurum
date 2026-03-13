import type { FinancialHealthScoreArtifact } from './artifact-types';
import type { FinancialHealthScoreArtifactRepository } from './score-artifact-repository';

export class InMemoryFinancialHealthScoreArtifactRepository
  implements FinancialHealthScoreArtifactRepository
{
  private readonly artifacts = new Map<string, FinancialHealthScoreArtifact>();

  private newestFirst(
    a: FinancialHealthScoreArtifact,
    b: FinancialHealthScoreArtifact,
  ): number {
    return b.createdAt.localeCompare(a.createdAt);
  }

  create(artifact: FinancialHealthScoreArtifact): FinancialHealthScoreArtifact {
    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  update(artifact: FinancialHealthScoreArtifact): FinancialHealthScoreArtifact {
    this.artifacts.set(artifact.id, artifact);
    return artifact;
  }

  getById(id: string): FinancialHealthScoreArtifact | undefined {
    return this.artifacts.get(id);
  }

  list(): FinancialHealthScoreArtifact[] {
    return Array.from(this.artifacts.values()).sort((a, b) =>
      this.newestFirst(a, b),
    );
  }

  listBySourceSnapshotId(sourceSnapshotId: string): FinancialHealthScoreArtifact[] {
    return Array.from(this.artifacts.values())
      .filter((artifact) => artifact.sourceSnapshotId === sourceSnapshotId)
      .sort((a, b) => this.newestFirst(a, b));
  }
}
