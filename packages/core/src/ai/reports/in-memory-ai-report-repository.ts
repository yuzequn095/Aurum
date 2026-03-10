import type { AIReportRepository } from './ai-report-repository';
import type { AIReportArtifact } from './types';

export class InMemoryAIReportRepository implements AIReportRepository {
  private readonly reports = new Map<string, AIReportArtifact>();

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
      b.createdAt.localeCompare(a.createdAt),
    );
  }
}
