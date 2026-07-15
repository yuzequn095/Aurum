import type {
  ConnectedFinanceOverview,
  PortfolioAttentionCategory,
  PortfolioAttentionItem,
  PortfolioAttentionSeverity,
  PortfolioDiagnosticsFlag,
} from '@aurum/core';
import { Injectable } from '@nestjs/common';
import { ConnectedFinanceService } from '../connected-finance/connected-finance.service';
import {
  PortfolioAIContextService,
  type PortfolioAIContext,
} from '../portfolio-snapshots/portfolio-ai-context.service';
import { PortfolioSnapshotsService } from '../portfolio-snapshots/portfolio-snapshots.service';

const STALE_SNAPSHOT_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
const LARGE_CHANGE_RATIO = 0.1;

const severityRank: Record<PortfolioAttentionSeverity, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const categoryRank: Record<PortfolioAttentionCategory, number> = {
  data_health: 0,
  change: 1,
  concentration: 2,
  allocation: 3,
  setup: 4,
  market_brief: 5,
};

function snapshotAgeMs(snapshotDate: string): number | null {
  const timestamp = Date.parse(snapshotDate);
  return Number.isFinite(timestamp)
    ? Math.max(0, Date.now() - timestamp)
    : null;
}

function sourceIdsForStatus(
  overview: ConnectedFinanceOverview,
  statuses: string[],
): string[] {
  return overview.sources
    .filter((item) => statuses.includes(item.health.status))
    .map((item) => item.source.id)
    .sort();
}

function diagnosticAttentionItem(
  flag: PortfolioDiagnosticsFlag,
  snapshotId: string,
): PortfolioAttentionItem | null {
  const shared = {
    snapshotId,
    description: flag.detail ?? flag.label,
    action: { label: 'Review portfolio', href: '/portfolio#what-changed' },
  };

  switch (flag.code) {
    case 'high_cash':
      return {
        ...shared,
        id: 'high_cash',
        title: 'Cash allocation stands out',
        severity: 'info',
        category: 'allocation',
      };
    case 'high_crypto':
      return {
        ...shared,
        id: 'high_crypto',
        title: 'Crypto allocation stands out',
        severity: 'warning',
        category: 'allocation',
      };
    case 'high_single_name_concentration':
      return {
        ...shared,
        id: 'high_single_name_concentration',
        title: 'One holding has a large portfolio weight',
        severity: 'warning',
        category: 'concentration',
      };
    case 'high_institution_concentration':
      return {
        ...shared,
        id: 'high_institution_concentration',
        title: 'One institution has a large portfolio weight',
        severity: 'warning',
        category: 'concentration',
        action: {
          label: 'Review institutions',
          href: '/portfolio#connections-workspace',
        },
      };
    case 'high_employer_stock_concentration':
      return {
        ...shared,
        id: 'high_employer_equity_concentration',
        title: 'Employer equity has a large portfolio weight',
        severity: 'warning',
        category: 'concentration',
      };
    case 'missing_valuation':
      return {
        ...shared,
        id: 'missing_account_context',
        title: 'Some holdings are missing account context',
        severity: 'info',
        category: 'setup',
        action: {
          label: 'Update portfolio data',
          href: '/portfolio#manual-workspace',
        },
      };
    default:
      return null;
  }
}

@Injectable()
export class PortfolioAttentionService {
  constructor(
    private readonly portfolioSnapshotsService: PortfolioSnapshotsService,
    private readonly portfolioAIContextService: PortfolioAIContextService,
    private readonly connectedFinanceService: ConnectedFinanceService,
  ) {}

  async getAttentionItems(userId: string): Promise<PortfolioAttentionItem[]> {
    const [snapshotsResult, overviewResult] = await Promise.allSettled([
      this.portfolioSnapshotsService.listSnapshots(userId),
      this.connectedFinanceService.getOverview(userId),
    ]);
    const snapshots =
      snapshotsResult.status === 'fulfilled' ? snapshotsResult.value : [];
    const overview: ConnectedFinanceOverview =
      overviewResult.status === 'fulfilled'
        ? overviewResult.value
        : {
            sources: [],
            summary: {
              sourceCount: 0,
              accountCount: 0,
              staleSourceCount: 0,
              needsAttentionCount: 0,
            },
          };
    const snapshot =
      this.portfolioAIContextService.selectPreferredSnapshot(snapshots);
    const items = new Map<string, PortfolioAttentionItem>();

    if (snapshotsResult.status === 'rejected') {
      items.set('snapshot_context_unavailable', {
        id: 'snapshot_context_unavailable',
        title: 'Portfolio snapshot context is temporarily unavailable',
        description:
          'Aurum could not calculate snapshot-based attention items right now. Existing portfolio workflows remain available.',
        severity: 'info',
        category: 'data_health',
        action: { label: 'Open portfolio', href: '/portfolio' },
      });
      this.addConnectedSourceItems(items, overview);
      return this.sorted(items);
    }

    if (!snapshot?.id) {
      items.set('no_snapshot', {
        id: 'no_snapshot',
        title: 'Add a portfolio snapshot when you are ready',
        description:
          'A snapshot gives Aurum a current portfolio state for history, diagnostics, and reports.',
        severity: 'info',
        category: 'setup',
        action: {
          label: 'Create snapshot',
          href: '/portfolio#manual-workspace',
        },
      });
      this.addConnectedSourceItems(items, overview);
      return this.sorted(items);
    }

    const context = await this.portfolioAIContextService.assembleForSnapshot(
      userId,
      snapshot,
    );
    const ageMs = snapshotAgeMs(snapshot.metadata.snapshotDate);

    if (ageMs !== null && ageMs > STALE_SNAPSHOT_AFTER_MS) {
      items.set('stale_snapshot', {
        id: 'stale_snapshot',
        title: 'Your portfolio snapshot may be ready for a refresh',
        description: `The current snapshot is dated ${snapshot.metadata.snapshotDate}. Refresh it when newer portfolio data is available.`,
        severity: 'warning',
        category: 'data_health',
        snapshotId: snapshot.id,
        action: {
          label: 'Refresh snapshot',
          href: '/portfolio#snapshot-library',
        },
      });
    }

    this.addConnectedSourceItems(items, overview, snapshot.id);
    this.addChangeItems(items, context);

    for (const flag of context.diagnostics?.flags ?? []) {
      const item = diagnosticAttentionItem(flag, snapshot.id);
      if (item) items.set(item.id, item);
    }

    return this.sorted(items);
  }

