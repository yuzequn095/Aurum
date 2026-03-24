import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapEntitlementRecordToView,
  mapFeatureKeyToPrisma,
  mapStatusToPrisma,
} from './entitlement.mapper';
import type {
  AIEntitlementFeatureKey,
  CurrentUserEntitlementsView,
  EntitlementAccessReason,
  FeatureAccessDecision,
} from './entitlements.types';

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentUserEntitlements(
    userId: string,
  ): Promise<CurrentUserEntitlementsView> {
    const record = await this.prisma.aIEntitlementRecord.findUnique({
      where: { userId },
    });

    const view = mapEntitlementRecordToView(record);
    const status = this.resolveEffectiveStatus(view);
    return {
      ...view,
      status,
      enabledFeatureKeys: this.resolveEnabledFeatureKeys({
        ...view,
        status,
      }),
    };
  }

  async evaluateFeatureAccess(
    userId: string,
    featureKey: AIEntitlementFeatureKey,
  ): Promise<FeatureAccessDecision> {
    const entitlements = await this.getCurrentUserEntitlements(userId);

    if (entitlements.status === 'expired') {
      return { allowed: false, reason: 'expired' };
    }

    if (entitlements.status !== 'active') {
      return { allowed: false, reason: 'inactive' };
    }

    if (!entitlements.featureKeys.includes(featureKey)) {
      return { allowed: false, reason: 'feature_not_enabled' };
    }

    return { allowed: true };
  }

  async assertFeatureEnabled(
    userId: string,
    featureKey: AIEntitlementFeatureKey,
  ): Promise<void> {
    const decision = await this.evaluateFeatureAccess(userId, featureKey);
    if (decision.allowed) {
      return;
    }

    throw new ForbiddenException(
      this.buildForbiddenMessage(featureKey, decision.reason ?? 'inactive'),
    );
  }

  async assertConversationReplyAllowed(userId: string): Promise<void> {
    await this.assertFeatureEnabled(userId, 'ai.conversations.reply');
  }

  async replaceEntitlement(
    userId: string,
    input: {
      planKey?: string;
      status: CurrentUserEntitlementsView['status'];
      featureKeys: AIEntitlementFeatureKey[];
      expiresAt?: Date;
    },
  ): Promise<CurrentUserEntitlementsView> {
    await this.prisma.aIEntitlementRecord.upsert({
      where: { userId },
      create: {
        userId,
        planKey: input.planKey,
        status: mapStatusToPrisma(input.status),
        featureKeys: input.featureKeys.map(mapFeatureKeyToPrisma),
        expiresAt: input.expiresAt,
      },
      update: {
        planKey: input.planKey,
        status: mapStatusToPrisma(input.status),
        featureKeys: input.featureKeys.map(mapFeatureKeyToPrisma),
        expiresAt: input.expiresAt,
      },
    });

    return this.getCurrentUserEntitlements(userId);
  }

  private resolveEnabledFeatureKeys(
    entitlements: CurrentUserEntitlementsView,
  ): AIEntitlementFeatureKey[] {
    if (entitlements.status !== 'active') {
      return [];
    }

    if (entitlements.expiresAt) {
      const expiresAt = new Date(entitlements.expiresAt);
      if (
        !Number.isNaN(expiresAt.getTime()) &&
        expiresAt.getTime() < Date.now()
      ) {
        return [];
      }
    }

    return entitlements.featureKeys;
  }

  private resolveEffectiveStatus(
    entitlements: CurrentUserEntitlementsView,
  ): CurrentUserEntitlementsView['status'] {
    if (entitlements.status !== 'active') {
      return entitlements.status;
    }

    if (!entitlements.expiresAt) {
      return entitlements.status;
    }

    const expiresAt = new Date(entitlements.expiresAt);
    if (
      !Number.isNaN(expiresAt.getTime()) &&
      expiresAt.getTime() < Date.now()
    ) {
      return 'expired';
    }

    return entitlements.status;
  }

  private buildForbiddenMessage(
    featureKey: AIEntitlementFeatureKey,
    reason: EntitlementAccessReason,
  ): string {
    const actionLabel = featureKey.replace(/^ai\./, '').replace(/\./g, ' ');
    switch (reason) {
      case 'expired':
        return `Active entitlement required for ${actionLabel}.`;
      case 'feature_not_enabled':
        return `Current entitlement does not include ${actionLabel}.`;
      case 'inactive':
      default:
        return `Subscription inactive for ${actionLabel}.`;
    }
  }
}
