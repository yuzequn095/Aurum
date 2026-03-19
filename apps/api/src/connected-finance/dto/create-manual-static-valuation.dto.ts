import {
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateManualStaticValuationDto {
  @Matches(DATE_ONLY_PATTERN, {
    message: 'valuationDate must be YYYY-MM-DD',
  })
  valuationDate!: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsNumber()
  @Min(0)
  marketValue!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  symbol?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  assetName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
