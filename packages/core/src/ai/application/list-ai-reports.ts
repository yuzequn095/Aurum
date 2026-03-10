import type { AIReportRepository, AIReportArtifact } from '../reports';

export function listAIReports(reportRepository: AIReportRepository): AIReportArtifact[] {
  return reportRepository.list();
}
