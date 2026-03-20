import { ConfigService } from '@nestjs/config';

export interface CoinbaseApiConfig {
  baseUrl: string;
  timeoutMs: number;
}

export function getCoinbaseApiConfig(
  configService: ConfigService,
): CoinbaseApiConfig {
  return {
    baseUrl:
      configService.get<string>('COINBASE_API_BASE_URL')?.trim() ??
      'https://api.coinbase.com',
    timeoutMs: Number(
      configService.get<string>('COINBASE_API_TIMEOUT_MS') ?? '10000',
    ),
  };
}
