'use client';

import { useMemo, useState } from 'react';
import {
  calculateFinancialHealthScore,
  createPreparedAIRunRecord,
  createReportFromCompletedRun,
  CsvPortfolioSnapshotAdapter,
  getAIRunById,
  listAIRuns,
  portfolioSnapshotToFinancialHealthScoreInput,
  portfolioSnapshotToReportInput,
  submitManualResult,
  type AIRunRecord,
  type AITaskType,
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
  AI_WORKBENCH_SCENARIOS,
  mockPortfolioCsvImportInput,
} from '@/lib/ai/dev-seeds';
import { aiReportRepository, aiRunRepository } from '@/lib/ai/repositories';

const repository = aiRunRepository;

interface IngestionValidationResult {
  sourceType: string;
  snapshotDate: string;
  positionCount: number;
  totalValue: number;
  cashValue?: number;
  mappedReportPortfolioName: string;
  mappedScoreTotalAssets: number;
  scoreTotal: number;
  scoreGrade: string;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function getScenarioByTaskType(taskType: AITaskType) {
  return AI_WORKBENCH_SCENARIOS.find((scenario) => scenario.taskType === taskType);
}

export default function AIWorkbenchPage() {
  const [runs, setRuns] = useState<AIRunRecord[]>(() => listAIRuns(repository));
  const [selectedRunId, setSelectedRunId] = useState<string | null>(runs[0]?.id ?? null);
  const [selectedScenarioTaskType, setSelectedScenarioTaskType] = useState<AITaskType>(
    AI_WORKBENCH_SCENARIOS[0]?.taskType ?? 'portfolio_report_v1',
  );
  const [rawOutput, setRawOutput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [ingestionValidation, setIngestionValidation] =
    useState<IngestionValidationResult | null>(null);

  const selectedScenario = useMemo(
    () =>
      getScenarioByTaskType(selectedScenarioTaskType) ?? AI_WORKBENCH_SCENARIOS[0],
    [selectedScenarioTaskType],
  );
  const selectedRun = selectedRunId ? getAIRunById(repository, selectedRunId) : undefined;
  const selectedRunScenario = selectedRun
    ? getScenarioByTaskType(selectedRun.taskType)
    : selectedScenario;
  const systemMessage =
    selectedRun?.promptPack.messages.find((message) => message.role === 'system')?.content ?? '';
  const userMessage =
    selectedRun?.promptPack.messages.find((message) => message.role === 'user')?.content ?? '';
  const promptMetadata = selectedRun?.promptPack.metadata
    ? JSON.stringify(selectedRun.promptPack.metadata, null, 2)
    : '';

  const refreshRuns = () => {
    const next = listAIRuns(repository);
    setRuns(next);
  };

  const onCreatePreparedRun = () => {
    try {
      const created = createPreparedAIRunRecord(repository, {
        taskType: selectedScenario.taskType,
        payload: selectedScenario.payload,
      });
      setSelectedRunId(created.id);
      setRawOutput(selectedScenario.manualOutputExample ?? '');
      setStatusMessage(
        `Prepared run created for ${selectedScenario.title}: ${created.id}`,
      );
      refreshRuns();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to create run');
    }
  };

  const onCopyPrompt = async () => {
    if (!selectedRun) {
      setStatusMessage('Select a run first.');
      return;
    }

    const combined = ['System message:', systemMessage, '', 'User message:', userMessage].join(
      '\n',
    );

    try {
      await navigator.clipboard.writeText(combined);
      setStatusMessage('Prompt copied to clipboard.');
    } catch {
      setStatusMessage('Clipboard copy failed. Copy manually from the prompt viewer.');
    }
  };

  const onSubmitManualResult = () => {
    if (!selectedRunId) {
      setStatusMessage('Select a run first.');
      return;
    }

    if (!rawOutput.trim()) {
      setStatusMessage('Paste model output before submitting.');
      return;
    }

    try {
      const updated = submitManualResult(repository, selectedRunId, rawOutput.trim());
      setStatusMessage(`Manual result submitted for run: ${updated.id}`);
      refreshRuns();
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to submit result');
    }
  };

  const onLoadExampleOutput = () => {
    if (!selectedRunScenario?.manualOutputExample) {
      setStatusMessage('No example output is defined for this scenario yet.');
      return;
    }

    setRawOutput(selectedRunScenario.manualOutputExample);
    setStatusMessage(`Loaded example output for ${selectedRunScenario.title}.`);
  };

  const onGenerateReportFromRun = () => {
    if (!selectedRunId) {
      setStatusMessage('Select a run first.');
      return;
    }

    const run = getAIRunById(repository, selectedRunId);
    if (!run) {
      setStatusMessage(`AI run not found for id: ${selectedRunId}`);
      return;
    }

    const runScenario = getScenarioByTaskType(run.taskType);
    if (!runScenario?.reportCapable) {
      setStatusMessage('This task is analysis-only in the workbench and does not create a report artifact.');
      return;
    }

    if (run.status !== 'completed') {
      setStatusMessage('Run must be completed before generating a report.');
      return;
    }

    try {
      const report = createReportFromCompletedRun(
        aiReportRepository,
        repository,
        selectedRunId,
      );
      setStatusMessage(`Report generated from run ${selectedRunId}: ${report.id}`);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to generate report');
    }
  };

  const onRunIngestionValidation = () => {
    try {
      const adapter = new CsvPortfolioSnapshotAdapter();
      const snapshot = adapter.toSnapshot(mockPortfolioCsvImportInput);
      const reportInput = portfolioSnapshotToReportInput(snapshot);
      const scoreInput = portfolioSnapshotToFinancialHealthScoreInput(snapshot);
      const scoreResult = calculateFinancialHealthScore(scoreInput);

      setIngestionValidation({
        sourceType: snapshot.metadata.sourceType ?? adapter.sourceType,
        snapshotDate: snapshot.metadata.snapshotDate,
        positionCount: snapshot.positions.length,
        totalValue: snapshot.totalValue,
        cashValue: snapshot.cashValue,
        mappedReportPortfolioName: reportInput.portfolioName,
        mappedScoreTotalAssets: scoreInput.totalAssets,
        scoreTotal: scoreResult.totalScore,
        scoreGrade: scoreResult.grade,
      });
      setStatusMessage('Ingestion validation completed successfully.');
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Failed to run ingestion validation');
    }
  };

  return (
    <PageContainer className='space-y-6'>
      <header className='space-y-2'>
        <h1 className='text-2xl font-semibold tracking-tight text-aurum-text'>AI Workbench</h1>
        <p className='text-sm text-aurum-muted'>
          Developer validation surface for preset task prompt packs, manual provider flows, and
          no-key AI workflow checks.
        </p>
        <p className='text-xs text-aurum-muted'>
          Prepared runs and generated local report artifacts are stored in browser localStorage for
          repeatable manual testing.
        </p>
      </header>

      {statusMessage ? (
        <div className='rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-2 text-xs text-aurum-text'>
          {statusMessage}
        </div>
      ) : null}

      <section className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
        <Card>
          <CardHeader>
            <CardTitle>1. Preset Task Scenarios</CardTitle>
            <CardDescription>
              Create prepared runs for system-owned prompt packs without requiring a live API key.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='grid gap-2'>
              {AI_WORKBENCH_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.taskType}
                  type='button'
                  onClick={() => setSelectedScenarioTaskType(scenario.taskType)}
                  className={`w-full rounded-[12px] border px-3 py-3 text-left text-sm ${
                    scenario.taskType === selectedScenario.taskType
                      ? 'border-[var(--aurum-accent)] bg-[var(--aurum-accent)]/10'
                      : 'border-[var(--aurum-border)] bg-[var(--aurum-surface)]'
                  }`}
                >
                  <div className='font-medium text-aurum-text'>{scenario.title}</div>
                  <div className='mt-1 text-xs text-aurum-muted'>{scenario.description}</div>
                  <div className='mt-2 text-[11px] uppercase tracking-wide text-aurum-muted'>
                    {scenario.taskType} • {scenario.reportCapable ? 'report-capable' : 'analysis-only'}
                  </div>
                </button>
              ))}
            </div>

