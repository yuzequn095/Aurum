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
});
