export const AI_ENTITLEMENT_FEATURE_KEYS = [
  'ai.quick_chat',
  'ai.conversations.save',
  'ai.conversations.reply',
  'ai.report.snapshot_portfolio_report',
  'ai.report.monthly_financial_review',
  'ai.report.daily_market_brief',
  'ai.analysis.financial_health_score',
  'ai.analysis.portfolio_analysis',
  'ai.planning.budget',
  'ai.planning.goals',
] as const;

export type AIEntitlementFeatureKey =
  (typeof AI_ENTITLEMENT_FEATURE_KEYS)[number];

export type AIEntitlementStatus = 'active' | 'inactive' | 'expired';

export type EntitlementAccessReason =
  | 'inactive'
  | 'expired'
  | 'feature_not_enabled';

export interface FeatureAccessDecision {
  allowed: boolean;
  reason?: EntitlementAccessReason;
}

export interface CurrentUserEntitlementsView {
  status: AIEntitlementStatus;
  planKey?: string;
  featureKeys: AIEntitlementFeatureKey[];
  enabledFeatureKeys: AIEntitlementFeatureKey[];
  historicalArtifactReadAllowed: true;
  expiresAt?: string;
}