            <div className='rounded-[12px] border border-aurum-border bg-aurum-surface p-3 text-xs text-aurum-text'>
              <p className='font-medium'>{selectedScenario.title} payload preview</p>
              <pre className='mt-2 max-h-64 overflow-auto whitespace-pre-wrap'>
                {JSON.stringify(selectedScenario.payload, null, 2)}
              </pre>
            </div>

            <Button variant='primary' onClick={onCreatePreparedRun}>
              Create Prepared Run
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Prepared Run List</CardTitle>
            <CardDescription>
              Inspect prepared runs, switch between prompt packs, and continue manual validation.
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-2'>
            {runs.length === 0 ? (
              <p className='text-sm text-aurum-muted'>No runs yet.</p>
            ) : (
              runs.map((run) => (
                <button
                  key={run.id}
                  type='button'
                  onClick={() => {
                    setSelectedRunId(run.id);
                    setRawOutput(run.rawOutput ?? '');
                    setSelectedScenarioTaskType(run.taskType);
                  }}
                  className={`w-full rounded-[12px] border px-3 py-2 text-left text-xs ${
                    run.id === selectedRunId
                      ? 'border-[var(--aurum-accent)] bg-[var(--aurum-accent)]/10'
                      : 'border-[var(--aurum-border)] bg-[var(--aurum-surface)]'
                  }`}
                >
                  <div className='font-medium'>{run.id}</div>
                  <div className='text-aurum-muted'>
                    {run.taskType} | {run.status} | {run.provider}
                  </div>
                  <div className='text-aurum-muted'>createdAt: {run.createdAt}</div>
                  {run.inputSummary ? (
                    <div className='mt-1 text-aurum-muted'>{run.inputSummary}</div>
                  ) : null}
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>3. Prompt Pack Viewer</CardTitle>
          <CardDescription>
            Inspect the structured prompt pack exactly as the manual provider prepares it.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {!selectedRun ? (
            <p className='text-sm text-aurum-muted'>Select or create a run first.</p>
          ) : (
            <>
              <div className='grid grid-cols-1 gap-2 text-sm md:grid-cols-2 xl:grid-cols-5'>
                <div>
                  <p className='text-xs uppercase tracking-wide text-aurum-muted'>Provider</p>
                  <p>{selectedRun.provider}</p>
                </div>
                <div>
                  <p className='text-xs uppercase tracking-wide text-aurum-muted'>Execution Mode</p>
                  <p>{selectedRun.executionMode}</p>
                </div>
                <div>
                  <p className='text-xs uppercase tracking-wide text-aurum-muted'>Prompt Version</p>
                  <p>{selectedRun.promptVersion}</p>
                </div>
                <div>
                  <p className='text-xs uppercase tracking-wide text-aurum-muted'>Output Format</p>
                  <p>{selectedRun.promptPack.expectedOutputFormat ?? 'markdown'}</p>
                </div>
                <div>
                  <p className='text-xs uppercase tracking-wide text-aurum-muted'>Status</p>
                  <p>{selectedRun.status}</p>
                </div>
              </div>

              {selectedRun.promptPack.instructions?.length ? (
                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Prompt Instructions</p>
                  <ul className='ml-5 list-disc text-sm text-aurum-text'>
                    {selectedRun.promptPack.instructions.map((instruction) => (
                      <li key={instruction}>{instruction}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {promptMetadata ? (
                <div className='space-y-2'>
                  <p className='text-sm font-medium'>Prompt Metadata</p>
                  <pre className='max-h-48 overflow-auto rounded-[12px] border border-aurum-border bg-aurum-surface p-3 text-xs whitespace-pre-wrap'>
                    {promptMetadata}
                  </pre>
                </div>
              ) : null}

              <div className='space-y-2'>
                <p className='text-sm font-medium'>System Message</p>
                <pre className='max-h-48 overflow-auto rounded-[12px] border border-aurum-border bg-aurum-surface p-3 text-xs whitespace-pre-wrap'>
                  {systemMessage}
                </pre>
              </div>

              <div className='space-y-2'>
                <p className='text-sm font-medium'>User Message</p>
                <pre className='max-h-72 overflow-auto rounded-[12px] border border-aurum-border bg-aurum-surface p-3 text-xs whitespace-pre-wrap'>
                  {userMessage}
                </pre>
              </div>

              <Button variant='secondary' onClick={() => void onCopyPrompt()}>
                Copy Prompt (System + User)
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Manual Result Submission</CardTitle>
          <CardDescription>
            Paste an external model response or load an example output to complete the run manually.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <textarea
            value={rawOutput}
            onChange={(event) => setRawOutput(event.target.value)}
            placeholder='Paste model output here...'
            rows={10}
            className='w-full rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-2 text-sm text-aurum-text'
          />
          <div className='flex flex-wrap gap-2'>
            <Button variant='primary' onClick={onSubmitManualResult}>
              Submit Manual Result
            </Button>
            <Button variant='secondary' onClick={onGenerateReportFromRun}>
              Generate Report from Run
            </Button>
            <Button variant='secondary' onClick={onLoadExampleOutput}>
              Load Example Output
            </Button>
          </div>
          {selectedRunScenario ? (
            <p className='text-xs text-aurum-muted'>
              {selectedRunScenario.reportCapable
                ? 'This task can generate a local report artifact after the manual result is submitted.'
                : 'This task is currently validation-only in the workbench and does not map to a report artifact.'}
            </p>
          ) : null}
          {selectedRun?.rawOutput ? (
            <div className='space-y-2'>
              <p className='text-sm font-medium'>Saved Raw Output</p>
              <pre className='max-h-72 overflow-auto rounded-[12px] border border-aurum-border bg-aurum-surface p-3 text-xs whitespace-pre-wrap'>
                {selectedRun.rawOutput}
              </pre>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5. Ingestion Validation</CardTitle>
          <CardDescription>
            Validate the adapter and mapper chain from CSV-shaped input to snapshot, report input,
            and score input.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <Button variant='secondary' onClick={onRunIngestionValidation}>
            Run Ingestion Validation
          </Button>

          {!ingestionValidation ? (
            <p className='text-sm text-aurum-muted'>No ingestion validation result yet.</p>
          ) : (
            <div className='grid grid-cols-1 gap-2 text-sm md:grid-cols-2 xl:grid-cols-4'>
              <p>
                <span className='font-medium'>Source Type:</span>{' '}
                {ingestionValidation.sourceType}
              </p>
              <p>
                <span className='font-medium'>Snapshot Date:</span>{' '}
                {ingestionValidation.snapshotDate}
              </p>
              <p>
                <span className='font-medium'>Position Count:</span>{' '}
                {ingestionValidation.positionCount}
              </p>
              <p>
                <span className='font-medium'>Total Value:</span>{' '}
                {formatMoney(ingestionValidation.totalValue)}
              </p>
              <p>
                <span className='font-medium'>Cash Value:</span>{' '}
                {formatMoney(ingestionValidation.cashValue ?? 0)}
              </p>
              <p>
                <span className='font-medium'>Mapped Report Name:</span>{' '}
                {ingestionValidation.mappedReportPortfolioName}
              </p>
              <p>
                <span className='font-medium'>Mapped Score Total Assets:</span>{' '}
                {formatMoney(ingestionValidation.mappedScoreTotalAssets)}
              </p>
              <p>
                <span className='font-medium'>Score Result:</span>{' '}
                {ingestionValidation.scoreTotal} ({ingestionValidation.scoreGrade})
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
