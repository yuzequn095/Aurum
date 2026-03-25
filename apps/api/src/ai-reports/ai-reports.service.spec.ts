import { AIReportsService } from './ai-reports.service';

describe('AIReportsService', () => {
  let capturedCreateArgs: unknown;

  const prisma = {
    aIReportRecord: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockImplementation((args: unknown) => {
        capturedCreateArgs = args;
        return Promise.resolve({
          id: 'report_1',
          reportType: 'portfolio_report_v1',
          taskType: 'portfolio_report_v1',
          sourceRunId: 'run_1',
          sourceSnapshotId: 'snapshot_1',
          title: 'Retirement - Portfolio Report',
          contentMarkdown: '# Review',
          promptVersion: '1.0.0',
          metadata: {
            portfolioName: 'Retirement',
            snapshotDate: '2026-03-23',
            sourceSnapshotId: 'snapshot_1',
            sourceTaskType: 'portfolio_report_v1',
          },
          createdAt: new Date('2026-03-23T00:00:00.000Z'),
          updatedAt: new Date('2026-03-23T00:00:00.000Z'),
        });
      }),
    },
  };
  const entitlementsService = {
    assertFeatureEnabled: jest.fn(),
  };
  const portfolioSnapshotsService = {
    getSnapshotById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedCreateArgs = undefined;
  });

  it('scopes get-by-id reads through the owning snapshot user', async () => {
    prisma.aIReportRecord.findFirst.mockResolvedValue(null);

    const service = new AIReportsService(
      prisma as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
    );

    await service.getReportById('report_1', 'user_1');

    expect(prisma.aIReportRecord.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'report_1',
        sourceSnapshot: {
          is: {
            userId: 'user_1',
          },
        },
      },
    });
    expect(entitlementsService.assertFeatureEnabled).not.toHaveBeenCalled();
  });

  it('blocks snapshot report creation when entitlement access is denied', async () => {
    entitlementsService.assertFeatureEnabled.mockRejectedValue(
      new Error('blocked'),
    );

    const service = new AIReportsService(
      prisma as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
    );

    await expect(
      service.createReportFromSnapshot({
        userId: 'user_1',
        sourceSnapshotId: 'snapshot_1',
        contentMarkdown: '# Review',
        promptVersion: '1.0.0',
      }),
    ).rejects.toThrow('blocked');

    expect(entitlementsService.assertFeatureEnabled).toHaveBeenCalledWith(
      'user_1',
      'ai.report.snapshot_portfolio_report',
    );
  });

  it('preserves snapshot-scoped report creation for the owning user', async () => {
    entitlementsService.assertFeatureEnabled.mockResolvedValue(undefined);
    portfolioSnapshotsService.getSnapshotById.mockResolvedValue({
      id: 'snapshot_1',
      metadata: {
        portfolioName: 'Retirement',
        snapshotDate: '2026-03-23',
      },
    });

    const service = new AIReportsService(
      prisma as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
    );

    const created = await service.createReportFromSnapshot({
      userId: 'user_1',
      sourceSnapshotId: 'snapshot_1',
      contentMarkdown: '# Review',
      promptVersion: '1.0.0',
      sourceRunId: 'run_1',
    });

    expect(portfolioSnapshotsService.getSnapshotById).toHaveBeenCalledWith(
      'snapshot_1',
      'user_1',
    );
    expect(entitlementsService.assertFeatureEnabled).toHaveBeenCalledWith(
      'user_1',
      'ai.report.snapshot_portfolio_report',
    );
    expect(capturedCreateArgs).toMatchObject({
      data: {
        reportType: 'portfolio_report_v1',
        sourceSnapshotId: 'snapshot_1',
        title: 'Retirement - Portfolio Report',
        contentMarkdown: '# Review',
      },
    });
    expect(created).toMatchObject({
      id: 'report_1',
      sourceSnapshotId: 'snapshot_1',
      title: 'Retirement - Portfolio Report',
    });
  });

  it('gates monthly financial review creation with its dedicated entitlement key', async () => {
    entitlementsService.assertFeatureEnabled.mockRejectedValue(
      new Error('monthly-blocked'),
    );

    const service = new AIReportsService(
      prisma as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
    );

    await expect(
      service.createMonthlyFinancialReviewReport({
        userId: 'user_1',
        sourceSnapshotId: 'snapshot_1',
        title: 'February 2026 Monthly Financial Review',
        contentMarkdown: '# Monthly Review',
        promptVersion: '1.0.0',
      }),
    ).rejects.toThrow('monthly-blocked');

    expect(entitlementsService.assertFeatureEnabled).toHaveBeenCalledWith(
      'user_1',
      'ai.report.monthly_financial_review',
    );
  });

  it('persists monthly financial review artifacts against the owned snapshot chain', async () => {
    entitlementsService.assertFeatureEnabled.mockResolvedValue(undefined);
    portfolioSnapshotsService.getSnapshotById.mockResolvedValue({
      id: 'snapshot_1',
      metadata: {
        portfolioName: 'Retirement',
        snapshotDate: '2026-02-28',
      },
    });

    const service = new AIReportsService(
      prisma as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
    );

    await service.createMonthlyFinancialReviewReport({
      userId: 'user_1',
      sourceSnapshotId: 'snapshot_1',
      title: 'February 2026 Monthly Financial Review',
      contentMarkdown: '# Monthly Review',
      promptVersion: '1.0.0',
      sourceRunId: 'monthly-review:2026-02:snapshot_1',
      metadata: {
        sourceTaskType: 'monthly_financial_review_v1',
        reviewYear: 2026,
        reviewMonth: 2,
      },
    });

    expect(portfolioSnapshotsService.getSnapshotById).toHaveBeenCalledWith(
      'snapshot_1',
      'user_1',
    );
    expect(capturedCreateArgs).toMatchObject({
      data: {
        reportType: 'monthly_financial_review_v1',
        taskType: 'monthly_financial_review_v1',
        sourceSnapshotId: 'snapshot_1',
        title: 'February 2026 Monthly Financial Review',
        contentMarkdown: '# Monthly Review',
      },
    });
  });

  it('gates daily market brief creation with its dedicated entitlement key', async () => {
    entitlementsService.assertFeatureEnabled.mockRejectedValue(
      new Error('daily-brief-blocked'),
    );

    const service = new AIReportsService(
      prisma as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
    );

    await expect(
      service.createDailyMarketBriefReport({
        userId: 'user_1',
        sourceSnapshotId: 'snapshot_1',
        title: '2026-03-24 Daily Market Brief',
        contentMarkdown: '# Daily Market Brief',
        promptVersion: '1.0.0',
      }),
    ).rejects.toThrow('daily-brief-blocked');

    expect(entitlementsService.assertFeatureEnabled).toHaveBeenCalledWith(
      'user_1',
      'ai.report.daily_market_brief',
    );
  });

  it('persists daily market brief artifacts against the owned snapshot chain', async () => {
    entitlementsService.assertFeatureEnabled.mockResolvedValue(undefined);
    portfolioSnapshotsService.getSnapshotById.mockResolvedValue({
      id: 'snapshot_1',
      metadata: {
        portfolioName: 'Retirement',
        snapshotDate: '2026-03-24',
      },
    });

    const service = new AIReportsService(
      prisma as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
    );

    await service.createDailyMarketBriefReport({
      userId: 'user_1',
      sourceSnapshotId: 'snapshot_1',
      title: '2026-03-24 Daily Market Brief',
      contentMarkdown: '# Daily Market Brief',
      promptVersion: '1.0.0',
      sourceRunId: 'daily-market-brief:2026-03-24:snapshot_1',
      metadata: {
        sourceTaskType: 'daily_market_brief_v1',
        briefDate: '2026-03-24',
      },
    });

    expect(portfolioSnapshotsService.getSnapshotById).toHaveBeenCalledWith(
      'snapshot_1',
      'user_1',
    );
    expect(capturedCreateArgs).toMatchObject({
      data: {
        reportType: 'daily_market_brief_v1',
        taskType: 'daily_market_brief_v1',
        sourceSnapshotId: 'snapshot_1',
        title: '2026-03-24 Daily Market Brief',
        contentMarkdown: '# Daily Market Brief',
      },
    });
  });
});
