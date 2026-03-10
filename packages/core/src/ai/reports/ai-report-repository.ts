import type { AIReportArtifact } from './types';

export interface AIReportRepository {
  create(report: AIReportArtifact): AIReportArtifact;
  update(report: AIReportArtifact): AIReportArtifact;
  getById(id: string): AIReportArtifact | undefined;
  list(): AIReportArtifact[];
}
