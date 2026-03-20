import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ConnectCoinbaseCryptoDto {
  @IsString()
  @MaxLength(255)
  apiKeyName!: string;

  @IsString()
  @MaxLength(16384)
  apiPrivateKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  baseCurrency?: string;
}
