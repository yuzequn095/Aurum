'use client';

import { useState } from 'react';
import {
  createPreparedAIRunRecord,
  createReportFromCompletedRun,
  getAIReportById,
  InMemoryAIReportRepository,
  InMemoryAIRunRepository,
  listAIReports,
  submitManualResult,
  type AIReportArtifact,
  type PortfolioReportInput,
} from '@aurum/core';
import { PageContainer } from '@/components/layout/PageContainer';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const runRepository = new InMemoryAIRunRepository();
const reportRepository = new InMemoryAIReportRepository();

const mockPortfolioInput: PortfolioReportInput = {
  portfolioName: 'Aurum Core Growth',
  snapshotDate: '2026-03-09',
  totalValue: 412860.73,
  cashValue: 36840.73,
  positions: [
    {
      symbol: 'VOO',
      name: 'Vanguard S&P 500 ETF',
      marketValue: 142400,
      portfolioWeight: 34.5,
      pnlPercent: 15.6,
    },
    {
      symbol: 'QQQ',
      name: 'Invesco QQQ Trust',
      marketValue: 116220,
      portfolioWeight: 28.1,
      pnlPercent: 19.4,
    },
    {
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      marketValue: 54990,
      portfolioWeight: 13.3,
      pnlPercent: 12.1,
    },
    {
      symbol: 'BRK.B',
      name: 'Berkshire Hathaway',
      marketValue: 62410,
      portfolioWeight: 15.1,
      pnlPercent: 7.2,
    },
  ],
  userContext: {
    goal: 'Long-term growth with moderate volatility tolerance',
    riskPreference: 'Moderate',
    concerns: ['Large-cap concentration', 'Deploying excess cash'],
  },
};

const mockManualOutput = `## Overall assessment
The portfolio is growth-oriented with strong large-cap quality exposure and a healthy cash buffer. Current positioning supports long-term appreciation, but concentration in broad U.S. equity beta is notable.

## Key strengths
- Core exposure is anchored by diversified index ETFs with durable long-term return characteristics.
- Position quality is high, with meaningful allocations to profitable, large-cap businesses.
- Cash allocation provides optionality for staged deployment during market pullbacks.

## Key risks
- Portfolio sensitivity to U.S. mega-cap drawdowns remains elevated.
- Correlation across top holdings may reduce diversification benefits during risk-off periods.
- A prolonged rally could create opportunity cost if cash is not deployed gradually.

## Concentration observations
- The top two ETF positions account for a majority of invested assets.
- Equity style bias leans toward growth and technology-linked earnings.
- Consider whether this concentration aligns with downside tolerance.

## Suggested next actions
1. Define a cash deployment schedule over the next 8-12 weeks.
2. Add one diversifying sleeve (international or defensive value exposure).
3. Re-check target weights monthly and rebalance if concentration thresholds are exceeded.`;

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStringMetadataValue(
  report: AIReportArtifact | undefined,
  key: string,
): string | undefined {
  if (!report) {
    return undefined;
  }

  const value = report.metadata?.[key];
  return typeof value === 'string' ? value : undefined;
}

