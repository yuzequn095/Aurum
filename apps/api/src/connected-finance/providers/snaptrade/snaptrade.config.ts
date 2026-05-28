import { ConfigService } from '@nestjs/config';
import { ProviderNotConfiguredException } from '../../provider-not-configured.exception';

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

  const missingConfig = getMissingSnapTradeConfig(configService);
  if (missingConfig.length > 0) {
    throw new ProviderNotConfiguredException('SNAPTRADE', missingConfig);
  }

  return {
    clientId: clientId!,
    consumerKey: consumerKey!,
    redirectUri: configService.get<string>('SNAPTRADE_REDIRECT_URI')?.trim(),
    baseUrl: configService.get<string>('SNAPTRADE_BASE_URL')?.trim(),
  };
}

export function getMissingSnapTradeConfig(
  configService: ConfigService,
): string[] {
  const missing: string[] = [];
  if (!configService.get<string>('SNAPTRADE_CLIENT_ID')?.trim()) {
    missing.push('SNAPTRADE_CLIENT_ID');
  }
  if (!configService.get<string>('SNAPTRADE_CONSUMER_KEY')?.trim()) {
    missing.push('SNAPTRADE_CONSUMER_KEY');
  }

  return missing;
}
