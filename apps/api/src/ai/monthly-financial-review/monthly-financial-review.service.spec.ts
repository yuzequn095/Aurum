import { BadRequestException } from '@nestjs/common';
import { MonthlyFinancialReviewService } from './monthly-financial-review.service';

describe('MonthlyFinancialReviewService', () => {
  const analyticsService = {
    getMonthlySummary: jest.fn(),
    getCategoryBreakdown: jest.fn(),
  };
  const portfolioSnapshotsService = {
    getSnapshotById: jest.fn(),
    listSnapshots: jest.fn(),
  };
  const financialHealthScoresService = {
    listScoreArtifactsBySourceSnapshotId: jest.fn(),
  };
  const aiReportsService = {
    createMonthlyFinancialReviewReport: jest.fn(),
  };
  const insightEngine = {
    generate: jest.fn(),
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-24T12:00:00.000Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('defaults to the latest completed month and anchors to the latest snapshot on or before month end', async () => {
    portfolioSnapshotsService.listSnapshots.mockResolvedValue([
      {
        id: 'snapshot_march',
        metadata: {
          portfolioName: 'Household Portfolio',
          snapshotDate: '2026-03-20',
        },
        totalValue: 250000,
        cashValue: 20000,
        positions: [{ name: 'Apple', symbol: 'AAPL', marketValue: 75000 }],
      },
      {
        id: 'snapshot_feb',
        metadata: {
          portfolioName: 'Household Portfolio',
          snapshotDate: '2026-02-28',
        },
        totalValue: 240000,
        cashValue: 18000,
        positions: [{ name: 'Apple', symbol: 'AAPL', marketValue: 72000 }],
      },
    ]);
    analyticsService.getMonthlySummary.mockResolvedValue({
      year: 2026,
      month: 2,
      range: {
        startDate: '2026-02-01T00:00:00.000Z',
        endDate: '2026-02-28T23:59:59.999Z',
      },
      totals: {
        incomeCents: 600000,
        expenseCents: 420000,
        netCents: 180000,
      },
      previousMonth: {
        year: 2026,
        month: 1,
        totals: {
          incomeCents: 580000,
          expenseCents: 430000,
          netCents: 150000,
        },
      },
      deltaPercent: {
        income: 3.45,
        expense: -2.33,
        net: 20,
      },
    });
    analyticsService.getCategoryBreakdown.mockResolvedValue({
      year: 2026,
      month: 2,
      totals: [
        {
          categoryId: 'housing',
          categoryName: 'Housing',
          expenseCents: 180000,
        },
      ],
    });
    financialHealthScoresService.listScoreArtifactsBySourceSnapshotId.mockResolvedValue(
      [
        {
          id: 'score_1',
          createdAt: '2026-03-01T00:00:00.000Z',
          result: {
            totalScore: 84,
            maxScore: 100,
            grade: 'STRONG',
          },
          insight: {
            headline: 'Financial footing is strong.',
            summary: 'Cash reserves and diversification remain healthy.',
          },
        },
      ],
    );
    insightEngine.generate.mockResolvedValue([
      {
        id: 'saved-this-month',
        title: 'Savings',
        body: 'You saved $1,800.00 this month.',
        severity: 'good',
      },
    ]);
    aiReportsService.createMonthlyFinancialReviewReport.mockResolvedValue({
      id: 'report_1',
      reportType: 'monthly_financial_review_v1',
      taskType: 'monthly_financial_review_v1',
      sourceSnapshotId: 'snapshot_feb',
    });

    const service = new MonthlyFinancialReviewService(
      analyticsService as never,
      portfolioSnapshotsService as never,
      financialHealthScoresService as never,
      aiReportsService as never,
      insightEngine as never,
    );

    await service.createMonthlyFinancialReview('user_1', {});

    expect(analyticsService.getMonthlySummary).toHaveBeenCalledWith(
      'user_1',
      2026,
      2,
    );
    expect(
      financialHealthScoresService.listScoreArtifactsBySourceSnapshotId,
    ).toHaveBeenCalledWith('snapshot_feb', 'user_1');

    const createMonthlyReviewCalls = aiReportsService
      .createMonthlyFinancialReviewReport.mock.calls as Array<
      [
        {
          userId: string;
          sourceSnapshotId: string;
          title: string;
          metadata?: Record<string, unknown>;
        },
      ]
    >;
    const createMonthlyReviewCall = createMonthlyReviewCalls[0]?.[0] as {
      userId: string;
      sourceSnapshotId: string;
      title: string;
      metadata?: Record<string, unknown>;
    };

    expect(createMonthlyReviewCall).toMatchObject({
      userId: 'user_1',
      sourceSnapshotId: 'snapshot_feb',
      title: 'February 2026 Monthly Financial Review',
    });
    expect(createMonthlyReviewCall.metadata).toMatchObject({
      reviewYear: 2026,
      reviewMonth: 2,
      snapshotSelectionStrategy: 'latest_snapshot_on_or_before_month_end',
      linkedFinancialHealthScoreId: 'score_1',
    });
  });

  it('supports an explicit snapshot override and records that strategy in metadata', async () => {
    portfolioSnapshotsService.getSnapshotById.mockResolvedValue({
      id: 'snapshot_override',
      metadata: {
        portfolioName: 'Retirement',
        snapshotDate: '2026-03-18',
      },
      totalValue: 150000,
      cashValue: 10000,
      positions: [{ name: 'SPY', symbol: 'SPY', marketValue: 90000 }],
    });
    analyticsService.getMonthlySummary.mockResolvedValue({
      year: 2026,
      month: 3,
      range: {
        startDate: '2026-03-01T00:00:00.000Z',
        endDate: '2026-03-31T23:59:59.999Z',
      },
      totals: {
        incomeCents: 500000,
        expenseCents: 350000,
        netCents: 150000,
      },
      previousMonth: {
        year: 2026,
        month: 2,
        totals: {
          incomeCents: 500000,
          expenseCents: 360000,
          netCents: 140000,
        },
      },
      deltaPercent: {
        income: 0,
        expense: -2.78,
        net: 7.14,
      },
    });
    analyticsService.getCategoryBreakdown.mockResolvedValue({
      year: 2026,
      month: 3,
      totals: [],
    });
    financialHealthScoresService.listScoreArtifactsBySourceSnapshotId.mockResolvedValue(
      [],
    );
    insightEngine.generate.mockResolvedValue([]);
    aiReportsService.createMonthlyFinancialReviewReport.mockResolvedValue({
      id: 'report_2',
    });

    const service = new MonthlyFinancialReviewService(
      analyticsService as never,
      portfolioSnapshotsService as never,
      financialHealthScoresService as never,
      aiReportsService as never,
      insightEngine as never,
    );

    await service.createMonthlyFinancialReview('user_1', {
      year: 2026,
      month: 3,
      sourceSnapshotId: 'snapshot_override',
    });

    expect(portfolioSnapshotsService.getSnapshotById).toHaveBeenCalledWith(
      'snapshot_override',
      'user_1',
    );

    const explicitOverrideCalls = aiReportsService
      .createMonthlyFinancialReviewReport.mock.calls as Array<
      [
        {
          sourceSnapshotId: string;
          metadata?: Record<string, unknown>;
        },
      ]
    >;
    const explicitOverrideCall = explicitOverrideCalls[0]?.[0] as {
      sourceSnapshotId: string;
      metadata?: Record<string, unknown>;
    };

    expect(explicitOverrideCall.sourceSnapshotId).toBe('snapshot_override');
    expect(explicitOverrideCall.metadata).toMatchObject({
      snapshotSelectionStrategy: 'explicit_snapshot_override',
    });
  });

  it('rejects creation when the user has no portfolio snapshots to anchor the review', async () => {
    portfolioSnapshotsService.listSnapshots.mockResolvedValue([]);

    const service = new MonthlyFinancialReviewService(
      analyticsService as never,
      portfolioSnapshotsService as never,
      financialHealthScoresService as never,
      aiReportsService as never,
      insightEngine as never,
    );

    await expect(
      service.createMonthlyFinancialReview('user_1', {
        year: 2026,
        month: 2,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
