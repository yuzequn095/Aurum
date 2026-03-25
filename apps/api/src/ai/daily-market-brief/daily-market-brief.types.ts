export type DailyMarketBriefScope = 'portfolio_aware' | 'market_overview';

export type DailyMarketBriefCadence = 'daily' | 'weekdays' | 'weekly';

export type DailyMarketBriefDeliveryChannel = 'in_app' | 'email_placeholder';

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
