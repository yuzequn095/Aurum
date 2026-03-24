import { FinancialHealthScoresService } from './financial-health-scores.service';

describe('FinancialHealthScoresService', () => {
  let capturedCreateArgs: unknown;

  const prisma = {
    financialHealthScoreRecord: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn().mockImplementation((args: unknown) => {
        capturedCreateArgs = args;
        return Promise.resolve({
          id: 'score_1',
          sourceSnapshotId: 'snapshot_1',
          scoringVersion: '1.0.0',
          result: {
            totalScore: 75,
            maxScore: 100,
            grade: 'good',
            breakdown: [],
            createdAt: '2026-03-23T00:00:00.000Z',
          },
          insight: {
            headline: 'Healthy',
            summary: 'Healthy summary',
            strengths: [],
            concerns: [],
            nextActions: [],
          },
          metadata: {
            portfolioName: 'Retirement',
            snapshotDate: '2026-03-23',
            sourceSnapshotId: 'snapshot_1',
          },
          createdAt: new Date('2026-03-23T00:00:00.000Z'),
          updatedAt: new Date('2026-03-23T00:00:00.000Z'),
        });
      }),
    },
  };
  const portfolioSnapshotsService = {
    getSnapshotById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedCreateArgs = undefined;
  });

  it('scopes list-by-snapshot reads through the owning snapshot user', async () => {
    prisma.financialHealthScoreRecord.findMany.mockResolvedValue([]);

    const service = new FinancialHealthScoresService(
      prisma as never,
      portfolioSnapshotsService as never,
    );

    await service.listScoreArtifactsBySourceSnapshotId('snapshot_1', 'user_1');

    expect(prisma.financialHealthScoreRecord.findMany).toHaveBeenCalledWith({
      where: {
        sourceSnapshotId: 'snapshot_1',
        sourceSnapshot: {
          is: {
            userId: 'user_1',
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  });

  it('preserves snapshot-scoped score creation for the owning user', async () => {
    portfolioSnapshotsService.getSnapshotById.mockResolvedValue({
      id: 'snapshot_1',
      metadata: {
        snapshotDate: '2026-03-23',
        portfolioName: 'Retirement',
      },
      totalValue: 1000,
      cashValue: 100,
      positions: [
        {
          assetKey: 'symbol:AAPL',
          name: 'Apple',
          marketValue: 900,
        },
      ],
    });

    const service = new FinancialHealthScoresService(
      prisma as never,
      portfolioSnapshotsService as never,
    );

    const created = await service.createScoreArtifactFromSnapshot({
      userId: 'user_1',
      sourceSnapshotId: 'snapshot_1',
      scoringVersion: '1.0.0',
    });

    expect(portfolioSnapshotsService.getSnapshotById).toHaveBeenCalledWith(
      'snapshot_1',
      'user_1',
    );
    expect(capturedCreateArgs).toMatchObject({
      data: {
        sourceSnapshotId: 'snapshot_1',
        scoringVersion: '1.0.0',
      },
    });
    expect(created).toMatchObject({
      id: 'score_1',
      sourceSnapshotId: 'snapshot_1',
      scoringVersion: '1.0.0',
    });
  });
});
