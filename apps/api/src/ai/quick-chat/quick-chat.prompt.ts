import type {
  AIReportArtifact,
  FinancialHealthScoreArtifact,
  PortfolioSnapshot,
} from '@aurum/core';
import type { QuickChatCompletionMessage } from './openai-compatible-chat.client';

export interface QuickChatResolvedContext {
  snapshot?: PortfolioSnapshot;
  report?: AIReportArtifact;
  score?: FinancialHealthScoreArtifact;
}

function formatMoney(value: number | undefined, currency = 'USD'): string {
  if (value == null) {
    return 'n/a';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function trimLine(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function buildContextBlock(context: QuickChatResolvedContext): string {
  const lines: string[] = [];

  if (context.snapshot) {
    const snapshot = context.snapshot;
    const currency = snapshot.metadata.valuationCurrency ?? 'USD';
    const topPositions = snapshot.positions.slice(0, 3).map((position) => {
      const label =
        position.symbol?.trim() ||
        position.name?.trim() ||
        position.assetKey?.trim() ||
        'Unnamed position';
      return `${label} (${formatMoney(position.marketValue, currency)})`;
    });

    lines.push(
      `Snapshot: ${snapshot.metadata.portfolioName ?? 'Untitled portfolio'} on ${snapshot.metadata.snapshotDate}; total value ${formatMoney(snapshot.totalValue, currency)}; cash ${formatMoney(snapshot.cashValue, currency)}; positions ${snapshot.positions.length}.`,
    );
    if (topPositions.length > 0) {
      lines.push(`Top positions: ${topPositions.join(', ')}.`);
    }
  } else {
    lines.push('Snapshot: none linked.');
  }

  if (context.score) {
    const score = context.score;
    lines.push(
      `Financial health score: ${score.result.totalScore}/${score.result.maxScore} (${score.result.grade.replace(/_/g, ' ').toLowerCase()}).`,
    );
    lines.push(`Score headline: ${trimLine(score.insight.headline, 180)}.`);
    lines.push(`Score summary: ${trimLine(score.insight.summary, 280)}.`);
  } else {
    lines.push('Financial health score: none linked.');
  }

  if (context.report) {
    lines.push(`Saved report: ${context.report.title}.`);
    lines.push(
      `Report excerpt: ${trimLine(context.report.contentMarkdown, 700)}.`,
    );
  } else {
    lines.push('Saved report: none linked.');
  }

  return lines.join('\n');
}

export function buildQuickChatPromptMessages(input: {
  transcript: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: QuickChatResolvedContext;
}): QuickChatCompletionMessage[] {
  const systemPrompt = [
    'You are Aurum Quick Chat, a concise wealth assistant.',
    'Use the provided snapshot/report/score context when available.',
    'Treat PortfolioSnapshot as the canonical upstream truth.',
    'Do not claim hidden portfolio data beyond the supplied context.',
    'If context is missing, say so plainly and answer within those limits.',
    'Keep responses practical and reasonably short unless the user asks for depth.',
    'Do not mention internal model/provider details.',
    '',
    'Linked context:',
    buildContextBlock(input.context),
  ].join('\n');

  return [
    {
      role: 'system',
      content: systemPrompt,
    },
    ...input.transcript.map((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];
}

export function buildQuickChatFallbackReply(input: {
  transcript: Array<{ role: 'user' | 'assistant'; content: string }>;
  context: QuickChatResolvedContext;
}): string {
  const lastUserMessage =
    [...input.transcript].reverse().find((message) => message.role === 'user')
      ?.content ?? 'your question';

  const parts: string[] = [];

  if (input.context.snapshot) {
    const snapshot = input.context.snapshot;
    const currency = snapshot.metadata.valuationCurrency ?? 'USD';
    parts.push(
      `I can ground this in your ${snapshot.metadata.portfolioName ?? 'portfolio'} snapshot from ${snapshot.metadata.snapshotDate}, currently around ${formatMoney(snapshot.totalValue, currency)} across ${snapshot.positions.length} positions.`,
    );
  } else {
    parts.push(
      'I can help, but this quick chat does not have a linked snapshot yet.',
    );
  }

  if (input.context.score) {
    const score = input.context.score;
    parts.push(
      `Your linked financial health score is ${score.result.totalScore}/${score.result.maxScore}, with the headline "${trimLine(score.insight.headline, 120)}".`,
    );
  }

  if (input.context.report) {
    parts.push(
      `Your linked saved report is "${input.context.report.title}", and its latest summary is ${trimLine(input.context.report.contentMarkdown, 220)}.`,
    );
  }

  parts.push(
    `For "${trimLine(lastUserMessage, 140)}", I can summarize the linked artifacts right now, and a richer generated answer will appear automatically when the configured AI provider is available.`,
  );

  return parts.join(' ');
}
