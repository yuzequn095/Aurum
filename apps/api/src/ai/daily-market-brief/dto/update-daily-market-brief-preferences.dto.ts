import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import type {
  DailyMarketBriefCadence,
  DailyMarketBriefDeliveryChannel,
  DailyMarketBriefScope,
} from '../daily-market-brief.types';

export class UpdateDailyMarketBriefPreferencesDto {
  @IsBoolean()
  enabled!: boolean;

  @IsIn(['daily', 'weekdays', 'weekly'] satisfies DailyMarketBriefCadence[])
  cadence!: DailyMarketBriefCadence;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  deliveryTimeLocal!: string;

  @IsString()
  timezone!: string;

  @IsIn([
    'portfolio_aware',
    'market_overview',
  ] satisfies DailyMarketBriefScope[])
  reportScope!: DailyMarketBriefScope;

  @IsIn([
    'in_app',
    'email_placeholder',
  ] satisfies DailyMarketBriefDeliveryChannel[])
  deliveryChannel!: DailyMarketBriefDeliveryChannel;

  @IsOptional()
  @IsString()
  sourceSnapshotId?: string;
}