  private addConnectedSourceItems(
    items: Map<string, PortfolioAttentionItem>,
    overview: ConnectedFinanceOverview,
    snapshotId?: string,
  ): void {
    const staleSourceIds = sourceIdsForStatus(overview, ['stale']);
    if (staleSourceIds.length > 0) {
      items.set('stale_sources', {
        id: 'stale_sources',
        title: `${staleSourceIds.length} portfolio source${staleSourceIds.length === 1 ? '' : 's'} may need a refresh`,
        description:
          'Source freshness can affect the portfolio state shown across Aurum. Review connections when convenient.',
        severity: 'warning',
        category: 'data_health',
        snapshotId,
        sourceIds: staleSourceIds,
        action: {
          label: 'Review connections',
          href: '/portfolio#connections-workspace',
        },
      });
    }

    const attentionSourceIds = sourceIdsForStatus(overview, [
      'needs_attention',
      'disconnected',
    ]);
    if (attentionSourceIds.length > 0) {
      items.set('sources_need_attention', {
        id: 'sources_need_attention',
        title: `${attentionSourceIds.length} portfolio connection${attentionSourceIds.length === 1 ? '' : 's'} need review`,
        description:
          'One or more read-only connections are not currently updating. Review their status to restore portfolio coverage.',
        severity: 'warning',
        category: 'data_health',
        snapshotId,
        sourceIds: attentionSourceIds,
        action: {
          label: 'Review connections',
          href: '/portfolio#connections-workspace',
        },
      });
    }
  }

  private addChangeItems(
    items: Map<string, PortfolioAttentionItem>,
    context: PortfolioAIContext,
  ): void {
    const explanation = context.changeExplanation;
    const snapshotId = context.snapshot.id;
    if (!snapshotId) return;

    if (!explanation || explanation.baselineStatus === 'no_baseline') {
      items.set('no_baseline', {
        id: 'no_baseline',
        title: 'A second snapshot will unlock change tracking',
        description:
          'There is no earlier snapshot in this portfolio scope yet, so Aurum cannot compare states.',
        severity: 'info',
        category: 'setup',
        snapshotId,
        action: {
          label: 'Review snapshot history',
          href: '/portfolio#portfolio-history',
        },
      });
      return;
    }

    const previousValue =
      context.snapshot.totalValue - explanation.totalValueDelta;
    const changeRatio =
      Math.abs(previousValue) > 0
        ? Math.abs(explanation.totalValueDelta) / Math.abs(previousValue)
        : 0;

    if (changeRatio >= LARGE_CHANGE_RATIO) {
      items.set('large_portfolio_change', {
        id: 'large_portfolio_change',
        title: 'The latest portfolio state changed meaningfully',
        description: `${Math.round(changeRatio * 100)}% separates the latest total from its baseline. Review the deterministic snapshot drivers for context.`,
        severity: 'warning',
        category: 'change',
        snapshotId,
        action: { label: 'Review change', href: '/portfolio#what-changed' },
      });
      items.set('market_brief_after_change', {
        id: 'market_brief_after_change',
        title: 'Portfolio Market Lens can summarize the latest state',
        description:
          'Manual Portfolio Market Lens generation is available with the selected snapshot and its observed change context.',
        severity: 'info',
        category: 'market_brief',
        snapshotId,
        action: {
          label: 'Generate Portfolio Lens',
          href: '/ai-insights#reports-daily-market-brief',
        },
      });
    }
  }

  private sorted(
    items: Map<string, PortfolioAttentionItem>,
  ): PortfolioAttentionItem[] {
    return [...items.values()].sort(
      (left, right) =>
        severityRank[left.severity] - severityRank[right.severity] ||
        categoryRank[left.category] - categoryRank[right.category] ||
        left.id.localeCompare(right.id),
    );
  }
}
