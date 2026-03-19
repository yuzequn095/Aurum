import { connectedSourceStatuses } from '@aurum/core';
import {
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateConnectedSourceDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  providerKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsIn(connectedSourceStatuses)
  status?: (typeof connectedSourceStatuses)[number];

  @IsOptional()
  @IsString()
  @MaxLength(120)
  institutionName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  baseCurrency?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
