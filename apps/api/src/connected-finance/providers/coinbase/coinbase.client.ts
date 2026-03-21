import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ProviderNotConfiguredException } from '../../provider-not-configured.exception';
import {
  getCoinbaseApiConfig,
  getMissingCoinbaseConfig,
} from './coinbase.config';
import type {
  CoinbaseBalance,
  CoinbaseConnectedAccount,
} from './coinbase.types';

type CoinbaseMoney = {
  amount?: string;
  currency?: string;
};

type CoinbaseAccountResponse = {
  id: string;
  name?: string;
  primary?: boolean;
  type?: string;
  currency?: {
    asset_id?: string;
    code?: string;
    name?: string;
    type?: 'crypto' | 'fiat';
    slug?: string;
  };
  balance?: CoinbaseMoney;
  ready?: boolean;
};

type CoinbaseAccountsEnvelope = {
  pagination?: {
    next_uri?: string | null;
  };
  data?: CoinbaseAccountResponse[];
};

type CoinbasePriceEnvelope = {
  data?: {
    amount?: string;
    currency?: string;
  };
};

function parseNumber(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function mapCoinbaseAccount(
  account: CoinbaseAccountResponse,
): CoinbaseConnectedAccount {
  return {
    externalAccountId: account.id,
    displayName:
      account.name ??
      account.currency?.name ??
      account.currency?.code ??
      'Coinbase Account',
    officialName: account.currency?.name ?? undefined,
    accountType: account.type ?? 'wallet',
    currency: account.currency?.code ?? undefined,
    assetCode: account.currency?.code ?? undefined,
    assetName: account.currency?.name ?? undefined,
    assetType: account.currency?.type ?? undefined,
    institutionName: 'Coinbase',
    isActive: account.ready ?? true,
    metadata: {
      assetSlug: account.currency?.slug ?? undefined,
      primary: account.primary ?? false,
      ready: account.ready ?? true,
      balanceAmount: account.balance?.amount ?? undefined,
      balanceCurrency: account.balance?.currency ?? undefined,
    },
    assetId: account.currency?.asset_id ?? undefined,
    primary: account.primary ?? false,
    ready: account.ready ?? true,
  };
}

@Injectable()
export class CoinbaseClient {
  private readonly jwtService = new JwtService();

  constructor(private readonly configService: ConfigService) {}

  async listAccounts(
    apiKeyName: string,
    apiPrivateKey: string,
  ): Promise<CoinbaseConnectedAccount[]> {
    this.assertConfigured();
    const accounts: CoinbaseConnectedAccount[] = [];
    let nextPath = '/v2/accounts';

    while (nextPath) {
      const response = await this.request<CoinbaseAccountsEnvelope>(
        'GET',
        nextPath,
        apiKeyName,
        apiPrivateKey,
      );
      accounts.push(...(response.data ?? []).map(mapCoinbaseAccount));
      nextPath = response.pagination?.next_uri ?? '';
    }

    return accounts;
  }

  async listBalances(
    apiKeyName: string,
    apiPrivateKey: string,
    valuationCurrency = 'USD',
  ): Promise<CoinbaseBalance[]> {
    this.assertConfigured();
    const accounts = await this.listAccounts(apiKeyName, apiPrivateKey);
    const balances = await Promise.all(
      accounts.map(async (account) => {
        const quantity =
          parseNumber(
            (account.metadata?.balanceAmount as string | undefined) ??
              undefined,
          ) ?? undefined;
        const fallbackQuantity = quantity ?? 0;
        const derivedQuantity =
          fallbackQuantity > 0 ? fallbackQuantity : undefined;
        const unitPrice = await this.getUnitPrice(
          account.assetCode ?? account.currency,
          valuationCurrency,
        );
        const marketValue =
          derivedQuantity !== undefined && unitPrice !== undefined
            ? derivedQuantity * unitPrice
            : account.assetType === 'fiat' &&
                derivedQuantity !== undefined &&
                (account.assetCode ?? account.currency) === valuationCurrency
              ? derivedQuantity
              : undefined;

        return {
          externalAccountId: account.externalAccountId,
          assetId: account.assetId,
          symbol: account.assetCode ?? account.currency,
          assetName: account.assetName ?? account.displayName,
          quantity: derivedQuantity,
          unitPrice:
            account.assetType === 'fiat' &&
            (account.assetCode ?? account.currency) === valuationCurrency
              ? 1
              : unitPrice,
          marketValue,
          valuationCurrency,
          accountType: account.accountType,
          assetType: account.assetType,
          metadata: account.metadata,
        };
      }),
    );

    return balances;
  }

  private async getUnitPrice(
    assetSymbol: string | undefined,
    valuationCurrency: string,
  ): Promise<number | undefined> {
    if (!assetSymbol) {
      return undefined;
    }

    if (assetSymbol === valuationCurrency) {
      return 1;
    }

    const pair = `${assetSymbol}-${valuationCurrency}`;

    try {
      const response = await this.publicRequest<CoinbasePriceEnvelope>(
        'GET',
        `/v2/prices/${pair}/spot`,
      );
      return parseNumber(response.data?.amount);
    } catch {
      return undefined;
    }
  }

  private async request<T>(
    method: 'GET',
    path: string,
    apiKeyName: string,
    apiPrivateKey: string,
  ): Promise<T> {
    const config = getCoinbaseApiConfig(this.configService);
    const requestPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${config.baseUrl}${requestPath}`;
    const token = this.buildJwt(method, requestPath, apiKeyName, apiPrivateKey);
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(
        `Coinbase request failed with status ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as T;
  }

  private async publicRequest<T>(method: 'GET', path: string): Promise<T> {
    const config = getCoinbaseApiConfig(this.configService);
    const url = `${config.baseUrl}${path}`;
    const response = await fetch(url, {
      method,
      signal: AbortSignal.timeout(config.timeoutMs),
    });

    if (!response.ok) {
      throw new Error(
        `Coinbase public request failed with status ${response.status} ${response.statusText}`,
      );
    }

    return (await response.json()) as T;
  }

  private buildJwt(
    method: string,
    path: string,
    apiKeyName: string,
    apiPrivateKey: string,
  ): string {
    const config = getCoinbaseApiConfig(this.configService);
    const uri = `${method.toUpperCase()} ${new URL(config.baseUrl).host}${path}`;
    const header = {
      alg: 'ES256',
      kid: apiKeyName,
      nonce: randomBytes(16).toString('hex'),
    } as unknown as { alg: 'ES256'; kid: string };

    return this.jwtService.sign(
      {
        uri,
      },
      {
        algorithm: 'ES256',
        privateKey: apiPrivateKey,
        issuer: 'cdp',
        subject: apiKeyName,
        expiresIn: '2m',
        // Coinbase App auth expects a `nonce` JOSE header even though Nest's
        // JWT wrapper types only model the standard header fields.
        header,
      },
    );
  }

  private assertConfigured() {
    const missingConfig = getMissingCoinbaseConfig(this.configService);
    if (missingConfig.length > 0) {
      throw new ProviderNotConfiguredException('COINBASE', missingConfig);
    }
  }
}
