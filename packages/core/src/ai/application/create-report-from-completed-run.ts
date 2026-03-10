import type { AIRunRepository } from '../repository';
import type { AIReportArtifact, AIReportRepository, AIReportType } from '../reports';
import type { AIRunRecord } from '../types';

function generateAIReportId(): string {
  return `aireport_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function deriveReportType(taskType: AIRunRecord['taskType']): AIReportType {
  if (taskType === 'portfolio_report_v1') {
    return 'portfolio_report_v1';
  }

  throw new Error(`No AI report type mapping defined for task type: ${taskType}`);
}

function deriveReportTitle(run: AIRunRecord): string {
  const portfolioName = run.promptPack.metadata?.portfolioName;

  if (run.taskType === 'portfolio_report_v1' && typeof portfolioName === 'string') {
    return `${portfolioName} - Portfolio Report`;
  }

  if (run.taskType === 'portfolio_report_v1') {
    return 'Portfolio Report';
  }

  return run.promptPack.title;
}

function deriveReportMetadata(run: AIRunRecord): Record<string, unknown> {
  const metadata: Record<string, unknown> = {
    sourceTaskType: run.taskType,
  };

  const portfolioName = run.promptPack.metadata?.portfolioName;
  if (typeof portfolioName === 'string') {
    metadata.portfolioName = portfolioName;
  }

  const snapshotDate = run.promptPack.metadata?.snapshotDate;
  if (typeof snapshotDate === 'string') {
    metadata.snapshotDate = snapshotDate;
  }

  return metadata;
}

export function createReportFromCompletedRun(
  reportRepository: AIReportRepository,
  runRepository: AIRunRepository,
  runId: string,
): AIReportArtifact {
  const run = runRepository.getById(runId);

  if (!run) {
    throw new Error(`AI run not found for id: ${runId}`);
  }

  if (run.status !== 'completed') {
    throw new Error(
      `Cannot create report from run ${runId}: expected status "completed", got "${run.status}"`,
    );
  }

  if (!run.rawOutput || run.rawOutput.trim().length === 0) {
    throw new Error(`Cannot create report from run ${runId}: raw output is missing or empty`);
  }

  const now = new Date().toISOString();

  const report: AIReportArtifact = {
    id: generateAIReportId(),
    reportType: deriveReportType(run.taskType),
    taskType: run.taskType,
    sourceRunId: run.id,
    title: deriveReportTitle(run),
    contentMarkdown: run.rawOutput,
    promptVersion: run.promptVersion,
    createdAt: now,
    updatedAt: now,
    metadata: deriveReportMetadata(run),
  };

  return reportRepository.create(report);
}
