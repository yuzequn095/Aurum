import type { AIReportRepository, AIReportArtifact } from '../reports';

export function getAIReportById(
  reportRepository: AIReportRepository,
  reportId: string,
): AIReportArtifact | undefined {
  return reportRepository.getById(reportId);
}
