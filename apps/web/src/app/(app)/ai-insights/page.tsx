'use client';

import { useEffect, useState } from 'react';
import {
  buildFinancialHealthInsight,
  calculateFinancialHealthScore,
  CsvPortfolioSnapshotAdapter,
  portfolioSnapshotToFinancialHealthScoreInput,
  portfolioSnapshotToReportInput,
  createPreparedAIRunRecord,
  createReportFromCompletedRun,
  getAIReportById,
  listAIReports,
  submitManualResult,
  type AIReportArtifact,
  type FinancialHealthInsight,
  type FinancialHealthScoreResult,
  type PortfolioSnapshot,
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
import {
  mockPortfolioCsvImportInput,
  mockPortfolioReportManualOutput,
} from '@/lib/ai/dev-seeds';
import { aiReportRepository, aiRunRepository } from '@/lib/ai/repositories';
import {
  createPortfolioSnapshot,
  listPortfolioSnapshots,
} from '@/lib/api/portfolio-snapshots';

const runRepository = aiRunRepository;
const reportRepository = aiReportRepository;

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

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

function formatDimensionName(value: string): string {
  return value
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export default function AiInsightsPage() {
  const [snapshots, setSnapshots] = useState<PortfolioSnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [isSnapshotsLoading, setIsSnapshotsLoading] = useState(false);
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [snapshotsStatusMessage, setSnapshotsStatusMessage] = useState('');
  const [reports, setReports] = useState<AIReportArtifact[]>(() => listAIReports(reportRepository));
  const [selectedReportId, setSelectedReportId] = useState<string | null>(reports[0]?.id ?? null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scoreStatusMessage, setScoreStatusMessage] = useState<string>('');
  const [scoreResult, setScoreResult] = useState<FinancialHealthScoreResult | null>(null);
  const [scoreInsight, setScoreInsight] = useState<FinancialHealthInsight | null>(null);

  const selectedReport = selectedReportId
    ? getAIReportById(reportRepository, selectedReportId)
    : undefined;
  const selectedSnapshot = selectedSnapshotId
    ? snapshots.find((snapshot) => snapshot.id === selectedSnapshotId)
    : undefined;

  const loadSnapshots = async () => {
    setIsSnapshotsLoading(true);
    setSnapshotsStatusMessage('');

    try {
      const nextSnapshots = await listPortfolioSnapshots();
      setSnapshots(nextSnapshots);

      if (nextSnapshots.length === 0) {
        setSelectedSnapshotId(null);
        setSnapshotsStatusMessage('No persisted snapshots found yet.');
        return;
      }

      setSelectedSnapshotId((currentSelectedId) => {
        const hasCurrent = currentSelectedId
          ? nextSnapshots.some((snapshot) => snapshot.id === currentSelectedId)
          : false;
        return hasCurrent ? currentSelectedId : nextSnapshots[0].id ?? null;
      });
      setSnapshotsStatusMessage(`Loaded ${nextSnapshots.length} persisted snapshots.`);
    } catch (error) {
      setSnapshotsStatusMessage(
        error instanceof Error ? error.message : 'Failed to load snapshots from API.',
      );
    } finally {
      setIsSnapshotsLoading(false);
    }
  };

  useEffect(() => {
    void loadSnapshots();
  }, []);

  const refreshReports = () => {
    setReports(listAIReports(reportRepository));
  };

  const onGenerateDemoReport = () => {
    setIsGenerating(true);
    setStatusMessage('');

    try {
      if (!selectedSnapshot) {
        setStatusMessage('Select a portfolio snapshot before generating a report.');
        return;
      }

      const reportInput = portfolioSnapshotToReportInput(selectedSnapshot);
      const preparedRun = createPreparedAIRunRecord(runRepository, {
        taskType: 'portfolio_report_v1',
        payload: reportInput as unknown as Record<string, unknown>,
      });

      submitManualResult(runRepository, preparedRun.id, mockPortfolioReportManualOutput);

      const report = createReportFromCompletedRun(
        reportRepository,
        runRepository,
        preparedRun.id,
      );

      refreshReports();
      setSelectedReportId(report.id);
      setStatusMessage(`Snapshot-driven demo report generated: ${report.id}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to generate demo report');
    } finally {
      setIsGenerating(false);
    }
  };

  const selectedPortfolioName = getStringMetadataValue(selectedReport, 'portfolioName');
  const selectedSnapshotDate = getStringMetadataValue(selectedReport, 'snapshotDate');
  const selectedSnapshotPortfolioName =
    selectedSnapshot?.metadata.portfolioName ?? 'Untitled Portfolio';

  const onCreateDemoSnapshot = async () => {
    setIsCreatingSnapshot(true);
    setSnapshotsStatusMessage('');

    try {
      const adapter = new CsvPortfolioSnapshotAdapter();
      const snapshot = adapter.toSnapshot(mockPortfolioCsvImportInput);
      const created = await createPortfolioSnapshot(snapshot);

      await loadSnapshots();
      setSelectedSnapshotId(created.id ?? null);
      setSnapshotsStatusMessage(`Demo snapshot created: ${created.id}`);
    } catch (error) {
      setSnapshotsStatusMessage(
        error instanceof Error ? error.message : 'Failed to create demo snapshot.',
      );
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const onGenerateDemoScore = () => {
    try {
      if (!selectedSnapshot) {
        setScoreStatusMessage('Select a portfolio snapshot before generating a score.');
        return;
      }

      const scoreInput = portfolioSnapshotToFinancialHealthScoreInput(selectedSnapshot);
      const result = calculateFinancialHealthScore(scoreInput);
      const insight = buildFinancialHealthInsight(result);

      setScoreResult(result);
      setScoreInsight(insight);
      setScoreStatusMessage(
        `Snapshot-driven score generated at ${formatDateTime(result.createdAt)}`,
      );
    } catch (error) {
      setScoreStatusMessage(error instanceof Error ? error.message : 'Failed to generate demo score');
    }
  };

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
              {isGenerating ? 'Generating...' : 'Generate Report from Selected Snapshot'}
            </Button>
            <span className='text-xs text-aurum-muted'>
              Run/report data is persisted in browser localStorage and shared across AI pages.
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
          <CardHeader className='space-y-3'>
            <div className='space-y-1'>
              <CardTitle>Portfolio Snapshots</CardTitle>
              <CardDescription>
                Persisted canonical snapshots from API, used as upcoming analysis source.
              </CardDescription>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='primary'
                onClick={() => void onCreateDemoSnapshot()}
                disabled={isCreatingSnapshot || isSnapshotsLoading}
              >
                {isCreatingSnapshot ? 'Creating...' : 'Create Demo Snapshot'}
              </Button>
              <Button
                variant='secondary'
                onClick={() => void loadSnapshots()}
                disabled={isSnapshotsLoading || isCreatingSnapshot}
              >
                {isSnapshotsLoading ? 'Loading...' : 'Refresh Snapshots'}
              </Button>
            </div>
            {snapshotsStatusMessage ? (
              <p className='rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text'>
                {snapshotsStatusMessage}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className='space-y-2'>
            {snapshots.length === 0 ? (
              <p className='text-sm text-aurum-muted'>No snapshots available.</p>
            ) : (
              snapshots.map((snapshot) => (
                <button
                  key={snapshot.id ?? `${snapshot.metadata.snapshotDate}-${snapshot.totalValue}`}
                  type='button'
                  onClick={() => setSelectedSnapshotId(snapshot.id ?? null)}
                  className={`w-full rounded-[12px] border px-3 py-2 text-left text-xs transition ${
                    snapshot.id === selectedSnapshotId
                      ? 'border-[var(--aurum-accent)] bg-[var(--aurum-accent)]/10'
                      : 'border-[var(--aurum-border)] bg-[var(--aurum-surface)] hover:bg-[var(--aurum-surface-alt)]'
                  }`}
                >
                  <p className='font-medium text-aurum-text'>
                    {snapshot.metadata.portfolioName ?? 'Untitled Portfolio'}
                  </p>
                  <p className='text-aurum-muted'>date: {snapshot.metadata.snapshotDate}</p>
                  <p className='text-aurum-muted'>positions: {snapshot.positions.length}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Selected Snapshot Summary</CardTitle>
            <CardDescription>
              Snapshot selection foundation for upcoming snapshot-driven report/score flow.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {!selectedSnapshot ? (
              <p className='text-sm text-aurum-muted'>
                Select a snapshot from the list.
              </p>
            ) : (
              <div className='grid grid-cols-1 gap-3 text-sm md:grid-cols-2'>
                <div>
                  <p className='text-xs uppercase tracking-wide text-aurum-muted'>
                    Portfolio Name
                  </p>
                  <p className='text-aurum-text'>{selectedSnapshotPortfolioName}</p>
                </div>
                <div>
                  <p className='text-xs uppercase tracking-wide text-aurum-muted'>Snapshot Date</p>
                  <p className='text-aurum-text'>{selectedSnapshot.metadata.snapshotDate}</p>
                </div>
                <div>
                  <p className='text-xs uppercase tracking-wide text-aurum-muted'>Total Value</p>
                  <p className='text-aurum-text'>{formatMoney(selectedSnapshot.totalValue)}</p>
                </div>
                <div>
                  <p className='text-xs uppercase tracking-wide text-aurum-muted'>Cash Value</p>
                  <p className='text-aurum-text'>
                    {selectedSnapshot.cashValue === undefined
                      ? 'N/A'
                      : formatMoney(selectedSnapshot.cashValue)}
                  </p>
                </div>
                <div>
                  <p className='text-xs uppercase tracking-wide text-aurum-muted'>Positions Count</p>
                  <p className='text-aurum-text'>{selectedSnapshot.positions.length}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

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

      <section className='space-y-6'>
        <Card>
          <CardHeader className='space-y-3'>
            <div className='space-y-1'>
              <CardTitle>Financial Health Score v1</CardTitle>
              <CardDescription>
                Deterministic score and deterministic insight generated from shared core logic.
              </CardDescription>
            </div>
            <div className='flex flex-wrap items-center gap-2'>
              <Button variant='primary' onClick={onGenerateDemoScore}>
                Generate Score from Selected Snapshot
              </Button>
              <span className='text-xs text-aurum-muted'>
                Uses selected persisted snapshot and in-memory component state only.
              </span>
            </div>
            {scoreStatusMessage ? (
              <p className='rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text'>
                {scoreStatusMessage}
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            {!scoreResult || !scoreInsight ? (
              <p className='text-sm text-aurum-muted'>
                Click "Generate Demo Score" to run the deterministic Financial Health Score flow.
              </p>
            ) : (
              <div className='grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-4'>
                <div>
                  <p className='text-xs uppercase tracking-wide text-aurum-muted'>Total Score</p>
                  <p className='text-lg font-semibold text-aurum-text'>
                    {scoreResult.totalScore}/{scoreResult.maxScore}
                  </p>
                </div>
                <div>
                  <p className='text-xs uppercase tracking-wide text-aurum-muted'>Grade</p>
                  <p className='text-lg font-semibold capitalize text-aurum-text'>
                    {scoreResult.grade.replace('_', ' ')}
                  </p>
                </div>
                <div className='md:col-span-2'>
                  <p className='text-xs uppercase tracking-wide text-aurum-muted'>Headline</p>
                  <p className='text-aurum-text'>{scoreInsight.headline}</p>
                </div>
                <div className='md:col-span-2 xl:col-span-4'>
                  <p className='text-xs uppercase tracking-wide text-aurum-muted'>Summary</p>
                  <p className='text-aurum-text'>{scoreInsight.summary}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dimension Breakdown</CardTitle>
            <CardDescription>
              Per-dimension deterministic scores, labels, and reasoning from the score engine.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            {!scoreResult ? (
              <p className='text-sm text-aurum-muted'>No score result yet.</p>
            ) : (
              scoreResult.breakdown.map((item) => (
                <div
                  key={item.dimension}
                  className='rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-3 text-sm'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <p className='font-medium text-aurum-text'>
                      {formatDimensionName(item.dimension)}
                    </p>
                    <p className='text-xs text-aurum-muted'>
                      {item.score}/{item.maxScore}
                    </p>
                  </div>
                  <p className='mt-1 text-xs font-medium text-aurum-text'>{item.label}</p>
                  <p className='mt-1 text-xs text-aurum-muted'>{item.reason}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <section className='grid grid-cols-1 gap-6 xl:grid-cols-3'>
          <Card>
            <CardHeader>
              <CardTitle>Strengths</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              {!scoreInsight ? (
                <p className='text-sm text-aurum-muted'>No insight yet.</p>
              ) : scoreInsight.strengths.length === 0 ? (
                <p className='text-sm text-aurum-muted'>No standout strengths identified.</p>
              ) : (
                scoreInsight.strengths.map((item) => (
                  <p key={item} className='rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text'>
                    {item}
                  </p>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Concerns</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              {!scoreInsight ? (
                <p className='text-sm text-aurum-muted'>No insight yet.</p>
              ) : scoreInsight.concerns.length === 0 ? (
                <p className='text-sm text-aurum-muted'>No major concerns identified.</p>
              ) : (
                scoreInsight.concerns.map((item) => (
                  <p key={item} className='rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text'>
                    {item}
                  </p>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Next Actions</CardTitle>
            </CardHeader>
            <CardContent className='space-y-2'>
              {!scoreInsight ? (
                <p className='text-sm text-aurum-muted'>No insight yet.</p>
              ) : scoreInsight.nextActions.length === 0 ? (
                <p className='text-sm text-aurum-muted'>No urgent action required.</p>
              ) : (
                scoreInsight.nextActions.map((item) => (
                  <p key={item} className='rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text'>
                    {item}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </section>
      </section>
    </PageContainer>
  );
}
