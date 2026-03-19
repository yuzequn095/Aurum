'use client';

import { useEffect, useState } from 'react';
import {
  CsvPortfolioSnapshotAdapter,
  portfolioSnapshotToReportInput,
  createPreparedAIRunRecord,
  submitManualResult,
  type AIReportArtifact,
  type FinancialHealthScoreArtifact,
  type PortfolioSnapshot,
} from '@aurum/core';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { mockPortfolioCsvImportInput, mockPortfolioReportManualOutput } from '@/lib/ai/dev-seeds';
import { aiRunRepository } from '@/lib/ai/repositories';
import { createPortfolioSnapshot, listPortfolioSnapshots } from '@/lib/api/portfolio-snapshots';
import { createReportForSnapshot, listAIReportsBySourceSnapshotId } from '@/lib/api/ai-reports';
import {
  createFinancialHealthScoreForSnapshot,
  listFinancialHealthScoresBySourceSnapshotId,
} from '@/lib/api/financial-health-scores';

const runRepository = aiRunRepository;

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
  const [reports, setReports] = useState<AIReportArtifact[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [isReportsLoading, setIsReportsLoading] = useState(false);
  const [reportsStatusMessage, setReportsStatusMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [scores, setScores] = useState<FinancialHealthScoreArtifact[]>([]);
  const [selectedScoreId, setSelectedScoreId] = useState<string | null>(null);
  const [isScoresLoading, setIsScoresLoading] = useState(false);
  const [isGeneratingScore, setIsGeneratingScore] = useState(false);
  const [scoreStatusMessage, setScoreStatusMessage] = useState<string>('');

  const selectedReport = reports.find((report) => report.id === selectedReportId);
  const selectedSnapshot = selectedSnapshotId
    ? snapshots.find((snapshot) => snapshot.id === selectedSnapshotId)
    : undefined;
  const selectedScore = scores.find((score) => score.id === selectedScoreId);
  const selectedScoreResult = selectedScore?.result;
  const selectedScoreInsight = selectedScore?.insight;

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
        return hasCurrent ? currentSelectedId : (nextSnapshots[0].id ?? null);
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

  const loadReportsForSelectedSnapshot = async (sourceSnapshotId: string | null) => {
    if (!sourceSnapshotId) {
      setReports([]);
      setSelectedReportId(null);
      setReportsStatusMessage('Select a portfolio snapshot to view report history.');
      return;
    }

    setIsReportsLoading(true);
    setReportsStatusMessage('');

    try {
      const nextReports = await listAIReportsBySourceSnapshotId(sourceSnapshotId);
      setReports(nextReports);
      setSelectedReportId((currentSelectedId) => {
        const hasCurrent = currentSelectedId
          ? nextReports.some((report) => report.id === currentSelectedId)
          : false;
        return hasCurrent ? currentSelectedId : (nextReports[0]?.id ?? null);
      });
      if (nextReports.length === 0) {
        setReportsStatusMessage('No reports found for the selected snapshot yet.');
      } else {
        setReportsStatusMessage(`Loaded ${nextReports.length} reports for selected snapshot.`);
      }
    } catch (error) {
      setReportsStatusMessage(
        error instanceof Error ? error.message : 'Failed to load reports from API.',
      );
    } finally {
      setIsReportsLoading(false);
    }
  };

  const loadScoresForSelectedSnapshot = async (sourceSnapshotId: string | null) => {
    if (!sourceSnapshotId) {
      setScores([]);
      setSelectedScoreId(null);
      setScoreStatusMessage('Select a portfolio snapshot to view score history.');
      return;
    }

    setIsScoresLoading(true);
    setScoreStatusMessage('');

    try {
      const nextScores = await listFinancialHealthScoresBySourceSnapshotId(sourceSnapshotId);
      setScores(nextScores);
      setSelectedScoreId((currentSelectedId) => {
        const hasCurrent = currentSelectedId
          ? nextScores.some((score) => score.id === currentSelectedId)
          : false;
        return hasCurrent ? currentSelectedId : (nextScores[0]?.id ?? null);
      });
      if (nextScores.length === 0) {
        setScoreStatusMessage('No financial health scores found for selected snapshot yet.');
      } else {
        setScoreStatusMessage(`Loaded ${nextScores.length} score artifacts for selected snapshot.`);
      }
    } catch (error) {
      setScoreStatusMessage(
        error instanceof Error ? error.message : 'Failed to load score history from API.',
      );
    } finally {
      setIsScoresLoading(false);
    }
  };

  useEffect(() => {
    void loadSnapshots();
  }, []);

  useEffect(() => {
    void loadReportsForSelectedSnapshot(selectedSnapshotId);
  }, [selectedSnapshotId]);

  useEffect(() => {
    void loadScoresForSelectedSnapshot(selectedSnapshotId);
  }, [selectedSnapshotId]);

  const onGenerateDemoReport = async () => {
    setIsGenerating(true);
    setStatusMessage('');

    try {
      if (!selectedSnapshot) {
        setStatusMessage('Select a portfolio snapshot before generating a report.');
        return;
      }
      if (!selectedSnapshot.id) {
        setStatusMessage('Selected snapshot is missing an id and cannot load API report history.');
        return;
      }

      const reportInput = portfolioSnapshotToReportInput(selectedSnapshot);
      const preparedRun = createPreparedAIRunRecord(runRepository, {
        taskType: 'portfolio_report_v1',
        payload: reportInput as unknown as Record<string, unknown>,
      });

      const completedRun = submitManualResult(
        runRepository,
        preparedRun.id,
        mockPortfolioReportManualOutput,
      );

      const createdReport = await createReportForSnapshot(selectedSnapshot.id, {
        contentMarkdown: completedRun.rawOutput ?? mockPortfolioReportManualOutput,
        promptVersion: preparedRun.promptVersion,
        sourceRunId: preparedRun.id,
      });

      await loadReportsForSelectedSnapshot(selectedSnapshot.id);
      setSelectedReportId(createdReport.id);
      setStatusMessage(`Server-created snapshot report generated: ${createdReport.id}`);
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

  const onGenerateDemoScore = async () => {
    setIsGeneratingScore(true);
    setScoreStatusMessage('');

    try {
      if (!selectedSnapshot) {
        setScoreStatusMessage('Select a portfolio snapshot before generating a score.');
        return;
      }
      if (!selectedSnapshot.id) {
        setScoreStatusMessage('Selected snapshot is missing an id and cannot create a score.');
        return;
      }

      const createdScore = await createFinancialHealthScoreForSnapshot(selectedSnapshot.id, {
        scoringVersion: '1.0.0',
      });

      await loadScoresForSelectedSnapshot(selectedSnapshot.id);
      setSelectedScoreId(createdScore.id);
      setScoreStatusMessage(`Server-created score artifact generated: ${createdScore.id}`);
    } catch (error) {
      setScoreStatusMessage(
        error instanceof Error ? error.message : 'Failed to generate financial health score',
      );
    } finally {
      setIsGeneratingScore(false);
    }
  };

  return (
    <PageContainer className="space-y-6">
      <Card>
        <CardHeader className="space-y-3">
          <div className="space-y-1">
            <CardTitle>AI Insights</CardTitle>
            <CardDescription>
              Report artifact view for Milestone 11.2. Generate demo data to validate the
              run-to-report pipeline end-to-end.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" onClick={onGenerateDemoReport} disabled={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Report from Selected Snapshot'}
            </Button>
            <span className="text-xs text-aurum-muted">
              Report history is loaded from API, scoped by selected snapshot.
            </span>
          </div>
          {statusMessage ? (
            <p className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text">
              {statusMessage}
            </p>
          ) : null}
        </CardHeader>
      </Card>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Portfolio Snapshots</CardTitle>
              <CardDescription>
                Persisted canonical snapshots from API, used as upcoming analysis source.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                onClick={() => void onCreateDemoSnapshot()}
                disabled={isCreatingSnapshot || isSnapshotsLoading}
              >
                {isCreatingSnapshot ? 'Creating...' : 'Create Demo Snapshot'}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void loadSnapshots()}
                disabled={isSnapshotsLoading || isCreatingSnapshot}
              >
                {isSnapshotsLoading ? 'Loading...' : 'Refresh Snapshots'}
              </Button>
            </div>
            {snapshotsStatusMessage ? (
              <p className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text">
                {snapshotsStatusMessage}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2">
            {snapshots.length === 0 ? (
              <p className="text-sm text-aurum-muted">No snapshots available.</p>
            ) : (
              snapshots.map((snapshot) => (
                <button
                  key={snapshot.id ?? `${snapshot.metadata.snapshotDate}-${snapshot.totalValue}`}
                  type="button"
                  onClick={() => setSelectedSnapshotId(snapshot.id ?? null)}
                  className={`w-full rounded-[12px] border px-3 py-2 text-left text-xs transition ${
                    snapshot.id === selectedSnapshotId
                      ? 'border-[var(--aurum-accent)] bg-[var(--aurum-accent)]/10'
                      : 'border-[var(--aurum-border)] bg-[var(--aurum-surface)] hover:bg-[var(--aurum-surface-alt)]'
                  }`}
                >
                  <p className="font-medium text-aurum-text">
                    {snapshot.metadata.portfolioName ?? 'Untitled Portfolio'}
                  </p>
                  <p className="text-aurum-muted">date: {snapshot.metadata.snapshotDate}</p>
                  <p className="text-aurum-muted">positions: {snapshot.positions.length}</p>
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
          <CardContent className="space-y-4">
            {!selectedSnapshot ? (
              <p className="text-sm text-aurum-muted">Select a snapshot from the list.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Portfolio Name</p>
                  <p className="text-aurum-text">{selectedSnapshotPortfolioName}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Snapshot Date</p>
                  <p className="text-aurum-text">{selectedSnapshot.metadata.snapshotDate}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Total Value</p>
                  <p className="text-aurum-text">{formatMoney(selectedSnapshot.totalValue)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Cash Value</p>
                  <p className="text-aurum-text">
                    {selectedSnapshot.cashValue === undefined
                      ? 'N/A'
                      : formatMoney(selectedSnapshot.cashValue)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">
                    Positions Count
                  </p>
                  <p className="text-aurum-text">{selectedSnapshot.positions.length}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Report List</CardTitle>
            <CardDescription>Select a report artifact to inspect details.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {reportsStatusMessage ? (
              <p className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text">
                {reportsStatusMessage}
              </p>
            ) : null}
            {isReportsLoading ? (
              <p className="text-sm text-aurum-muted">Loading snapshot-scoped report history...</p>
            ) : reports.length === 0 ? (
              <p className="text-sm text-aurum-muted">
                No reports yet. Click &quot;Generate Demo Report&quot; to create one.
              </p>
            ) : (
              reports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedReportId(report.id)}
                  className={`w-full rounded-[12px] border px-3 py-2 text-left text-xs transition ${
                    report.id === selectedReportId
                      ? 'border-[var(--aurum-accent)] bg-[var(--aurum-accent)]/10'
                      : 'border-[var(--aurum-border)] bg-[var(--aurum-surface)] hover:bg-[var(--aurum-surface-alt)]'
                  }`}
                >
                  <p className="font-medium text-aurum-text">{report.title}</p>
                  <p className="text-aurum-muted">type: {report.reportType}</p>
                  <p className="text-aurum-muted">created: {formatDateTime(report.createdAt)}</p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Detail</CardTitle>
            <CardDescription>
              Selected formal report artifact generated from a completed run.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedReport ? (
              <p className="text-sm text-aurum-muted">Select a report from the list.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-aurum-muted">Title</p>
                    <p className="text-aurum-text">{selectedReport.title}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-aurum-muted">Report Type</p>
                    <p className="text-aurum-text">{selectedReport.reportType}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-aurum-muted">
                      Prompt Version
                    </p>
                    <p className="text-aurum-text">{selectedReport.promptVersion}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-aurum-muted">
                      Source Run ID
                    </p>
                    <p className="break-all text-aurum-text">{selectedReport.sourceRunId}</p>
                  </div>
                  {selectedPortfolioName ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-aurum-muted">
                        Portfolio Name
                      </p>
                      <p className="text-aurum-text">{selectedPortfolioName}</p>
                    </div>
                  ) : null}
                  {selectedSnapshotDate ? (
                    <div>
                      <p className="text-xs uppercase tracking-wide text-aurum-muted">
                        Snapshot Date
                      </p>
                      <p className="text-aurum-text">{selectedSnapshotDate}</p>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-aurum-text">Content (Markdown)</p>
                  <pre className="max-h-[560px] overflow-auto rounded-[12px] border border-aurum-border bg-aurum-surface p-3 text-xs whitespace-pre-wrap text-aurum-text">
                    {selectedReport.contentMarkdown}
                  </pre>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="space-y-6">
        <Card>
          <CardHeader className="space-y-3">
            <div className="space-y-1">
              <CardTitle>Financial Health Score v1</CardTitle>
              <CardDescription>
                Server-backed score artifact history scoped by selected snapshot.
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                onClick={() => void onGenerateDemoScore()}
                disabled={isGeneratingScore}
              >
                {isGeneratingScore ? 'Generating...' : 'Generate Score from Selected Snapshot'}
              </Button>
              <span className="text-xs text-aurum-muted">
                Score creation and history are loaded from API, scoped by selected snapshot.
              </span>
            </div>
            {scoreStatusMessage ? (
              <p className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text">
                {scoreStatusMessage}
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-aurum-text">Score History</p>
              {isScoresLoading ? (
                <p className="text-sm text-aurum-muted">Loading snapshot-scoped score history...</p>
              ) : scores.length === 0 ? (
                <p className="text-sm text-aurum-muted">
                  No persisted scores yet. Click &quot;Generate Score from Selected Snapshot&quot;
                  to create one.
                </p>
              ) : (
                <div className="space-y-2">
                  {scores.map((score) => (
                    <button
                      key={score.id}
                      type="button"
                      onClick={() => setSelectedScoreId(score.id)}
                      className={`w-full rounded-[12px] border px-3 py-2 text-left text-xs transition ${
                        score.id === selectedScoreId
                          ? 'border-[var(--aurum-accent)] bg-[var(--aurum-accent)]/10'
                          : 'border-[var(--aurum-border)] bg-[var(--aurum-surface)] hover:bg-[var(--aurum-surface-alt)]'
                      }`}
                    >
                      <p className="font-medium text-aurum-text">
                        {score.result.totalScore}/{score.result.maxScore} -{' '}
                        {score.result.grade.replace('_', ' ')}
                      </p>
                      <p className="text-aurum-muted">created: {formatDateTime(score.createdAt)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!selectedScoreResult || !selectedScoreInsight ? (
              <p className="text-sm text-aurum-muted">
                Select a score artifact from history to view details.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Total Score</p>
                  <p className="text-lg font-semibold text-aurum-text">
                    {selectedScoreResult.totalScore}/{selectedScoreResult.maxScore}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Grade</p>
                  <p className="text-lg font-semibold capitalize text-aurum-text">
                    {selectedScoreResult.grade.replace('_', ' ')}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Headline</p>
                  <p className="text-aurum-text">{selectedScoreInsight.headline}</p>
                </div>
                <div className="md:col-span-2 xl:col-span-4">
                  <p className="text-xs uppercase tracking-wide text-aurum-muted">Summary</p>
                  <p className="text-aurum-text">{selectedScoreInsight.summary}</p>
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
          <CardContent className="space-y-3">
            {!selectedScoreResult ? (
              <p className="text-sm text-aurum-muted">No score result yet.</p>
            ) : (
              selectedScoreResult.breakdown.map((item) => (
                <div
                  key={item.dimension}
                  className="rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium text-aurum-text">
                      {formatDimensionName(item.dimension)}
                    </p>
                    <p className="text-xs text-aurum-muted">
                      {item.score}/{item.maxScore}
                    </p>
                  </div>
                  <p className="mt-1 text-xs font-medium text-aurum-text">{item.label}</p>
                  <p className="mt-1 text-xs text-aurum-muted">{item.reason}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Strengths</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!selectedScoreInsight ? (
                <p className="text-sm text-aurum-muted">No insight yet.</p>
              ) : selectedScoreInsight.strengths.length === 0 ? (
                <p className="text-sm text-aurum-muted">No standout strengths identified.</p>
              ) : (
                selectedScoreInsight.strengths.map((item) => (
                  <p
                    key={item}
                    className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text"
                  >
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
            <CardContent className="space-y-2">
              {!selectedScoreInsight ? (
                <p className="text-sm text-aurum-muted">No insight yet.</p>
              ) : selectedScoreInsight.concerns.length === 0 ? (
                <p className="text-sm text-aurum-muted">No major concerns identified.</p>
              ) : (
                selectedScoreInsight.concerns.map((item) => (
                  <p
                    key={item}
                    className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text"
                  >
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
            <CardContent className="space-y-2">
              {!selectedScoreInsight ? (
                <p className="text-sm text-aurum-muted">No insight yet.</p>
              ) : selectedScoreInsight.nextActions.length === 0 ? (
                <p className="text-sm text-aurum-muted">No urgent action required.</p>
              ) : (
                selectedScoreInsight.nextActions.map((item) => (
                  <p
                    key={item}
                    className="rounded-[10px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text"
                  >
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
