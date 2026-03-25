import { IsIn, IsOptional, IsString } from 'class-validator';
import type { DailyMarketBriefScope } from '../daily-market-brief.types';

export class CreateDailyMarketBriefDto {
  @IsOptional()
  @IsString()
  sourceSnapshotId?: string;

  @IsOptional()
  @IsIn([
    'portfolio_aware',
    'market_overview',
  ] satisfies DailyMarketBriefScope[])
  reportScope?: DailyMarketBriefScope;
}
