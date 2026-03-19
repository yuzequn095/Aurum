import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import type { PortfolioAssetCategory } from '@aurum/core';

const portfolioAssetCategories: PortfolioAssetCategory[] = [
  'cash',
  'equity',
  'etf',
  'crypto',
  'fund',
  'other',
];

export class UpdateConnectedSourceAccountDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  accountType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsIn(portfolioAssetCategories)
  assetType?: PortfolioAssetCategory;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  assetSubType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  institutionOrIssuer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  externalAccountId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  maskLast4?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
