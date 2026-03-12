import type { AIReportRepository } from './ai-report-repository';
import type { AIReportArtifact } from './types';

export class InMemoryAIReportRepository implements AIReportRepository {
  private readonly reports = new Map<string, AIReportArtifact>();

  private newestFirst(a: AIReportArtifact, b: AIReportArtifact): number {
    return b.createdAt.localeCompare(a.createdAt);
  }

  create(report: AIReportArtifact): AIReportArtifact {
    this.reports.set(report.id, report);
    return report;
  }

  update(report: AIReportArtifact): AIReportArtifact {
    this.reports.set(report.id, report);
    return report;
  }

  getById(id: string): AIReportArtifact | undefined {
    return this.reports.get(id);
  }

  list(): AIReportArtifact[] {
    return Array.from(this.reports.values()).sort((a, b) =>
      this.newestFirst(a, b),
    );
  }

  listBySourceSnapshotId(sourceSnapshotId: string): AIReportArtifact[] {
    return Array.from(this.reports.values())
      .filter((report) => report.sourceSnapshotId === sourceSnapshotId)
      .sort((a, b) => this.newestFirst(a, b));
  }
}
