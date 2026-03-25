import type { AITaskDefinition } from '../task-definition';
import type { PromptPack } from '../types';
import { buildJsonBlock, buildPromptPackUserMessage, formatUsd } from './task-helpers';

export interface MonthlyFinancialReviewInsightInput {
  title: string;
  severity: 'low' | 'medium' | 'high' | 'info' | 'warn';
  body: string;
}

export interface MonthlyFinancialReviewTopCategoryInput {
  categoryName: string;
  expense: number;
}

export interface MonthlyFinancialReviewTopPositionInput {
  symbol?: string;
  name: string;
  marketValue: number;
}

export interface MonthlyFinancialReviewInput {
  reviewYear: number;
  reviewMonth: number;
  reviewMonthLabel: string;
  portfolioName: string;
  snapshotDate: string;
  snapshotSelectionStrategy: string;
  analyticsRangeStartDate: string;
  analyticsRangeEndDate: string;
  totalValue: number;
  cashValue?: number;
  positionsCount: number;
  topSpendingCategories: MonthlyFinancialReviewTopCategoryInput[];
  topPositions: MonthlyFinancialReviewTopPositionInput[];
  income: number;
  expenses: number;
  net: number;
  netChangePercent?: number | null;
  latestHealthScore?: {
    totalScore: number;
    maxScore: number;
    grade: string;
    headline?: string;
    summary?: string;
  };
  notableInsights?: MonthlyFinancialReviewInsightInput[];
}

const TASK_TYPE = 'monthly_financial_review_v1';
const PROMPT_VERSION = '1.0.0';
const TITLE = 'Monthly Financial Review';
const REQUIRED_HEADINGS = [
  '# Monthly Financial Review',
  '## Executive Summary',
  '## Cashflow Review',
  '## Portfolio Context',
  '## Health Score Context',
  '## Recommended Actions',
];

function buildUserMessage(input: MonthlyFinancialReviewInput): string {
  const reviewContext = {
    reviewMonthLabel: input.reviewMonthLabel,
    reviewYear: input.reviewYear,
    reviewMonth: input.reviewMonth,
    portfolioName: input.portfolioName,
    snapshotDate: input.snapshotDate,
    snapshotSelectionStrategy: input.snapshotSelectionStrategy,
    analyticsRange: {
      startDate: input.analyticsRangeStartDate,
      endDate: input.analyticsRangeEndDate,
    },
    cashflow: {
      income: input.income,
      expenses: input.expenses,
      net: input.net,
      netChangePercent: input.netChangePercent ?? null,
      topSpendingCategories: input.topSpendingCategories,
    },
    portfolio: {
      totalValue: input.totalValue,
      cashValue: input.cashValue ?? null,
      positionsCount: input.positionsCount,
      topPositions: input.topPositions,
    },
    latestHealthScore: input.latestHealthScore ?? null,
    notableInsights: input.notableInsights ?? [],
  };

  return buildPromptPackUserMessage([
    'Prepare a Monthly Financial Review in markdown for a personal wealth operating system.',
    '',
    'Use the exact markdown headings below and keep the response practical, specific, and product-ready.',
    ...REQUIRED_HEADINGS,
    '',
    'Review context:',
    buildJsonBlock(reviewContext),
    '',
    'Requirements:',
    '- Tie the cashflow review to the monthly analytics window.',
    '- Tie portfolio commentary to the supplied snapshot and do not invent holdings.',
    '- If health score context is missing, say so briefly instead of fabricating it.',
    '- Include 3 to 5 recommended actions with concrete next-step language.',
  ]);
}

export const monthlyFinancialReviewV1TaskDefinition: AITaskDefinition<MonthlyFinancialReviewInput> = {
  taskType: TASK_TYPE,
  promptVersion: PROMPT_VERSION,
  title: TITLE,
  buildPromptPack(input: MonthlyFinancialReviewInput): PromptPack {
    return {
      taskType: TASK_TYPE,
      promptVersion: PROMPT_VERSION,
      schemaVersion: '1.0.0',
      title: TITLE,
      messages: [
        {
          role: 'system',
          content:
            'You are Aurum, a careful financial review assistant. Produce structured markdown reviews that connect monthly cashflow, portfolio context, and risk-aware next actions without overstating certainty.',
        },
        {
          role: 'user',
          content: buildUserMessage(input),
        },
      ],
      expectedOutputFormat: 'markdown',
      instructions: [
        'Follow the exact required headings in order.',
        'Use only the provided context and explicitly note missing information.',
        'Balance encouragement with risk-awareness and concrete next steps.',
        'Keep the tone analytical, not promotional.',
      ],
      metadata: {
        portfolioName: input.portfolioName,
        snapshotDate: input.snapshotDate,
        reviewMonthLabel: input.reviewMonthLabel,
        positionsCount: input.positionsCount,
      },
    };
  },
  summarizeInput(input: MonthlyFinancialReviewInput): string {
    return `${input.reviewMonthLabel} review for ${input.portfolioName} with ${input.positionsCount} positions and net ${formatUsd(input.net)}.`;
  },
};
