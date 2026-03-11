'use client';

import { useMemo, useState } from 'react';
import {
  createPreparedAIRunRecord,
  getAIRunById,
  listAIRuns,
  submitManualResult,
  type AIRunRecord,
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
import { mockPortfolioReportInput } from '@/lib/ai/dev-seeds';
import { aiRunRepository } from '@/lib/ai/repositories';

const repository = aiRunRepository;

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export default function AIWorkbenchPage() {
  const [runs, setRuns] = useState<AIRunRecord[]>(() => listAIRuns(repository));
  const [selectedRunId, setSelectedRunId] = useState<string | null>(runs[0]?.id ?? null);
  const [rawOutput, setRawOutput] = useState('');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const selectedRun = selectedRunId ? getAIRunById(repository, selectedRunId) : undefined;
  const systemMessage =
    selectedRun?.promptPack.messages.find((message) => message.role === 'system')?.content ?? '';
  const userMessage =
    selectedRun?.promptPack.messages.find((message) => message.role === 'user')?.content ?? '';

  const topPositions = useMemo(
    () =>
      [...mockPortfolioReportInput.positions]
        .sort((a, b) => b.marketValue - a.marketValue)
        .slice(0, 3),
    [],
  );

  const refreshRuns = () => {
    const next = listAIRuns(repository);
    setRuns(next);
  };

  const onCreatePreparedRun = () => {
    try {
      const created = createPreparedAIRunRecord(repository, {
        taskType: 'portfolio_report_v1',
        payload: mockPortfolioReportInput as unknown as Record<string, unknown>,
      });
      setSelectedRunId(created.id);
      setRawOutput('');
      setStatusMessage(`Prepared run created: ${created.id}`);
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

    const combined = [
      'System message:',
      systemMessage,
      '',
      'User message:',
      userMessage,
    ].join('\n');

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

  return (
    <PageContainer className='space-y-6'>
      <header className='space-y-2'>
        <h1 className='text-2xl font-semibold tracking-tight text-aurum-text'>AI Workbench</h1>
        <p className='text-sm text-aurum-muted'>
          Developer validation page for Milestone 11.1 manual AI workflow.
        </p>
        <p className='text-xs text-aurum-muted'>
          Data is persisted in browser localStorage and shared across AI pages.
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
            <CardTitle>1. Input / Scenario</CardTitle>
            <CardDescription>Mock PortfolioReportInput used for validation.</CardDescription>
          </CardHeader>
          <CardContent className='space-y-3 text-sm text-aurum-text'>
            <p>
              <span className='font-medium'>Portfolio:</span> {mockPortfolioReportInput.portfolioName}
            </p>
            <p>
              <span className='font-medium'>Snapshot Date:</span>{' '}
              {mockPortfolioReportInput.snapshotDate}
            </p>
            <p>
              <span className='font-medium'>Total Value:</span>{' '}
              {formatMoney(mockPortfolioReportInput.totalValue)}
            </p>
            <p>
              <span className='font-medium'>Cash:</span>{' '}
              {formatMoney(mockPortfolioReportInput.cashValue ?? 0)}
            </p>
            <div>
              <p className='font-medium'>Top Positions:</p>
              <ul className='ml-5 list-disc'>
                {topPositions.map((position) => (
                  <li key={position.symbol}>
                    {position.symbol} - {formatMoney(position.marketValue)}
                  </li>
                ))}
              </ul>
            </div>
            <Button variant='primary' onClick={onCreatePreparedRun}>
              Create Prepared Run
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>2. Run List</CardTitle>
            <CardDescription>Select a run to inspect or submit output.</CardDescription>
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
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>3. Prompt Pack Viewer</CardTitle>
          <CardDescription>Inspect metadata and prompt messages for selected run.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {!selectedRun ? (
            <p className='text-sm text-aurum-muted'>Select or create a run first.</p>
          ) : (
            <>
              <div className='grid grid-cols-1 gap-2 text-sm md:grid-cols-2 xl:grid-cols-4'>
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
                  <p className='text-xs uppercase tracking-wide text-aurum-muted'>Status</p>
                  <p>{selectedRun.status}</p>
                </div>
              </div>

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
          <CardDescription>Paste external model output and mark the run completed.</CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          <textarea
            value={rawOutput}
            onChange={(event) => setRawOutput(event.target.value)}
            placeholder='Paste model output here...'
            rows={10}
            className='w-full rounded-[12px] border border-aurum-border bg-aurum-surface px-3 py-2 text-sm text-aurum-text'
          />
          <div className='flex gap-2'>
            <Button variant='primary' onClick={onSubmitManualResult}>
              Submit Manual Result
            </Button>
          </div>
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
    </PageContainer>
  );
}
