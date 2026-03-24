import { AIEntitlementFeatureKey, AIEntitlementStatus } from '@prisma/client';
import { EntitlementsService } from './entitlements.service';

describe('EntitlementsService', () => {
  const prisma = {
    aIEntitlementRecord: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns enabled features for an active entitlement', async () => {
    prisma.aIEntitlementRecord.findUnique.mockResolvedValue({
      id: 'entitlement_1',
      userId: 'user_1',
      planKey: 'premium',
      status: AIEntitlementStatus.ACTIVE,
      featureKeys: [
        AIEntitlementFeatureKey.AI_REPORT_SNAPSHOT_PORTFOLIO_REPORT,
        AIEntitlementFeatureKey.AI_ANALYSIS_FINANCIAL_HEALTH_SCORE,
      ],
      expiresAt: null,
      createdAt: new Date('2026-03-23T00:00:00.000Z'),
      updatedAt: new Date('2026-03-23T00:00:00.000Z'),
    });

    const service = new EntitlementsService(prisma as never);
    const entitlements = await service.getCurrentUserEntitlements('user_1');

    expect(entitlements).toEqual({
      status: 'active',
      planKey: 'premium',
      featureKeys: [
        'ai.report.snapshot_portfolio_report',
        'ai.analysis.financial_health_score',
      ],
      enabledFeatureKeys: [
        'ai.report.snapshot_portfolio_report',
        'ai.analysis.financial_health_score',
      ],
      historicalArtifactReadAllowed: true,
      expiresAt: undefined,
    });
  });

  it('keeps historical reads allowed while blocking expired premium access', async () => {
    prisma.aIEntitlementRecord.findUnique.mockResolvedValue({
      id: 'entitlement_1',
      userId: 'user_1',
      planKey: 'premium',
      status: AIEntitlementStatus.ACTIVE,
      featureKeys: [AIEntitlementFeatureKey.AI_CONVERSATIONS_REPLY],
      expiresAt: new Date('2026-03-22T00:00:00.000Z'),
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-22T00:00:00.000Z'),
    });

    const service = new EntitlementsService(prisma as never);
    const entitlements = await service.getCurrentUserEntitlements('user_1');

    expect(entitlements.historicalArtifactReadAllowed).toBe(true);
    expect(entitlements.status).toBe('expired');
    expect(entitlements.enabledFeatureKeys).toEqual([]);
    await expect(
      service.assertConversationReplyAllowed('user_1'),
    ).rejects.toThrow('Active entitlement required for conversations reply.');
  });

  it('returns feature_not_enabled for active plans missing a feature', async () => {
    prisma.aIEntitlementRecord.findUnique.mockResolvedValue({
      id: 'entitlement_1',
      userId: 'user_1',
      planKey: 'starter',
      status: AIEntitlementStatus.ACTIVE,
      featureKeys: [AIEntitlementFeatureKey.AI_QUICK_CHAT],
      expiresAt: null,
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      updatedAt: new Date('2026-03-23T00:00:00.000Z'),
    });

    const service = new EntitlementsService(prisma as never);
    const decision = await service.evaluateFeatureAccess(
      'user_1',
      'ai.analysis.financial_health_score',
    );

    expect(decision).toEqual({
      allowed: false,
      reason: 'feature_not_enabled',
    });
  });
});
