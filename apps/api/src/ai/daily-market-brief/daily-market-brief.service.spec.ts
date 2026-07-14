import { BadRequestException } from '@nestjs/common';
import { DailyMarketBriefService } from './daily-market-brief.service';

describe('DailyMarketBriefService', () => {
  type AssembleContextArgs = {
    snapshot: { id: string };
    scope: string;
  };

  type CreateDailyMarketBriefReportArgs = {
    userId: string;
    sourceSnapshotId: string;
    title: string;
    contentMarkdown: string;
    metadata?: Record<string, unknown>;
  };

  const portfolioSnapshotsService = {
    getSnapshotById: jest.fn(),
    listSnapshots: jest.fn(),
  };
  const marketContextService = {
    assembleContext: jest.fn(),
  };
  const aiReportsService = {
    createDailyMarketBriefReport: jest.fn(),
  };
  const portfolioAIContextService = {
    assembleForSnapshot: jest.fn(),
    selectPreferredSnapshot: jest.fn(
      (snapshots: Array<{ metadata: { sourceId?: string } }>) =>
        snapshots.find((snapshot) => !snapshot.metadata.sourceId) ??
        snapshots[0] ??
        null,
    ),
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-24T15:30:00.000Z'));
    jest.clearAllMocks();
    portfolioAIContextService.assembleForSnapshot.mockImplementation(
      (_userId: string, snapshot: { id: string }) =>
        Promise.resolve({
          version: 'portfolio-ai-context-v1',
          snapshot,
          diagnostics: null,
          changeExplanation: {
            version: 'portfolio-change-explanation-v1',
            snapshotId: snapshot.id,
            baselineSnapshotId: 'snapshot_baseline',
            baselineStatus: 'available',
            stateDeltaStatus: 'deterministic_state_delta',
            causalityStatus: 'insufficient_data_for_causality',
            summary: 'Observed state change.',
            totalValueDelta: 5000,
            cashValueDelta: 1000,
            drivers: [],
            dataLimitations: ['External market data is unavailable.'],
            notes: [],
          },
          historyScope: 'consolidated',
          historySummary: { scope: 'consolidated', pointCount: 2 },
          baselineSnapshotId: 'snapshot_baseline',
          dataLimitations: ['External market data is unavailable.'],
        }),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates a daily market brief using the latest available snapshot by default', async () => {
    portfolioSnapshotsService.listSnapshots.mockResolvedValue([
      {
        id: 'snapshot_latest',
        metadata: {
          portfolioName: 'Household Portfolio',
          snapshotDate: '2026-03-24',
        },
        totalValue: 250000,
        cashValue: 20000,
        positions: [{ symbol: 'AAPL', name: 'Apple', marketValue: 75000 }],
      },
    ]);
    marketContextService.assembleContext.mockReturnValue({
      briefDate: '2026-03-24',
      generatedAt: '2026-03-24T15:30:00.000Z',
      sessionLabel: 'pre_market',
      scope: 'portfolio_aware',
      operatingMode: 'internal_market_template_v1',
      dataFreshnessNote: 'Internal template',
      topHoldings: [
        {
          symbol: 'AAPL',
          name: 'Apple',
          marketValue: 75000,
          weightPercent: 30,
        },
      ],
      watchlistSymbols: ['AAPL'],
      signals: [
        {
          id: 'top-position-concentration',
          title: 'Concentration Watch',
          summary: 'Watch concentration.',
          severity: 'warn',
        },
      ],
      snapshotSummary: {
        portfolioName: 'Household Portfolio',
        snapshotDate: '2026-03-24',
        totalValue: 250000,
        cashValue: 20000,
        cashWeightPercent: 8,
        positionsCount: 4,
        topPositionWeightPercent: 30,
        topThreeWeightPercent: 55,
      },
    });
    aiReportsService.createDailyMarketBriefReport.mockResolvedValue({
      id: 'report_1',
      sourceSnapshotId: 'snapshot_latest',
      reportType: 'daily_market_brief_v1',
    });

    const service = new DailyMarketBriefService(
      portfolioSnapshotsService as never,
      marketContextService as never,
      aiReportsService as never,
      portfolioAIContextService as never,
    );

    await service.createDailyMarketBrief('user_1', {});

    expect(portfolioSnapshotsService.listSnapshots).toHaveBeenCalledWith(
      'user_1',
    );

    const assembleContextMock =
      marketContextService.assembleContext as jest.Mock<
        unknown,
        [AssembleContextArgs]
      >;
    const assembleContextCall = assembleContextMock.mock.calls[0]?.[0];

    expect(assembleContextCall.snapshot.id).toBe('snapshot_latest');
    expect(assembleContextCall.scope).toBe('portfolio_aware');

    const createDailyBriefMock =
      aiReportsService.createDailyMarketBriefReport as jest.Mock<
        unknown,
        [CreateDailyMarketBriefReportArgs]
      >;
    const createDailyBriefCall = createDailyBriefMock.mock.calls[0]?.[0];

    expect(createDailyBriefCall.userId).toBe('user_1');
    expect(createDailyBriefCall.sourceSnapshotId).toBe('snapshot_latest');
    expect(createDailyBriefCall.metadata).toMatchObject({
      briefDate: '2026-03-24',
      reportScope: 'portfolio_aware',
      snapshotSelectionStrategy: 'latest_available_snapshot',
      portfolioAIContextVersion: 'portfolio-ai-context-v1',
      externalMarketDataAvailable: false,
    });
    expect(createDailyBriefCall.title).toContain('Market Brief');
    expect(createDailyBriefCall.contentMarkdown).toContain(
      '## Recent Portfolio State Change',
    );
  });

  it('supports an explicit snapshot override and market overview scope', async () => {
    portfolioSnapshotsService.getSnapshotById.mockResolvedValue({
      id: 'snapshot_override',
      metadata: {
        portfolioName: 'Retirement',
        snapshotDate: '2026-03-22',
      },
      totalValue: 180000,
      cashValue: 25000,
      positions: [{ symbol: 'SPY', name: 'SPY', marketValue: 90000 }],
    });
    marketContextService.assembleContext.mockReturnValue({
      briefDate: '2026-03-24',
      generatedAt: '2026-03-24T15:30:00.000Z',
      sessionLabel: 'pre_market',
      scope: 'market_overview',
      operatingMode: 'internal_market_template_v1',
      dataFreshnessNote: 'Internal template',
      topHoldings: [],
      watchlistSymbols: ['SPY'],
      signals: [],
      snapshotSummary: {
        portfolioName: 'Retirement',
        snapshotDate: '2026-03-22',
        totalValue: 180000,
        cashValue: 25000,
        cashWeightPercent: 13.9,
        positionsCount: 3,
        topPositionWeightPercent: 50,
        topThreeWeightPercent: 75,
      },
    });
    aiReportsService.createDailyMarketBriefReport.mockResolvedValue({
      id: 'report_2',
      sourceSnapshotId: 'snapshot_override',
    });

    const service = new DailyMarketBriefService(
      portfolioSnapshotsService as never,
      marketContextService as never,
      aiReportsService as never,
      portfolioAIContextService as never,
    );

    await service.createDailyMarketBrief('user_1', {
      sourceSnapshotId: 'snapshot_override',
      reportScope: 'market_overview',
    });

    expect(portfolioSnapshotsService.getSnapshotById).toHaveBeenCalledWith(
      'snapshot_override',
      'user_1',
    );

    const createDailyBriefMock =
      aiReportsService.createDailyMarketBriefReport as jest.Mock<
        unknown,
        [CreateDailyMarketBriefReportArgs]
      >;
    const explicitOverrideCall = createDailyBriefMock.mock.calls[0]?.[0];

    expect(explicitOverrideCall.sourceSnapshotId).toBe('snapshot_override');
    expect(explicitOverrideCall.metadata).toMatchObject({
      reportScope: 'market_overview',
      snapshotSelectionStrategy: 'explicit_snapshot_override',
    });
  });

  it('rejects creation when no portfolio snapshot is available', async () => {
    portfolioSnapshotsService.listSnapshots.mockResolvedValue([]);

    const service = new DailyMarketBriefService(
      portfolioSnapshotsService as never,
      marketContextService as never,
      aiReportsService as never,
      portfolioAIContextService as never,
    );

    await expect(
      service.createDailyMarketBrief('user_1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
