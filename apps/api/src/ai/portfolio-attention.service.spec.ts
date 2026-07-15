import type { ConnectedFinanceOverview, PortfolioSnapshot } from '@aurum/core';
import type { PortfolioAIContext } from '../portfolio-snapshots/portfolio-ai-context.service';
import { PortfolioAttentionService } from './portfolio-attention.service';

describe('PortfolioAttentionService', () => {
  const portfolioSnapshotsService = {
    listSnapshots: jest.fn(),
  };
  const portfolioAIContextService = {
    selectPreferredSnapshot: jest.fn(),
    assembleForSnapshot: jest.fn(),
  };
  const connectedFinanceService = {
    getOverview: jest.fn(),
  };
  const emptyOverview: ConnectedFinanceOverview = {
    sources: [],
    summary: {
      sourceCount: 0,
      accountCount: 0,
      staleSourceCount: 0,
      needsAttentionCount: 0,
    },
  };
  const snapshot: PortfolioSnapshot = {
    id: 'snapshot_1',
    metadata: {
      snapshotDate: '2026-07-13',
      portfolioName: 'Household portfolio',
    },
    totalValue: 1000,
    positions: [],
  };

  function createService(): PortfolioAttentionService {
    return new PortfolioAttentionService(
      portfolioSnapshotsService as never,
      portfolioAIContextService as never,
      connectedFinanceService as never,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-07-14T12:00:00.000Z'));
    portfolioSnapshotsService.listSnapshots.mockResolvedValue([]);
    portfolioAIContextService.selectPreferredSnapshot.mockReturnValue(null);
    connectedFinanceService.getOverview.mockResolvedValue(emptyOverview);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a calm setup action when no snapshot exists', async () => {
    const items = await createService().getAttentionItems('user_1');

    expect(items).toEqual([
      expect.objectContaining({
        id: 'no_snapshot',
        severity: 'info',
        category: 'setup',
        action: {
          label: 'Create snapshot',
          href: '/portfolio#manual-workspace',
        },
      }),
    ]);
    expect(
      portfolioAIContextService.assembleForSnapshot,
    ).not.toHaveBeenCalled();
  });

  it('surfaces stale data, large change, concentration, and a manual portfolio lens action', async () => {
    const staleSnapshot: PortfolioSnapshot = {
      ...snapshot,
      metadata: { ...snapshot.metadata, snapshotDate: '2026-07-01' },
    };
    portfolioSnapshotsService.listSnapshots.mockResolvedValue([staleSnapshot]);
    portfolioAIContextService.selectPreferredSnapshot.mockReturnValue(
      staleSnapshot,
    );
    portfolioAIContextService.assembleForSnapshot.mockResolvedValue({
      snapshot: staleSnapshot,
      diagnostics: {
        flags: [
          {
            code: 'high_single_name_concentration',
            label: 'High single holding concentration',
            severity: 'warning',
            detail: '42% is in the largest holding.',
          },
          {
            code: 'high_institution_concentration',
            label: 'High institution concentration',
            severity: 'warning',
            detail: '64% is held at the largest institution.',
          },
          {
            code: 'high_employer_stock_concentration',
            label: 'High employer stock concentration',
            severity: 'warning',
            detail: '31% appears linked to employer equity.',
          },
        ],
      },
      changeExplanation: {
        baselineStatus: 'available',
        totalValueDelta: 200,
      },
    } as PortfolioAIContext);

    const items = await createService().getAttentionItems('user_1');
    const ids = items.map((item) => item.id);

    expect(ids).toEqual(
      expect.arrayContaining([
        'stale_snapshot',
        'large_portfolio_change',
        'high_single_name_concentration',
        'high_institution_concentration',
        'high_employer_equity_concentration',
        'market_brief_after_change',
      ]),
    );
    const largeChange = items.find(
      (item) => item.id === 'large_portfolio_change',
    );
    expect(largeChange?.description).toContain('25%');
    expect(largeChange?.action).toEqual({
      label: 'Review change',
      href: '/portfolio#what-changed',
    });
  });

  it('deduplicates diagnostic data-health flags and supports no-baseline allocation states', async () => {
    portfolioSnapshotsService.listSnapshots.mockResolvedValue([snapshot]);
    portfolioAIContextService.selectPreferredSnapshot.mockReturnValue(snapshot);
    portfolioAIContextService.assembleForSnapshot.mockResolvedValue({
      snapshot,
      diagnostics: {
        flags: [
          {
            code: 'stale_data',
            label: 'Stale data',
            severity: 'warning',
          },
          {
            code: 'no_baseline_snapshot',
            label: 'No baseline snapshot',
            severity: 'info',
          },
          {
            code: 'high_cash',
            label: 'High cash exposure',
            severity: 'info',
            detail: '28% of the snapshot is cash.',
          },
          {
            code: 'high_crypto',
            label: 'High crypto exposure',
            severity: 'warning',
            detail: '22% of the snapshot is crypto.',
          },
          {
            code: 'missing_valuation',
            label: 'Missing account context',
            severity: 'info',
            detail: '2 positions do not have account lineage.',
          },
        ],
      },
      changeExplanation: {
        baselineStatus: 'no_baseline',
        totalValueDelta: 0,
      },
    } as PortfolioAIContext);
    connectedFinanceService.getOverview.mockResolvedValue({
      sources: [
        {
          source: { id: 'source_1' },
          accounts: [],
          health: { status: 'stale' },
        },
      ],
      summary: {
        sourceCount: 1,
        accountCount: 0,
        staleSourceCount: 1,
        needsAttentionCount: 0,
      },
    } as unknown as ConnectedFinanceOverview);

    const items = await createService().getAttentionItems('user_1');
    const ids = items.map((item) => item.id);

    expect(ids.filter((id) => id === 'stale_sources')).toHaveLength(1);
    expect(ids.filter((id) => id === 'no_baseline')).toHaveLength(1);
    expect(ids).not.toContain('stale_data');
    expect(ids).not.toContain('no_baseline_snapshot');
    expect(ids).toEqual(
      expect.arrayContaining([
        'high_cash',
        'high_crypto',
        'missing_account_context',
      ]),
    );
    expect(
      items
        .flatMap((item) => [
          item.title,
          item.description,
          item.action?.label ?? '',
        ])
        .join(' '),
    ).not.toMatch(/\b(?:buy|sell|trade|invest)\b/i);
  });

  it('returns a calm partial result when snapshot selection is unavailable', async () => {
    portfolioSnapshotsService.listSnapshots.mockRejectedValue(
      new Error('snapshot query unavailable'),
    );

    const items = await createService().getAttentionItems('user_1');

    expect(items).toEqual([
      expect.objectContaining({
        id: 'snapshot_context_unavailable',
        severity: 'info',
        category: 'data_health',
      }),
    ]);
    expect(
      portfolioAIContextService.assembleForSnapshot,
    ).not.toHaveBeenCalled();
  });
});
