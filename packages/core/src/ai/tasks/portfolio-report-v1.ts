import type { AITaskDefinition } from '../task-definition';
import type { PromptPack } from '../types';

export interface PortfolioReportPositionInput {
  symbol: string;
  name?: string;
  quantity?: number;
  marketValue: number;
  portfolioWeight?: number;
  costBasis?: number;
  pnlPercent?: number;
  notes?: string;
}

export interface PortfolioReportInput {
  portfolioName: string;
  snapshotDate: string;
  totalValue: number;
  cashValue?: number;
  positions: PortfolioReportPositionInput[];
  userContext?: {
    goal?: string;
    riskPreference?: string;
    concerns?: string[];
  };
}

const PORTFOLIO_REPORT_V1_TITLE = 'Portfolio Report V1';

function formatAmount(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildUserMessage(input: PortfolioReportInput): string {
  const snapshot = {
    portfolioName: input.portfolioName,
    snapshotDate: input.snapshotDate,
    totalValue: input.totalValue,
    cashValue: input.cashValue ?? null,
    positions: input.positions,
    userContext: input.userContext ?? null,
  };

  return [
    'Please review the following portfolio snapshot and write a practical markdown report.',
    '',
    'Portfolio snapshot:',
    '```json',
    JSON.stringify(snapshot, null, 2),
    '```',
    '',
    'Use these markdown headings exactly:',
    '## Overall assessment',
    '## Key strengths',
    '## Key risks',
    '## Concentration observations',
    '## Suggested next actions',
  ].join('\n');
}

export const portfolioReportV1TaskDefinition: AITaskDefinition<PortfolioReportInput> = {
  taskType: 'portfolio_report_v1',
  promptVersion: '1.0.0',
  title: PORTFOLIO_REPORT_V1_TITLE,
  buildPromptPack(input: PortfolioReportInput): PromptPack {
    return {
      taskType: 'portfolio_report_v1',
      promptVersion: '1.0.0',
      schemaVersion: '1.0.0',
      title: PORTFOLIO_REPORT_V1_TITLE,
      messages: [
        {
          role: 'system',
          content:
            'You are a careful financial analysis assistant. Provide clear, balanced insights and actionable recommendations based on the supplied portfolio snapshot.',
        },
        {
          role: 'user',
          content: buildUserMessage(input),
        },
      ],
      expectedOutputFormat: 'markdown',
      instructions: [
        'Be concise and specific.',
        'Use the provided data only; if data is missing, state assumptions clearly.',
        'Use markdown headings exactly as requested.',
        'Prioritize risk-awareness and practical next steps.',
      ],
      metadata: {
        portfolioName: input.portfolioName,
        snapshotDate: input.snapshotDate,
        positionCount: input.positions.length,
      },
    };
  },
  summarizeInput(input: PortfolioReportInput): string {
    return `${input.portfolioName} (${input.snapshotDate}) - ${input.positions.length} positions, total value USD ${formatAmount(input.totalValue)}.`;
  },
};
