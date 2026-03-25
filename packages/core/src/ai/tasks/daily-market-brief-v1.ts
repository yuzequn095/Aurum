import type { AITaskDefinition } from '../task-definition';
import type { PromptPack } from '../types';
import {
  buildJsonBlock,
  buildPromptPackUserMessage,
  formatUsd,
  joinList,
} from './task-helpers';

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
  reportScope: 'portfolio_aware' | 'market_overview';
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
}

const TASK_TYPE = 'daily_market_brief_v1';
const PROMPT_VERSION = '1.0.0';
const TITLE = 'Daily Market Brief';
const REQUIRED_HEADINGS = [
  '# Daily Market Brief',
  '## Market Setup',
  '## What Matters Today',
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
  };

  return buildPromptPackUserMessage([
    'Prepare a Daily Market Brief in markdown for Aurum AI Insights.',
    '',
    'Use the exact headings below and keep the brief compact, clear, and ready for in-product display.',
    ...REQUIRED_HEADINGS,
    '',
    'Brief context:',
    buildJsonBlock(briefContext),
    '',
    'Requirements:',
    '- Treat this as a system-provided daily brief, not a chat reply.',
    '- Reflect the supplied scope explicitly: portfolio-aware or market-overview.',
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
      schemaVersion: '1.0.0',
      title: TITLE,
      messages: [
        {
          role: 'system',
          content:
            'You are Aurum, a concise market briefing assistant. Produce structured markdown briefs that surface the day setup, what matters, portfolio-aware implications, and a short watchlist without pretending to have live data beyond the supplied context.',
        },
        {
          role: 'user',
          content: buildUserMessage(input),
        },
      ],
      expectedOutputFormat: 'markdown',
      instructions: [
        'Follow the required headings exactly and in order.',
        'Use the supplied market signals and snapshot anchor only.',
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
    return `${input.briefDate} ${input.reportScope.replace('_', ' ')} brief for ${input.portfolioName} with ${input.marketSignals.length} market signals.`;
  },
};
