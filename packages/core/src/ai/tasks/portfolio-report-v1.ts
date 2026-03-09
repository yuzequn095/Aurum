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
    JSON.stringify(snapshot, null, 2),
    '',
    'Use these sections:',
    '1. Overall assessment',
    '2. Key strengths',
    '3. Key risks',
    '4. Concentration observations',
    '5. Suggested next actions',
  ].join('\n');
}

export const portfolioReportV1TaskDefinition: AITaskDefinition<PortfolioReportInput> = {
  taskType: 'portfolio_report_v1',
  promptVersion: '1.0.0',
  title: 'Portfolio Report V1',
  buildPromptPack(input: PortfolioReportInput): PromptPack {
    return {
      taskType: 'portfolio_report_v1',
      promptVersion: '1.0.0',
      schemaVersion: '1.0.0',
      title: 'Portfolio Snapshot Report',
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
    return `${input.portfolioName} (${input.snapshotDate}) - ${input.positions.length} positions, total value ${input.totalValue}.`;
  },
};
