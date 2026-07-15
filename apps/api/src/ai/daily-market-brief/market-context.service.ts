import type { PortfolioSnapshot } from '@aurum/core';
import { Injectable } from '@nestjs/common';
import type { DailyMarketBriefScope } from './daily-market-brief.types';

type DailyMarketBriefSignalSeverity = 'info' | 'warn' | 'good';

const PORTFOLIO_LENS_TIME_ZONE = 'America/New_York';

export interface DailyMarketBriefSignal {
  id: string;
  title: string;
  summary: string;
  severity: DailyMarketBriefSignalSeverity;
}

export interface DailyMarketBriefMarketContext {
  briefDate: string;
  generatedAt: string;
  generationTimeZone: typeof PORTFOLIO_LENS_TIME_ZONE;
  scope: DailyMarketBriefScope;
  operatingMode: 'internal_portfolio_lens_v1';
  dataFreshnessNote: string;
  topHoldings: Array<{
    name: string;
    symbol?: string;
    marketValue: number;
    weightPercent: number;
  }>;
  watchlistSymbols: string[];
  signals: DailyMarketBriefSignal[];
  snapshotSummary: {
    portfolioName?: string;
    snapshotDate: string;
    totalValue: number;
    cashValue?: number;
    cashWeightPercent: number;
    positionsCount: number;
    topPositionWeightPercent: number;
    topThreeWeightPercent: number;
  };
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatDateInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(date);
  const valueByType = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${valueByType.year}-${valueByType.month}-${valueByType.day}`;
}

@Injectable()
export class MarketContextService {
  assembleContext(input: {
    snapshot: PortfolioSnapshot;
    scope: DailyMarketBriefScope;
    now?: Date;
  }): DailyMarketBriefMarketContext {
    const now = input.now ?? new Date();
    const totalValue = Math.max(0, input.snapshot.totalValue);
    const safeTotalValue = totalValue > 0 ? totalValue : 1;
    const topHoldings = [...input.snapshot.positions]
      .sort((left, right) => right.marketValue - left.marketValue)
      .slice(0, 5)
      .map((position) => ({
        name:
          position.name ?? position.symbol ?? position.assetKey ?? 'Unknown',
        symbol: position.symbol ?? undefined,
        marketValue: position.marketValue,
        weightPercent: (position.marketValue / safeTotalValue) * 100,
      }));
    const watchlistSymbols = topHoldings
      .map((holding) => holding.symbol?.trim().toUpperCase())
      .filter((symbol): symbol is string => Boolean(symbol))
      .slice(0, 5);
    const cashValue = input.snapshot.cashValue ?? undefined;
    const cashWeightPercent = ((cashValue ?? 0) / safeTotalValue) * 100;
    const topPositionWeightPercent = topHoldings[0]?.weightPercent ?? 0;
    const topThreeWeightPercent = topHoldings
      .slice(0, 3)
      .reduce((sum, holding) => sum + holding.weightPercent, 0);

    const signals: DailyMarketBriefSignal[] = [];

    if (topPositionWeightPercent >= 25) {
      signals.push({
        id: 'top-position-concentration',
        title: 'Concentration Watch',
        summary: `Top holding concentration is elevated at ${formatPercent(topPositionWeightPercent)} of portfolio value.`,
        severity: 'warn',
      });
    } else {
      signals.push({
        id: 'top-position-balance',
        title: 'Top Holding Balance',
        summary: `Largest position sits at ${formatPercent(topPositionWeightPercent)}, which keeps single-name concentration more contained.`,
        severity: 'good',
      });
    }

    if (cashWeightPercent >= 10) {
      signals.push({
        id: 'cash-optionality',
        title: 'Cash Optionality',
        summary: `Cash represents ${formatPercent(cashWeightPercent)} of portfolio value in the selected snapshot.`,
        severity: 'good',
      });
    } else {
      signals.push({
        id: 'cash-discipline',
        title: 'Cash Weight',
        summary: `Cash represents ${formatPercent(cashWeightPercent)} of portfolio value in the selected snapshot.`,
        severity: 'info',
      });
    }

    if (topThreeWeightPercent >= 60) {
      signals.push({
        id: 'top-three-weight',
        title: 'Leadership Breadth',
        summary: `Top three holdings account for ${formatPercent(topThreeWeightPercent)} of portfolio value and dominate the current exposure view.`,
        severity: 'warn',
      });
    } else {
      signals.push({
        id: 'top-three-diversification',
        title: 'Diversification Check',
        summary: `Top three holdings account for ${formatPercent(topThreeWeightPercent)}, leaving the remaining exposure spread across other positions.`,
        severity: 'good',
      });
    }

    if (watchlistSymbols.length > 0) {
      signals.push({
        id: 'watchlist-symbols',
        title: 'Watchlist Symbols',
        summary: `${watchlistSymbols.join(', ')} are the leading symbols in the current portfolio snapshot.`,
        severity: 'info',
      });
    }

    return {
      briefDate: formatDateInTimeZone(now, PORTFOLIO_LENS_TIME_ZONE),
      generatedAt: now.toISOString(),
      generationTimeZone: PORTFOLIO_LENS_TIME_ZONE,
      scope: input.scope,
      operatingMode: 'internal_portfolio_lens_v1',
      dataFreshnessNote:
        'Portfolio snapshot signals only. Live prices, indices, rates, volatility, news, and market events are not available.',
      topHoldings,
      watchlistSymbols,
      signals,
      snapshotSummary: {
        portfolioName: input.snapshot.metadata.portfolioName,
        snapshotDate: input.snapshot.metadata.snapshotDate,
        totalValue: input.snapshot.totalValue,
        cashValue,
        cashWeightPercent,
        positionsCount: input.snapshot.positions.length,
        topPositionWeightPercent,
        topThreeWeightPercent,
      },
    };
  }
}
