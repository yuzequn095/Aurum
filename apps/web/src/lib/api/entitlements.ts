import { apiGet } from '@/lib/api';

export type AIEntitlementFeatureKey =
  | 'ai.quick_chat'
  | 'ai.conversations.save'
  | 'ai.conversations.reply'
  | 'ai.report.snapshot_portfolio_report'
  | 'ai.report.monthly_financial_review'
  | 'ai.report.daily_market_brief'
  | 'ai.analysis.financial_health_score'
  | 'ai.analysis.portfolio_analysis'
  | 'ai.planning.budget'
  | 'ai.planning.goals';

export type CurrentUserEntitlementsView = {
  status: 'active' | 'inactive' | 'expired';
  planKey?: string;
  featureKeys: AIEntitlementFeatureKey[];
  enabledFeatureKeys: AIEntitlementFeatureKey[];
  historicalArtifactReadAllowed: true;
  expiresAt?: string;
};

export async function getCurrentUserEntitlements(): Promise<CurrentUserEntitlementsView> {
  return apiGet<CurrentUserEntitlementsView>('/v1/entitlements/me');
}
