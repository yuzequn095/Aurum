import type { AITaskDefinition } from '../task-definition';
import type { PromptPack } from '../types';
import type { PortfolioAIContextInput } from '../portfolio-context';
import { buildJsonBlock, buildPromptPackUserMessage, formatUsd, joinList } from './task-helpers';

export interface DailyMarketBriefSignalInput {
  title: string;
  severity: 'low' | 'medium' | 'high' | 'info' | 'warn';
  summary: string;
}

export interface DailyMarketBriefHoldingInput {
  symbol?: string;
  name: string;
  marketValue: number;
  weightPercent: number;
}

export interface DailyMarketBriefInput {
  briefDate: string;
  generatedAt: string;
  marketSessionLabel: 'pre_market' | 'intraday' | 'post_market';
  reportScope: 'portfolio_aware';
  operatingMode: string;
  dataFreshnessNote: string;
  portfolioName: string;
  snapshotDate: string;
  snapshotSelectionStrategy: string;
  totalValue: number;
  cashValue?: number;
  positionsCount: number;
  topPositionWeightPercent: number;
  topThreeWeightPercent: number;
  watchlistSymbols: string[];
  topHoldings: DailyMarketBriefHoldingInput[];
  marketSignals: DailyMarketBriefSignalInput[];
  portfolioContext?: PortfolioAIContextInput;
}

const TASK_TYPE = 'daily_market_brief_v1';
const PROMPT_VERSION = '1.1.0';
const TITLE = 'Portfolio Market Lens';
const REQUIRED_HEADINGS = [
  '# Portfolio Market Lens',
  '## Data Boundary',
  '## Portfolio Exposures',
  '## Portfolio Lens',
  '## Watchlist',
  '## Next Read',
];

function buildUserMessage(input: DailyMarketBriefInput): string {
  const briefContext = {
    briefDate: input.briefDate,
    generatedAt: input.generatedAt,
    marketSessionLabel: input.marketSessionLabel,
    reportScope: input.reportScope,
    operatingMode: input.operatingMode,
    dataFreshnessNote: input.dataFreshnessNote,
    snapshotAnchor: {
      portfolioName: input.portfolioName,
      snapshotDate: input.snapshotDate,
      snapshotSelectionStrategy: input.snapshotSelectionStrategy,
      totalValue: input.totalValue,
      cashValue: input.cashValue ?? null,
      positionsCount: input.positionsCount,
      topPositionWeightPercent: input.topPositionWeightPercent,
      topThreeWeightPercent: input.topThreeWeightPercent,
      topHoldings: input.topHoldings,
    },
    watchlistSymbols: input.watchlistSymbols,
    marketSignals: input.marketSignals,
    structuredPortfolioContext: input.portfolioContext ?? null,
  };

  return buildPromptPackUserMessage([
    'Prepare a Portfolio Market Lens in markdown for Aurum AI Insights.',
    '',
    'Use the exact headings below and keep the brief compact, clear, and ready for in-product display.',
    ...REQUIRED_HEADINGS,
    '',
    'Brief context:',
    buildJsonBlock(briefContext),
    '',
    'Requirements:',
    '- Treat this as a system-provided daily brief, not a chat reply.',
    '- State clearly that this is a portfolio exposure lens, not a live market overview.',
    '- Anchor any portfolio remarks to the supplied snapshot context only.',
    `- Mention watchlist symbols when helpful: ${joinList(input.watchlistSymbols)}.`,
    '- End with a short next-read section that clarifies how to use the brief today.',
  ]);
}

export const dailyMarketBriefV1TaskDefinition: AITaskDefinition<DailyMarketBriefInput> = {
  taskType: TASK_TYPE,
  promptVersion: PROMPT_VERSION,
  title: TITLE,
  buildPromptPack(input: DailyMarketBriefInput): PromptPack {
    return {
      taskType: TASK_TYPE,
      promptVersion: PROMPT_VERSION,
      schemaVersion: '1.1.0',
      title: TITLE,
      messages: [
        {
          role: 'system',
          content:
            'You are Aurum, a concise portfolio exposure assistant. Produce a structured Portfolio Market Lens grounded in the supplied snapshot, and never imply access to live prices, news, rates, volatility, or market events.',
        },
        {
          role: 'user',
          content: buildUserMessage(input),
        },
      ],
      expectedOutputFormat: 'markdown',
      instructions: [
        'Follow the required headings exactly and in order.',
        'Use the supplied portfolio signals and snapshot anchor only.',
        'Be brief, decisive, and risk-aware.',
        'Do not imply live data access beyond the provided context block.',
      ],
      metadata: {
        portfolioName: input.portfolioName,
        snapshotDate: input.snapshotDate,
        briefDate: input.briefDate,
        reportScope: input.reportScope,
        watchlistCount: input.watchlistSymbols.length,
      },
    };
  },
  summarizeInput(input: DailyMarketBriefInput): string {
    return `${input.briefDate} portfolio market lens for ${input.portfolioName} with ${input.marketSignals.length} portfolio signals.`;
  },
};
