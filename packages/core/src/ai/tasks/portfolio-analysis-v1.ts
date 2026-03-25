import type { AITaskDefinition } from '../task-definition';
import type { PromptPack } from '../types';
import {
  buildJsonBlock,
  buildPromptPackUserMessage,
  formatUsd,
  joinList,
} from './task-helpers';

export interface PortfolioAnalysisPositionInput {
  symbol: string;
  name?: string;
  category?: string;
  marketValue: number;
  portfolioWeight?: number;
  pnlPercent?: number;
  notes?: string;
}

export interface PortfolioAnalysisInput {
  portfolioName: string;
  snapshotDate: string;
  totalValue: number;
  cashValue?: number;
  positions: PortfolioAnalysisPositionInput[];
  investorProfile?: {
    goal?: string;
    riskPreference?: string;
    concerns?: string[];
  };
}

const TASK_TYPE = 'portfolio_analysis_v1';
const PROMPT_VERSION = '1.0.0';
const TITLE = 'Portfolio Analysis';
const REQUIRED_HEADINGS = [
  '# Portfolio Analysis',
  '## Portfolio Snapshot',
  '## Strengths',
  '## Risks',
  '## Concentration and Exposure',
  '## Suggested Actions',
];

function buildUserMessage(input: PortfolioAnalysisInput): string {
  return buildPromptPackUserMessage([
    'Prepare a first-class portfolio analysis in markdown for Aurum AI Insights.',
    '',
    'Use the exact headings below and focus on practical portfolio interpretation rather than generic investing advice.',
    ...REQUIRED_HEADINGS,
    '',
    'Portfolio analysis input:',
    buildJsonBlock({
      portfolioName: input.portfolioName,
      snapshotDate: input.snapshotDate,
      totalValue: input.totalValue,
      cashValue: input.cashValue ?? null,
      positions: input.positions,
      investorProfile: input.investorProfile ?? null,
    }),
    '',
    'Requirements:',
    '- Interpret concentration, cash posture, diversification, and notable exposures.',
    '- Tie commentary to the investor profile when supplied.',
    `- Investor concerns: ${joinList(input.investorProfile?.concerns ?? [])}.`,
    '- Keep suggested actions concrete and non-custodial.',
  ]);
}

export const portfolioAnalysisV1TaskDefinition: AITaskDefinition<PortfolioAnalysisInput> = {
  taskType: TASK_TYPE,
  promptVersion: PROMPT_VERSION,
  title: TITLE,
  buildPromptPack(input: PortfolioAnalysisInput): PromptPack {
    return {
      taskType: TASK_TYPE,
      promptVersion: PROMPT_VERSION,
      schemaVersion: '1.0.0',
      title: TITLE,
      messages: [
        {
          role: 'system',
          content:
            'You are Aurum, a pragmatic portfolio analysis assistant. Produce structured markdown analysis grounded in the supplied snapshot, with balanced risk commentary and actionable next steps.',
        },
        {
          role: 'user',
          content: buildUserMessage(input),
        },
      ],
      expectedOutputFormat: 'markdown',
      instructions: [
        'Use the exact headings in the required order.',
        'Do not fabricate holdings, exposures, or returns not present in the input.',
        'Prefer clear explanations over market jargon.',
        'Keep the analysis concise enough for an AI Insights detail view.',
      ],
      metadata: {
        portfolioName: input.portfolioName,
        snapshotDate: input.snapshotDate,
        positionCount: input.positions.length,
      },
    };
  },
  summarizeInput(input: PortfolioAnalysisInput): string {
    return `${input.portfolioName} analysis on ${input.snapshotDate} with ${input.positions.length} positions and total value ${formatUsd(input.totalValue)}.`;
  },
};
