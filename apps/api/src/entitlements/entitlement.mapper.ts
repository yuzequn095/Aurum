import {
  AIEntitlementFeatureKey as PrismaAIEntitlementFeatureKey,
  AIEntitlementStatus as PrismaAIEntitlementStatus,
  type AIEntitlementRecord,
} from '@prisma/client';
import type {
  AIEntitlementFeatureKey,
  AIEntitlementStatus,
  CurrentUserEntitlementsView,
} from './entitlements.types';

export function mapFeatureKeyToPrisma(
  featureKey: AIEntitlementFeatureKey,
): PrismaAIEntitlementFeatureKey {
  switch (featureKey) {
    case 'ai.quick_chat':
      return PrismaAIEntitlementFeatureKey.AI_QUICK_CHAT;
    case 'ai.conversations.save':
      return PrismaAIEntitlementFeatureKey.AI_CONVERSATIONS_SAVE;
    case 'ai.conversations.reply':
      return PrismaAIEntitlementFeatureKey.AI_CONVERSATIONS_REPLY;
    case 'ai.report.snapshot_portfolio_report':
      return PrismaAIEntitlementFeatureKey.AI_REPORT_SNAPSHOT_PORTFOLIO_REPORT;
    case 'ai.report.monthly_financial_review':
      return PrismaAIEntitlementFeatureKey.AI_REPORT_MONTHLY_FINANCIAL_REVIEW;
    case 'ai.report.daily_market_brief':
      return PrismaAIEntitlementFeatureKey.AI_REPORT_DAILY_MARKET_BRIEF;
    case 'ai.analysis.financial_health_score':
      return PrismaAIEntitlementFeatureKey.AI_ANALYSIS_FINANCIAL_HEALTH_SCORE;
    case 'ai.analysis.portfolio_analysis':
      return PrismaAIEntitlementFeatureKey.AI_ANALYSIS_PORTFOLIO_ANALYSIS;
    case 'ai.planning.budget':
      return PrismaAIEntitlementFeatureKey.AI_PLANNING_BUDGET;
    case 'ai.planning.goals':
      return PrismaAIEntitlementFeatureKey.AI_PLANNING_GOALS;
  }
}

export function mapFeatureKeyFromPrisma(
  featureKey: PrismaAIEntitlementFeatureKey,
): AIEntitlementFeatureKey {
  switch (featureKey) {
    case PrismaAIEntitlementFeatureKey.AI_QUICK_CHAT:
      return 'ai.quick_chat';
    case PrismaAIEntitlementFeatureKey.AI_CONVERSATIONS_SAVE:
      return 'ai.conversations.save';
    case PrismaAIEntitlementFeatureKey.AI_CONVERSATIONS_REPLY:
      return 'ai.conversations.reply';
    case PrismaAIEntitlementFeatureKey.AI_REPORT_SNAPSHOT_PORTFOLIO_REPORT:
      return 'ai.report.snapshot_portfolio_report';
    case PrismaAIEntitlementFeatureKey.AI_REPORT_MONTHLY_FINANCIAL_REVIEW:
      return 'ai.report.monthly_financial_review';
    case PrismaAIEntitlementFeatureKey.AI_REPORT_DAILY_MARKET_BRIEF:
      return 'ai.report.daily_market_brief';
    case PrismaAIEntitlementFeatureKey.AI_ANALYSIS_FINANCIAL_HEALTH_SCORE:
      return 'ai.analysis.financial_health_score';
    case PrismaAIEntitlementFeatureKey.AI_ANALYSIS_PORTFOLIO_ANALYSIS:
      return 'ai.analysis.portfolio_analysis';
    case PrismaAIEntitlementFeatureKey.AI_PLANNING_BUDGET:
      return 'ai.planning.budget';
    case PrismaAIEntitlementFeatureKey.AI_PLANNING_GOALS:
      return 'ai.planning.goals';
  }
}

export function mapStatusToPrisma(
  status: AIEntitlementStatus,
): PrismaAIEntitlementStatus {
  switch (status) {
    case 'active':
      return PrismaAIEntitlementStatus.ACTIVE;
    case 'inactive':
      return PrismaAIEntitlementStatus.INACTIVE;
    case 'expired':
      return PrismaAIEntitlementStatus.EXPIRED;
  }
}

export function mapStatusFromPrisma(
  status: PrismaAIEntitlementStatus,
): AIEntitlementStatus {
  switch (status) {
    case PrismaAIEntitlementStatus.ACTIVE:
      return 'active';
    case PrismaAIEntitlementStatus.INACTIVE:
      return 'inactive';
    case PrismaAIEntitlementStatus.EXPIRED:
      return 'expired';
  }
}

export function mapEntitlementRecordToView(
  record: AIEntitlementRecord | null,
): CurrentUserEntitlementsView {
  if (!record) {
    return {
      status: 'inactive',
      featureKeys: [],
      enabledFeatureKeys: [],
      historicalArtifactReadAllowed: true,
    };
  }

  return {
    status: mapStatusFromPrisma(record.status),
    planKey: record.planKey ?? undefined,
    featureKeys: record.featureKeys.map(mapFeatureKeyFromPrisma),
    enabledFeatureKeys: [],
    historicalArtifactReadAllowed: true,
    expiresAt: record.expiresAt?.toISOString(),
  };
}
