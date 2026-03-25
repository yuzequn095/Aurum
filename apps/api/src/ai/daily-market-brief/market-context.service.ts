import type { PortfolioSnapshot } from '@aurum/core';
import { Injectable } from '@nestjs/common';
import type { DailyMarketBriefScope } from './daily-market-brief.types';

type DailyMarketBriefSignalSeverity = 'info' | 'warn' | 'good';

export interface DailyMarketBriefSignal {
  id: string;
  title: string;
  summary: string;
  severity: DailyMarketBriefSignalSeverity;
}

export interface DailyMarketBriefMarketContext {
  briefDate: string;
  generatedAt: string;
  sessionLabel: 'pre_market' | 'intraday' | 'post_market';
  scope: DailyMarketBriefScope;
  operatingMode: 'internal_market_template_v1';
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

function resolveSessionLabel(
  date: Date,
): DailyMarketBriefMarketContext['sessionLabel'] {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'America/New_York',
    }).format(date),
  );

  if (hour < 9) {
    return 'pre_market';
  }

  if (hour < 16) {
    return 'intraday';
  }

  return 'post_market';
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
        summary: `Cash represents ${formatPercent(cashWeightPercent)} of portfolio value, leaving room for staged deployment if markets pull back.`,
        severity: 'good',
      });
    } else {
      signals.push({
        id: 'cash-discipline',
        title: 'Cash Discipline',
        summary: `Cash sits near ${formatPercent(cashWeightPercent)}, so new risk should be added deliberately rather than opportunistically.`,
        severity: 'info',
      });
    }

    if (topThreeWeightPercent >= 60) {
      signals.push({
        id: 'top-three-weight',
        title: 'Leadership Breadth',
        summary: `Top three holdings account for ${formatPercent(topThreeWeightPercent)} of value, so market leadership should be monitored closely.`,
        severity: 'warn',
      });
    } else {
      signals.push({
        id: 'top-three-diversification',
        title: 'Diversification Check',
        summary: `Top three holdings account for ${formatPercent(topThreeWeightPercent)}, which gives the brief a broader participation lens.`,
        severity: 'good',
      });
    }

    if (watchlistSymbols.length > 0) {
      signals.push({
        id: 'watchlist-symbols',
        title: 'Watchlist Symbols',
        summary: `Focus the market read on ${watchlistSymbols.join(', ')} because they dominate the current portfolio footprint.`,
        severity: 'info',
      });
    }

    return {
      briefDate: now.toISOString().slice(0, 10),
      generatedAt: now.toISOString(),
      sessionLabel: resolveSessionLabel(now),
      scope: input.scope,
      operatingMode: 'internal_market_template_v1',
      dataFreshnessNote:
        'Using the internal Daily Market Brief context builder with portfolio-grounded signals. External market data expansion can layer in later.',
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
