import type { AIReportArtifact, PortfolioSnapshot } from '@aurum/core';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AIReportsService } from '../../ai-reports/ai-reports.service';
import { PortfolioSnapshotsService } from '../../portfolio-snapshots/portfolio-snapshots.service';
import { MarketContextService } from './market-context.service';
import type { CreateDailyMarketBriefDto } from './dto/create-daily-market-brief.dto';
import type { DailyMarketBriefScope } from './daily-market-brief.types';

type SnapshotSelectionStrategy =
  | 'explicit_snapshot_override'
  | 'latest_available_snapshot';

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatSessionLabel(
  sessionLabel: 'pre_market' | 'intraday' | 'post_market',
): string {
  switch (sessionLabel) {
    case 'pre_market':
      return 'Pre-market';
    case 'intraday':
      return 'Intraday';
    case 'post_market':
    default:
      return 'Post-market';
  }
}

function requireSnapshotId(snapshot: PortfolioSnapshot): string {
  if (!snapshot.id?.trim()) {
    throw new BadRequestException(
      'Daily Market Brief requires a persisted portfolio snapshot id.',
    );
  }

  return snapshot.id;
}

function buildDailyMarketBriefContent(input: {
  snapshot: PortfolioSnapshot;
  selectionStrategy: SnapshotSelectionStrategy;
  marketContext: ReturnType<MarketContextService['assembleContext']>;
}): string {
  const { marketContext } = input;
  const topHoldings = marketContext.topHoldings.slice(0, 5);
  const lines: string[] = [
    `# Daily Market Brief`,
    ``,
    `## Brief Setup`,
    `- Brief date: ${marketContext.briefDate}`,
    `- Market session lens: ${formatSessionLabel(marketContext.sessionLabel)}`,
    `- Report scope: ${marketContext.scope}`,
    `- Ownership anchor snapshot: ${input.snapshot.metadata.snapshotDate}`,
    `- Snapshot selection strategy: ${input.selectionStrategy}`,
    `- Operating mode: ${marketContext.operatingMode}`,
    `- Data note: ${marketContext.dataFreshnessNote}`,
    ``,
    `## Market Lens`,
  ];

  for (const signal of marketContext.signals) {
    lines.push(`- **${signal.title}** (${signal.severity}): ${signal.summary}`);
  }

  lines.push(
    ``,
    `## Portfolio Anchor`,
    `- Portfolio: ${input.snapshot.metadata.portfolioName ?? 'Untitled Portfolio'}`,
    `- Total value: ${formatMoney(marketContext.snapshotSummary.totalValue)}`,
    `- Cash value: ${formatMoney(marketContext.snapshotSummary.cashValue ?? 0)}`,
    `- Cash weight: ${formatPercent(marketContext.snapshotSummary.cashWeightPercent)}`,
    `- Positions tracked: ${marketContext.snapshotSummary.positionsCount}`,
    `- Top position weight: ${formatPercent(marketContext.snapshotSummary.topPositionWeightPercent)}`,
    `- Top three weight: ${formatPercent(marketContext.snapshotSummary.topThreeWeightPercent)}`,
    ``,
    `## Watchlist`,
  );

  if (topHoldings.length === 0) {
    lines.push(`- No portfolio holdings were available for the watchlist.`);
  } else {
    for (const holding of topHoldings) {
      lines.push(
        `- ${holding.name}${holding.symbol ? ` (${holding.symbol})` : ''}: ${formatMoney(holding.marketValue)} at ${formatPercent(holding.weightPercent)}`,
      );
    }
  }

  lines.push(``, `## Next Read`);
  if (marketContext.scope === 'market_overview') {
    lines.push(
      `- Use this brief as a lightweight market posture check. Portfolio-specific interpretation can be added later without changing the delivery workflow.`,
    );
  } else {
    lines.push(
      `- Use this brief to frame today's market read against your current portfolio concentration, cash optionality, and leading watchlist symbols.`,
    );
  }

  return lines.join('\n');
}

@Injectable()
export class DailyMarketBriefService {
  constructor(
    private readonly portfolioSnapshotsService: PortfolioSnapshotsService,
    private readonly marketContextService: MarketContextService,
    private readonly aiReportsService: AIReportsService,
  ) {}

  async createDailyMarketBrief(
    userId: string,
    dto: CreateDailyMarketBriefDto,
  ): Promise<AIReportArtifact> {
    const scope: DailyMarketBriefScope = dto.reportScope ?? 'portfolio_aware';
    const snapshotContext = await this.resolveSnapshotContext(userId, dto);
    const sourceSnapshotId = requireSnapshotId(snapshotContext.snapshot);
    const marketContext = this.marketContextService.assembleContext({
      snapshot: snapshotContext.snapshot,
      scope,
    });
    const title =
      scope === 'market_overview'
        ? `${marketContext.briefDate} Daily Market Brief`
        : `${marketContext.briefDate} Daily Market Brief - ${snapshotContext.snapshot.metadata.portfolioName ?? 'Portfolio'}`;

    return this.aiReportsService.createDailyMarketBriefReport({
      userId,
      sourceSnapshotId,
      title,
      contentMarkdown: buildDailyMarketBriefContent({
        snapshot: snapshotContext.snapshot,
        selectionStrategy: snapshotContext.strategy,
        marketContext,
      }),
      promptVersion: '1.0.0',
      sourceRunId: `daily-market-brief:${marketContext.briefDate}:${sourceSnapshotId}`,
      metadata: {
        sourceTaskType: 'daily_market_brief_v1',
        briefDate: marketContext.briefDate,
        generatedAt: marketContext.generatedAt,
        marketSessionLabel: marketContext.sessionLabel,
        reportScope: marketContext.scope,
        operatingMode: marketContext.operatingMode,
        dataFreshnessNote: marketContext.dataFreshnessNote,
        sourceSnapshotId,
        snapshotDate: snapshotContext.snapshot.metadata.snapshotDate,
        portfolioName: snapshotContext.snapshot.metadata.portfolioName,
        snapshotSelectionStrategy: snapshotContext.strategy,
        watchlistSymbols: marketContext.watchlistSymbols,
        topHoldingSymbols: marketContext.topHoldings
          .map((holding) => holding.symbol)
          .filter((symbol): symbol is string => Boolean(symbol)),
      },
    });
  }

  private async resolveSnapshotContext(
    userId: string,
    dto: CreateDailyMarketBriefDto,
  ): Promise<{
    snapshot: PortfolioSnapshot;
    strategy: SnapshotSelectionStrategy;
  }> {
    if (dto.sourceSnapshotId?.trim()) {
      const snapshot = await this.portfolioSnapshotsService.getSnapshotById(
        dto.sourceSnapshotId,
        userId,
      );
      if (!snapshot) {
        throw new BadRequestException(
          `Portfolio snapshot not found: ${dto.sourceSnapshotId}`,
        );
      }

      return {
        snapshot,
        strategy: 'explicit_snapshot_override',
      };
    }

    const snapshots =
      await this.portfolioSnapshotsService.listSnapshots(userId);
    if (snapshots.length === 0) {
      throw new BadRequestException(
        'Daily Market Brief currently requires at least one portfolio snapshot.',
      );
    }

    return {
      snapshot: snapshots[0],
      strategy: 'latest_available_snapshot',
    };
  }
}
