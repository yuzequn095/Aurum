import type {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AiController } from '../src/ai/ai.controller';
import { AiService } from '../src/ai/ai.service';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard';
import { PortfolioSnapshotsController } from '../src/portfolio-snapshots/portfolio-snapshots.controller';
import { PortfolioSnapshotsService } from '../src/portfolio-snapshots/portfolio-snapshots.service';

describe('Milestone 16 API contracts (e2e)', () => {
  const userId = 'user-1';
  const history = {
    scope: 'consolidated',
    points: [],
    summary: {
      scope: 'consolidated',
      pointCount: 0,
      hasMore: false,
    },
  };
  const changeExplanation = {
    version: 'portfolio-change-explanation-v1',
    snapshotId: 'snapshot-1',
    baselineSnapshotId: 'snapshot-0',
    baselineStatus: 'available',
    stateDeltaStatus: 'deterministic_state_delta',
    causalityStatus: 'insufficient_data_for_causality',
    summary: 'Observed snapshot state increased.',
    totalValueDelta: 125,
    cashValueDelta: 25,
    drivers: [],
    driverGroups: {
      primary: [],
      byInstitution: [],
      byAccount: [],
      byAssetCategory: [],
      byHolding: [],
    },
    dataLimitations: ['Snapshot state does not establish causality.'],
    notes: [],
  };
  const attentionItems = [
    {
      id: 'high_institution_concentration',
      title: 'One institution has a large portfolio weight',
      description: '75% is held at the largest institution.',
      severity: 'warning',
      category: 'concentration',
    },
  ];
  const portfolioSnapshotsService = {
    getPortfolioHistory: jest.fn().mockResolvedValue(history),
    getSnapshotChangeExplanation: jest
      .fn()
      .mockResolvedValue(changeExplanation),
  };
  const aiService = {
    getAttentionItems: jest.fn().mockResolvedValue(attentionItems),
  };
  const testAuthGuard: CanActivate = {
    canActivate(context: ExecutionContext) {
      const httpRequest = context.switchToHttp().getRequest<{
        user?: { userId: string; email: string };
      }>();
      httpRequest.user = { userId, email: 'demo@aurum.local' };
      return true;
    },
  };
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [PortfolioSnapshotsController, AiController],
      providers: [
        {
          provide: PortfolioSnapshotsService,
          useValue: portfolioSnapshotsService,
        },
        { provide: AiService, useValue: aiService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(testAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('serves scoped portfolio history through the authenticated HTTP route', async () => {
    await request(app.getHttpServer())
      .get('/v1/portfolio-snapshots/history')
      .query({ scope: 'consolidated', limit: '12' })
      .expect(200)
      .expect(history);

    expect(portfolioSnapshotsService.getPortfolioHistory).toHaveBeenCalledWith(
      {
        scope: 'consolidated',
        sourceId: undefined,
        sourceAccountId: undefined,
        assetCategory: undefined,
        limit: 12,
      },
      userId,
    );
  });

  it('rejects an invalid history limit at the HTTP boundary', async () => {
    await request(app.getHttpServer())
      .get('/v1/portfolio-snapshots/history')
      .query({ scope: 'consolidated', limit: '0' })
      .expect(400);

    expect(
      portfolioSnapshotsService.getPortfolioHistory,
    ).not.toHaveBeenCalled();
  });

  it('serves grouped change explanation through the authenticated HTTP route', async () => {
    await request(app.getHttpServer())
      .get('/v1/portfolio-snapshots/snapshot-1/change-explanation')
      .expect(200)
      .expect(changeExplanation);

    expect(
      portfolioSnapshotsService.getSnapshotChangeExplanation,
    ).toHaveBeenCalledWith('snapshot-1', 'previous', userId);
  });

  it('serves computed attention items through the authenticated HTTP route', async () => {
    await request(app.getHttpServer())
      .get('/v1/ai/attention-items')
      .expect(200)
      .expect(attentionItems);

    expect(aiService.getAttentionItems).toHaveBeenCalledWith(userId);
  });
});
