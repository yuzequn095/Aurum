import type { Insight, InsightSeverity, MonthlyReportContext } from '../types';

export type LlmMonthlyContext = MonthlyReportContext;
export type LlmInsight = Insight;

const ALLOWED_SEVERITIES = ['info', 'warn', 'good', 'error'] as const;
const MAX_INSIGHTS = 6;
const MAX_BODY_LENGTH = 240;

export type LlmPromptMessages = {
  system: string;
  user: string;
};

export class LlmResponseValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmResponseValidationError';
  }
}

export function buildLlmPrompt(context: LlmMonthlyContext): LlmPromptMessages {
  const { summary, categoryBreakdown } = context;
  const categories = categoryBreakdown.totals.map((item) => ({
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    expenseCents: item.expenseCents,
  }));

  return {
    system:
      'You are Aurum Insights Engine. Output only strict JSON with shape: {"insights":[{"id":"...","title":"...","body":"...","severity":"info|warn|good|error","meta":{}}]}. No markdown. No code fences. No extra text.',
    user: JSON.stringify(
      {
        instruction: `Generate concise monthly finance insights. Keep each body <= ${MAX_BODY_LENGTH} characters.`,
        summary: {
          totals: summary.totals,
          deltaPercent: summary.deltaPercent,
          previousMonth: summary.previousMonth?.totals ?? null,
        },
        categoryBreakdown: categories,
      },
      null,
      2,
    ),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isInsightSeverity(value: unknown): value is InsightSeverity {
  return (
    typeof value === 'string' &&
    (ALLOWED_SEVERITIES as readonly string[]).includes(value)
  );
}

function normalizeBody(body: string): string {
  const trimmed = body.trim();
  if (trimmed.length <= MAX_BODY_LENGTH) return trimmed;
  return `${trimmed.slice(0, MAX_BODY_LENGTH - 3)}...`;
}

function clampConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 0.6;
  }
  return Math.max(0, Math.min(1, value));
}

function normalizeMeta(meta: unknown): Record<string, unknown> {
  const base = isRecord(meta) ? { ...meta } : {};
  base.confidence = clampConfidence(base.confidence);

  if (typeof base.explain === 'string') {
    const trimmed = base.explain.trim();
    base.explain =
      trimmed.length <= 140 ? trimmed : `${trimmed.slice(0, 137)}...`;
  } else {
    delete base.explain;
  }

  return base;
}

function normalizeOneInsight(raw: unknown, index: number): LlmInsight {
  if (!isRecord(raw)) {
    throw new LlmResponseValidationError(
      `Insight at index ${index} must be an object`,
    );
  }

  const id = raw.id;
  const title = raw.title;
  const body = raw.body;
  const severity = raw.severity;
  const meta = raw.meta;

  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new LlmResponseValidationError(
      `Insight at index ${index} has invalid id`,
    );
  }
  if (typeof title !== 'string' || title.trim().length === 0) {
    throw new LlmResponseValidationError(
      `Insight at index ${index} has invalid title`,
    );
  }
  if (typeof body !== 'string' || body.trim().length === 0) {
    throw new LlmResponseValidationError(
      `Insight at index ${index} has invalid body`,
    );
  }
  if (!isInsightSeverity(severity)) {
    throw new LlmResponseValidationError(
      `Insight at index ${index} has invalid severity`,
    );
  }

  const normalizedId = id.trim();
  const llmId = normalizedId.startsWith('llm:')
    ? normalizedId
    : `llm:${normalizedId}`;

  return {
    id: llmId,
    title: title.trim(),
    body: normalizeBody(body),
    severity,
    meta: normalizeMeta(meta),
  };
}

export function parseAndValidateLlmOutput(rawContent: string): LlmInsight[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new LlmResponseValidationError('LLM output is not valid JSON');
  }

  if (!isRecord(parsed)) {
    throw new LlmResponseValidationError('LLM output must be a JSON object');
  }

  const insightsRaw = parsed.insights;
  if (!Array.isArray(insightsRaw)) {
    throw new LlmResponseValidationError('LLM output must include insights[]');
  }

  const normalized = insightsRaw
    .slice(0, MAX_INSIGHTS)
    .map((insight, index) => normalizeOneInsight(insight, index));
  const deduped: LlmInsight[] = [];
  const seen = new Set<string>();
  for (const insight of normalized) {
    if (seen.has(insight.id)) continue;
    seen.add(insight.id);
    deduped.push(insight);
  }

  return deduped;
}
