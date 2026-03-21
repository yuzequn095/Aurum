import { ConfigService } from '@nestjs/config';

export interface CoinbaseApiConfig {
  enabled: boolean;
  baseUrl: string;
  timeoutMs: number;
}

export function getMissingCoinbaseConfig(
  configService: ConfigService,
): string[] {
  return configService.get<string>('COINBASE_ENABLED')?.trim().toLowerCase() ===
    'true'
    ? []
    : ['COINBASE_ENABLED'];
}

export function getCoinbaseApiConfig(
  configService: ConfigService,
): CoinbaseApiConfig {
  const enabled =
    configService.get<string>('COINBASE_ENABLED')?.trim().toLowerCase() ===
    'true';

  return {
    enabled,
    baseUrl:
      configService.get<string>('COINBASE_API_BASE_URL')?.trim() ??
      'https://api.coinbase.com',
    timeoutMs: Number(
      configService.get<string>('COINBASE_API_TIMEOUT_MS') ?? '10000',
    ),
  };
}
