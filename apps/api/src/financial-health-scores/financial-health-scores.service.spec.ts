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
  const entitlementsService = {
    assertFeatureEnabled: jest.fn(),
  };
  const portfolioSnapshotsService = {
    getSnapshotById: jest.fn(),
  };
  const portfolioAIContextService = {
    assembleForSnapshot: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    capturedCreateArgs = undefined;
    portfolioAIContextService.assembleForSnapshot.mockImplementation(
      (_userId: string, snapshot: { id: string }) =>
        Promise.resolve({
          version: 'portfolio-ai-context-v1',
          snapshot,
          diagnostics: {
            concentration: {
              topHoldingWeight: 0.9,
              topInstitutionWeight: 0.9,
              employerStockWeight: 0,
            },
            dataHealth: { status: 'stale' },
            flags: [
              {
                code: 'stale_data',
                label: 'Stale data',
                detail: 'One source is stale.',
              },
            ],
          },
          changeExplanation: {
            version: 'portfolio-change-explanation-v1',
            baselineStatus: 'no_baseline',
          },
          historyScope: 'consolidated',
          historySummary: { scope: 'consolidated', pointCount: 1 },
          dataLimitations: ['No same-scope baseline is available.'],
        }),
    );
  });

  it('scopes list-by-snapshot reads through the owning snapshot user', async () => {
    prisma.financialHealthScoreRecord.findMany.mockResolvedValue([]);

    const service = new FinancialHealthScoresService(
      prisma as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
      portfolioAIContextService as never,
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
    expect(entitlementsService.assertFeatureEnabled).not.toHaveBeenCalled();
  });

  it('blocks score generation when entitlement access is denied', async () => {
    entitlementsService.assertFeatureEnabled.mockRejectedValue(
      new Error('blocked'),
    );

    const service = new FinancialHealthScoresService(
      prisma as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
      portfolioAIContextService as never,
    );

    await expect(
      service.createScoreArtifactFromSnapshot({
        userId: 'user_1',
        sourceSnapshotId: 'snapshot_1',
        scoringVersion: '1.0.0',
      }),
    ).rejects.toThrow('blocked');

    expect(entitlementsService.assertFeatureEnabled).toHaveBeenCalledWith(
      'user_1',
      'ai.analysis.financial_health_score',
    );
  });

  it('preserves snapshot-scoped score creation for the owning user', async () => {
    entitlementsService.assertFeatureEnabled.mockResolvedValue(undefined);
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
      entitlementsService as never,
      portfolioSnapshotsService as never,
      portfolioAIContextService as never,
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
    expect(entitlementsService.assertFeatureEnabled).toHaveBeenCalledWith(
      'user_1',
      'ai.analysis.financial_health_score',
    );
    const createArgs = capturedCreateArgs as {
      data: {
        sourceSnapshotId: string;
        scoringVersion: string;
        metadata: Record<string, unknown>;
        insight: { summary: string; concerns: string[] };
      };
    };
    expect(createArgs.data.sourceSnapshotId).toBe('snapshot_1');
    expect(createArgs.data.scoringVersion).toBe('1.0.0');
    expect(createArgs.data.metadata).toMatchObject({
      portfolioAIContextVersion: 'portfolio-ai-context-v1',
      changeExplanationVersion: 'portfolio-change-explanation-v1',
      historyScope: 'consolidated',
    });
    expect(createArgs.data.insight.summary).toContain('data health stale');
    expect(createArgs.data.insight.concerns).toContain('One source is stale.');
    expect(created).toMatchObject({
      id: 'score_1',
      sourceSnapshotId: 'snapshot_1',
      scoringVersion: '1.0.0',
    });
  });
});
