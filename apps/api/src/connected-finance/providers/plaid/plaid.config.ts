import { ConfigService } from '@nestjs/config';
import { CountryCode, PlaidEnvironments, Products } from 'plaid';

const DEFAULT_PRODUCTS = ['auth'];
const DEFAULT_COUNTRY_CODES = ['US'];

type PlaidEnvironmentKey = 'sandbox' | 'development' | 'production';

export interface PlaidApiConfig {
  clientId: string;
  secret: string;
  env: PlaidEnvironmentKey;
  products: Products[];
  countryCodes: CountryCode[];
  redirectUri?: string;
}

function parseStringList(
  rawValue: string | undefined,
  defaults: string[],
): string[] {
  const values = (rawValue ?? defaults.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return values;
}

export function getMissingPlaidConfig(configService: ConfigService): string[] {
  const missing: string[] = [];

  if (!configService.get<string>('PLAID_CLIENT_ID')?.trim()) {
    missing.push('PLAID_CLIENT_ID');
  }

  if (!configService.get<string>('PLAID_SECRET')?.trim()) {
    missing.push('PLAID_SECRET');
  }

  return missing;
}

export function getPlaidApiConfig(
  configService: ConfigService,
): PlaidApiConfig {
  const missing = getMissingPlaidConfig(configService);
  if (missing.length > 0) {
    throw new Error(
      `${missing.join(', ')} ${missing.length > 1 ? 'are' : 'is'} required`,
    );
  }

  const clientId = configService.get<string>('PLAID_CLIENT_ID')!.trim();
  const secret = configService.get<string>('PLAID_SECRET')!.trim();
  const rawEnv = configService.get<string>('PLAID_ENV')?.trim().toLowerCase();
  const redirectUri = configService.get<string>('PLAID_REDIRECT_URI')?.trim();

  const env: PlaidEnvironmentKey =
    rawEnv === 'development' || rawEnv === 'production' || rawEnv === 'sandbox'
      ? rawEnv
      : 'sandbox';

  return {
    clientId,
    secret,
    env,
    products: parseStringList(
      configService.get<string>('PLAID_PRODUCTS'),
      DEFAULT_PRODUCTS,
    ).map((value) => value.toLowerCase() as Products),
    countryCodes: parseStringList(
      configService.get<string>('PLAID_COUNTRY_CODES'),
      DEFAULT_COUNTRY_CODES,
    ).map((value) => value.toUpperCase() as CountryCode),
    redirectUri:
      redirectUri && redirectUri.length > 0 ? redirectUri : undefined,
  };
}

export function getPlaidBasePath(env: PlaidEnvironmentKey): string {
  return PlaidEnvironments[env];
}