export default function AiInsightsPage() {
  const [reports, setReports] = useState<AIReportArtifact[]>(() => listAIReports(reportRepository));
  const [selectedReportId, setSelectedReportId] = useState<string | null>(reports[0]?.id ?? null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const selectedReport = selectedReportId
    ? getAIReportById(reportRepository, selectedReportId)
    : undefined;

  const refreshReports = () => {
    setReports(listAIReports(reportRepository));
  };

  const onGenerateDemoReport = () => {
    setIsGenerating(true);
    setStatusMessage('');

    try {
      const preparedRun = createPreparedAIRunRecord(runRepository, {
        taskType: 'portfolio_report_v1',
        payload: mockPortfolioInput as unknown as Record<string, unknown>,
      });

      submitManualResult(runRepository, preparedRun.id, mockManualOutput);

      const report = createReportFromCompletedRun(
        reportRepository,
        runRepository,
        preparedRun.id,
      );

      refreshReports();
      setSelectedReportId(report.id);
      setStatusMessage(`Demo report generated: ${report.id}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to generate demo report');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedPortfolioName = getStringMetadataValue(selectedReport, 'portfolioName');
  const selectedSnapshotDate = getStringMetadataValue(selectedReport, 'snapshotDate');

  return (
    <PageContainer className='space-y-6'>
      <Card>
        <CardHeader className='space-y-3'>
          <div className='space-y-1'>
            <CardTitle>AI Insights</CardTitle>
            <CardDescription>
              Report artifact view for Milestone 11.2. Generate demo data to validate the
              run-to-report pipeline end-to-end.
            </CardDescription>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <Button variant='primary' onClick={onGenerateDemoReport} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Demo Report'}
            </Button>
            <span className='text-xs text-aurum-muted'>
              In-memory repositories are used in this phase and reset on page refresh.
            </span>
          </div>
          {statusMessage ? (
            <p className='rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text'>
              {statusMessage}
            </p>
          ) : null}
        </CardHeader>
      </Card>

      <section className='grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]'>
        <Card>
          <CardHeader>
            <CardTitle>Report List</CardTitle>
            <CardDescription>Select a report artifact to inspect details.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-2'>
            {reports.length === 0 ? (
              <p className='text-sm text-aurum-muted'>
                No reports yet. Click "Generate Demo Report" to create one.
              </p>
            ) : (
              reports.map((report) => (
                <button
                  key={report.id}
                  type='button'
                  onClick={() => setSelectedReportId(report.id)}
                  className={`w-full rounded-[12px] border px-3 py-2 text-left text-xs transition ${
                    report.id === selectedReportId
                      ? 'border-[var(--aurum-accent)] bg-[var(--aurum-accent)]/10'
                      : 'border-[var(--aurum-border)] bg-[var(--aurum-surface)] hover:bg-[var(--aurum-surface-alt)]'
                  }`}
                >
                  <p className='font-medium text-aurum-text'>{report.title}</p>
                  <p className='text-aurum-muted'>type: {report.reportType}</p>
                  <p className='text-aurum-muted'>created: {formatDateTime(report.createdAt)}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Detail</CardTitle>
            <CardDescription>Selected formal report artifact generated from a completed run.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {!selectedReport ? (
              <p className='text-sm text-aurum-muted'>Select a report from the list.</p>
            ) : (
              <>
                <div className='grid grid-cols-1 gap-3 text-sm md:grid-cols-2'>
                  <div>
                    <p className='text-xs uppercase tracking-wide text-aurum-muted'>Title</p>
                    <p className='text-aurum-text'>{selectedReport.title}</p>
                  </div>
                  <div>
                    <p className='text-xs uppercase tracking-wide text-aurum-muted'>Report Type</p>
                    <p className='text-aurum-text'>{selectedReport.reportType}</p>
                  </div>
                  <div>
                    <p className='text-xs uppercase tracking-wide text-aurum-muted'>
                      Prompt Version
                    </p>
                    <p className='text-aurum-text'>{selectedReport.promptVersion}</p>
                  </div>
                  <div>
                    <p className='text-xs uppercase tracking-wide text-aurum-muted'>Source Run ID</p>
                    <p className='break-all text-aurum-text'>{selectedReport.sourceRunId}</p>
                  </div>
                  {selectedPortfolioName ? (
                    <div>
                      <p className='text-xs uppercase tracking-wide text-aurum-muted'>
                        Portfolio Name
                      </p>
                      <p className='text-aurum-text'>{selectedPortfolioName}</p>
                    </div>
                  ) : null}
                  {selectedSnapshotDate ? (
                    <div>
                      <p className='text-xs uppercase tracking-wide text-aurum-muted'>
                        Snapshot Date
                      </p>
                      <p className='text-aurum-text'>{selectedSnapshotDate}</p>
                    </div>
                  ) : null}
                </div>

                <div className='space-y-2'>
                  <p className='text-sm font-medium text-aurum-text'>Content (Markdown)</p>
                  <pre className='max-h-[560px] overflow-auto rounded-[12px] border border-aurum-border bg-aurum-surface p-3 text-xs whitespace-pre-wrap text-aurum-text'>
                    {selectedReport.contentMarkdown}
                  </pre>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    </PageContainer>
  );
}
