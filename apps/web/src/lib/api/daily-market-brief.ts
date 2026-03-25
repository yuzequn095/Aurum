import type { AIReportArtifact } from '@aurum/core';
import { apiGet, apiPatch, apiPost } from '@/lib/api';

export type DailyMarketBriefScope = 'portfolio_aware' | 'market_overview';

export type DailyMarketBriefCadence = 'daily' | 'weekdays' | 'weekly';

export type DailyMarketBriefDeliveryChannel = 'in_app' | 'email_placeholder';

export interface CreateDailyMarketBriefRequest {
  sourceSnapshotId?: string;
  reportScope?: DailyMarketBriefScope;
}

export interface DailyMarketBriefPreferenceView {
  enabled: boolean;
  cadence: DailyMarketBriefCadence;
  deliveryTimeLocal: string;
  timezone: string;
  reportScope: DailyMarketBriefScope;
  deliveryChannel: DailyMarketBriefDeliveryChannel;
  sourceSnapshotId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type UpdateDailyMarketBriefPreferencesRequest = DailyMarketBriefPreferenceView;

export async function createDailyMarketBrief(
  body: CreateDailyMarketBriefRequest,
): Promise<AIReportArtifact> {
  return apiPost<AIReportArtifact>('/v1/ai/daily-market-brief', body);
}

export async function getDailyMarketBriefPreferences(): Promise<DailyMarketBriefPreferenceView> {
  return apiGet<DailyMarketBriefPreferenceView>('/v1/ai/daily-market-brief/preferences/me');
}

export async function updateDailyMarketBriefPreferences(
  body: UpdateDailyMarketBriefPreferencesRequest,
): Promise<DailyMarketBriefPreferenceView> {
  return apiPatch<DailyMarketBriefPreferenceView>('/v1/ai/daily-market-brief/preferences/me', body);
}
