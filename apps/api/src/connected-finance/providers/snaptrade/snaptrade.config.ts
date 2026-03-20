import { ConfigService } from '@nestjs/config';

export interface SnapTradeApiConfig {
  clientId: string;
  consumerKey: string;
  redirectUri?: string;
  baseUrl?: string;
}

export function getSnapTradeApiConfig(
  configService: ConfigService,
): SnapTradeApiConfig {
  const clientId = configService.get<string>('SNAPTRADE_CLIENT_ID')?.trim();
  const consumerKey = configService
    .get<string>('SNAPTRADE_CONSUMER_KEY')
    ?.trim();

  if (!clientId || !consumerKey) {
    throw new Error(
      'SNAPTRADE_CLIENT_ID and SNAPTRADE_CONSUMER_KEY are required',
    );
  }

  return {
    clientId,
    consumerKey,
    redirectUri: configService.get<string>('SNAPTRADE_REDIRECT_URI')?.trim(),
    baseUrl: configService.get<string>('SNAPTRADE_BASE_URL')?.trim(),
  };
}
