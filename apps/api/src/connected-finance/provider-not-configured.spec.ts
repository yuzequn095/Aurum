import { ConfigService } from '@nestjs/config';
import {
  getProviderNotConfiguredGuidance,
  parseProviderNotConfiguredDetails,
} from '@aurum/core';
import { ProviderNotConfiguredException } from './provider-not-configured.exception';
import { CoinbaseClient } from './providers/coinbase/coinbase.client';
import { getMissingCoinbaseConfig } from './providers/coinbase/coinbase.config';
import { PlaidClient } from './providers/plaid/plaid.client';
import { getMissingPlaidConfig } from './providers/plaid/plaid.config';
import { SnapTradeClient } from './providers/snaptrade/snaptrade.client';
import { getMissingSnapTradeConfig } from './providers/snaptrade/snaptrade.config';

describe('Provider not configured handling', () => {
  it('returns a structured Plaid provider-not-configured error when env is missing', async () => {
    const client = new PlaidClient(new ConfigService({}));

    await expect(client.createLinkToken('user_1')).rejects.toMatchObject({
      response: {
        statusCode: 503,
        code: 'PROVIDER_NOT_CONFIGURED',
        provider: 'PLAID',
        missingConfig: ['PLAID_CLIENT_ID', 'PLAID_SECRET'],
      },
      status: 503,
    });
  });

  it('returns a structured Coinbase provider-not-configured error when env is missing', async () => {
    const client = new CoinbaseClient(new ConfigService({}));

    await expect(
      client.listAccounts(
        'organizations/org/apiKeys/key',
        '-----BEGIN EC PRIVATE KEY-----\nprivate\n-----END EC PRIVATE KEY-----',
      ),
    ).rejects.toMatchObject({
      response: {
        statusCode: 503,
        code: 'PROVIDER_NOT_CONFIGURED',
        provider: 'COINBASE',
        missingConfig: ['COINBASE_ENABLED'],
      },
      status: 503,
    });
  });

  it('returns a structured SnapTrade provider-not-configured error when env is missing', async () => {
    const client = new SnapTradeClient(new ConfigService({}));

    await expect(client.registerUser('user_1')).rejects.toMatchObject({
      response: {
        statusCode: 503,
        code: 'PROVIDER_NOT_CONFIGURED',
        provider: 'SNAPTRADE',
        missingConfig: ['SNAPTRADE_CLIENT_ID', 'SNAPTRADE_CONSUMER_KEY'],
      },
      status: 503,
    });
  });

  it('recognizes configured Plaid, Coinbase, and SnapTrade environments without changing happy-path guards', () => {
    const configuredPlaid = new ConfigService({
      PLAID_CLIENT_ID: 'plaid-client-id',
      PLAID_SECRET: 'plaid-secret',
    });
    const configuredCoinbase = new ConfigService({
      COINBASE_ENABLED: 'true',
    });
    const configuredSnapTrade = new ConfigService({
      SNAPTRADE_CLIENT_ID: 'snaptrade-client-id',
      SNAPTRADE_CONSUMER_KEY: 'snaptrade-consumer-key',
    });

    expect(getMissingPlaidConfig(configuredPlaid)).toEqual([]);
    expect(getMissingCoinbaseConfig(configuredCoinbase)).toEqual([]);
    expect(getMissingSnapTradeConfig(configuredSnapTrade)).toEqual([]);
  });

  it('maps provider-not-configured details into friendly provider-specific guidance', () => {
    const plaidDetails = parseProviderNotConfiguredDetails({
      statusCode: 503,
      code: 'PROVIDER_NOT_CONFIGURED',
      provider: 'PLAID',
      message: 'PLAID backend provider is not configured in this environment.',
    });
    const coinbaseDetails = parseProviderNotConfiguredDetails({
      statusCode: 503,
      code: 'PROVIDER_NOT_CONFIGURED',
      provider: 'COINBASE',
      message:
        'COINBASE backend provider is not configured in this environment.',
    });
    const snapTradeDetails = parseProviderNotConfiguredDetails({
      statusCode: 503,
      code: 'PROVIDER_NOT_CONFIGURED',
      provider: 'SNAPTRADE',
      message:
        'SNAPTRADE backend provider is not configured in this environment.',
    });

    expect(plaidDetails).toEqual({
      provider: 'PLAID',
      ...getProviderNotConfiguredGuidance('PLAID'),
    });
    expect(coinbaseDetails).toEqual({
      provider: 'COINBASE',
      ...getProviderNotConfiguredGuidance('COINBASE'),
    });
    expect(snapTradeDetails).toEqual({
      provider: 'SNAPTRADE',
      ...getProviderNotConfiguredGuidance('SNAPTRADE'),
    });
  });

  it('leaves unrelated API failures alone so generic error handling still works', () => {
    expect(
      parseProviderNotConfiguredDetails({
        statusCode: 500,
        message: 'Internal server error',
      }),
    ).toBeNull();
  });

  it('builds a stable provider-not-configured exception payload', () => {
    const error = new ProviderNotConfiguredException('PLAID', [
      'PLAID_CLIENT_ID',
    ]);

    expect(error).toBeInstanceOf(ProviderNotConfiguredException);
    expect(error.getStatus()).toBe(503);
    expect(error.getResponse()).toMatchObject({
      statusCode: 503,
      code: 'PROVIDER_NOT_CONFIGURED',
      provider: 'PLAID',
      missingConfig: ['PLAID_CLIENT_ID'],
    });
  });
});
