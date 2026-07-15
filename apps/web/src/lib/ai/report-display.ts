import type { AIReportArtifact } from '@aurum/core';

type ReportDisplayInput = Pick<
  AIReportArtifact,
  'contentMarkdown' | 'promptVersion' | 'reportType' | 'title'
>;

export function getAIReportDisplayTitle(report: Pick<AIReportArtifact, 'reportType' | 'title'>) {
  if (report.reportType !== 'daily_market_brief_v1') {
    return report.title;
  }

  return report.title
    .replace(/daily market brief/gi, 'Portfolio Market Lens')
    .replace(/market brief/gi, 'Portfolio Market Lens');
}

export function isLegacyPortfolioMarketLensReport(report: ReportDisplayInput): boolean {
  return (
    report.reportType === 'daily_market_brief_v1' &&
    (report.promptVersion === '1.0.0' || report.contentMarkdown.includes('internal_market_template_v1'))
  );
}
