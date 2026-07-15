import type { AIReportArtifact, PortfolioSnapshot } from '@aurum/core';
import { BadRequestException, Injectable } from '@nestjs/common';
import { AIReportsService } from '../../ai-reports/ai-reports.service';
import {
  PortfolioAIContextService,
  type PortfolioAIContext,
} from '../../portfolio-snapshots/portfolio-ai-context.service';
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

function requireSnapshotId(snapshot: PortfolioSnapshot): string {
  if (!snapshot.id?.trim()) {
    throw new BadRequestException(
      'Portfolio Market Lens requires a persisted portfolio snapshot id.',
    );
  }

  return snapshot.id;
}

function buildDailyMarketBriefContent(input: {
  snapshot: PortfolioSnapshot;
  selectionStrategy: SnapshotSelectionStrategy;
  marketContext: ReturnType<MarketContextService['assembleContext']>;
  portfolioContext: PortfolioAIContext;
}): string {
  const { marketContext } = input;
  const topHoldings = marketContext.topHoldings.slice(0, 5);
  const lines: string[] = [
    `# Portfolio Market Lens`,
    ``,
    `## Data Boundary`,
    `- Lens date: ${marketContext.briefDate}`,
    `- Generated at: ${marketContext.generatedAt}`,
    `- Lens date timezone: ${marketContext.generationTimeZone}`,
    `- Report scope: portfolio snapshot exposure`,
    `- Ownership anchor snapshot: ${input.snapshot.metadata.snapshotDate}`,
    `- Snapshot selection strategy: ${input.selectionStrategy}`,
    `- Operating mode: ${marketContext.operatingMode}`,
    `- Data note: ${marketContext.dataFreshnessNote}`,
    ``,
    `## Portfolio Exposures`,
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

  lines.push(``, `## Recent Portfolio State Change`);
  const changeExplanation = input.portfolioContext.changeExplanation;
  if (
    !changeExplanation ||
    changeExplanation.baselineStatus === 'no_baseline'
  ) {
    lines.push(
      `- No same-scope baseline is available, so recent change drivers cannot be calculated yet.`,
    );
  } else {
    lines.push(
      `- Total snapshot change: ${formatMoney(changeExplanation.totalValueDelta)}`,
      `- Cash snapshot change: ${formatMoney(changeExplanation.cashValueDelta)}`,
      `- Cause note: This is an observed state delta; transaction or market causality is not inferred.`,
    );
    const recentDrivers = (
      changeExplanation.driverGroups?.primary ??
      changeExplanation.drivers.filter(
        (driver) =>
          driver.dimension !== 'total' &&
          driver.dimension !== 'cash' &&
          driver.delta !== 0,
      )
    ).slice(0, 5);
    for (const driver of recentDrivers) {
      lines.push(
        `- ${driver.label} (${driver.dimension}): ${formatMoney(driver.delta)}`,
      );
    }
  }
  if (input.portfolioContext.dataLimitations.length > 0) {
    lines.push(`- Context limitations:`);
    for (const limitation of input.portfolioContext.dataLimitations) {
      lines.push(`  - ${limitation}`);
    }
  }

  lines.push(
    ``,
    `## Next Read`,
    `- Use this lens to review portfolio concentration, cash posture, and leading symbols. It does not describe current market performance.`,
  );

  return lines.join('\n');
}

@Injectable()
export class DailyMarketBriefService {
  constructor(
    private readonly portfolioSnapshotsService: PortfolioSnapshotsService,
    private readonly marketContextService: MarketContextService,
    private readonly aiReportsService: AIReportsService,
    private readonly portfolioAIContextService: PortfolioAIContextService,
  ) {}

  async createDailyMarketBrief(
    userId: string,
    dto: CreateDailyMarketBriefDto,
  ): Promise<AIReportArtifact> {
    const scope: DailyMarketBriefScope = dto.reportScope ?? 'portfolio_aware';
    const snapshotContext = await this.resolveSnapshotContext(userId, dto);
    const sourceSnapshotId = requireSnapshotId(snapshotContext.snapshot);
    const portfolioContext =
      await this.portfolioAIContextService.assembleForSnapshot(
        userId,
        snapshotContext.snapshot,
      );
    const marketContext = this.marketContextService.assembleContext({
      snapshot: snapshotContext.snapshot,
      scope,
    });
    const title = `${marketContext.briefDate} Portfolio Market Lens - ${snapshotContext.snapshot.metadata.portfolioName ?? 'Portfolio'}`;

    return this.aiReportsService.createDailyMarketBriefReport({
      userId,
      sourceSnapshotId,
      title,
      contentMarkdown: buildDailyMarketBriefContent({
        snapshot: snapshotContext.snapshot,
        selectionStrategy: snapshotContext.strategy,
        marketContext,
        portfolioContext,
      }),
      promptVersion: '1.2.0',
      sourceRunId: `daily-market-brief:${marketContext.briefDate}:${sourceSnapshotId}`,
      metadata: {
        sourceTaskType: 'daily_market_brief_v1',
        briefDate: marketContext.briefDate,
        generatedAt: marketContext.generatedAt,
        generationTimeZone: marketContext.generationTimeZone,
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
        portfolioAIContextVersion: portfolioContext.version,
        changeExplanationVersion: portfolioContext.changeExplanation?.version,
        historyScope: portfolioContext.historyScope,
        baselineSnapshotId: portfolioContext.baselineSnapshotId,
        dataLimitations: portfolioContext.dataLimitations,
        externalMarketDataAvailable: false,
        productBoundary: 'portfolio_exposure_only',
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
        'Portfolio Market Lens requires at least one portfolio snapshot.',
      );
    }

    return {
      snapshot:
        this.portfolioAIContextService.selectPreferredSnapshot(snapshots) ??
        snapshots[0],
      strategy: 'latest_available_snapshot',
    };
  }
}
