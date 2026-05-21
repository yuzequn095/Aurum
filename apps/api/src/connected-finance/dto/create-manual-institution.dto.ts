import {
  manualInstitutionPresets,
  type PortfolioAssetCategory,
} from '@aurum/core';
import {
  IsArray,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const manualInstitutionKeys = manualInstitutionPresets.map(
  (preset) => preset.institutionKey,
);

const portfolioAssetCategories: PortfolioAssetCategory[] = [
  'cash',
  'equity',
  'etf',
  'crypto',
  'fund',
  'other',
];

export class ManualInstitutionAccountOverrideDto {
  @IsString()
  @MaxLength(80)
  accountKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  accountType?: string;

  @IsOptional()
  @IsIn(portfolioAssetCategories)
  assetType?: PortfolioAssetCategory;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  assetSubType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateManualInstitutionDto {
  @IsIn(manualInstitutionKeys)
  institutionKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  baseCurrency?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualInstitutionAccountOverrideDto)
  accountOverrides?: ManualInstitutionAccountOverrideDto[];
}
