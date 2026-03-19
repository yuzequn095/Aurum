import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import type { PlaidExchangePublicTokenMetadata } from '../providers/plaid/plaid.types';

export class ExchangePlaidPublicTokenDto {
  @IsString()
  @MaxLength(512)
  publicToken!: string;

  @IsOptional()
  @IsObject()
  metadata?: PlaidExchangePublicTokenMetadata;
}
