import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration, PlaidApi } from 'plaid';
import { ProviderNotConfiguredException } from '../../provider-not-configured.exception';
import {
  getMissingPlaidConfig,
  getPlaidApiConfig,
  getPlaidBasePath,
} from './plaid.config';
import type {
  PlaidAccountsResult,
  PlaidExchangeResult,
  PlaidExchangePublicTokenMetadata,
  PlaidInstitutionMetadata,
  PlaidLinkTokenResult,
} from './plaid.types';

@Injectable()
export class PlaidClient {
  constructor(private readonly configService: ConfigService) {}

  async createLinkToken(userId: string): Promise<PlaidLinkTokenResult> {
    this.assertConfigured();
    const client = this.createClient();
    const config = getPlaidApiConfig(this.configService);
    const response = await client.linkTokenCreate({
      client_name: 'Aurum',
      language: 'en',
      products: config.products,
      country_codes: config.countryCodes,
      user: {
        client_user_id: userId,
      },
      redirect_uri: config.redirectUri,
    });

    return {
      linkToken: response.data.link_token,
      expiration: response.data.expiration ?? undefined,
      requestId: response.data.request_id ?? undefined,
    };
  }

  async exchangePublicToken(publicToken: string): Promise<PlaidExchangeResult> {
    this.assertConfigured();
    const client = this.createClient();
    const response = await client.itemPublicTokenExchange({
      public_token: publicToken,
    });

    return {
      accessToken: response.data.access_token,
      itemId: response.data.item_id,
      requestId: response.data.request_id ?? undefined,
    };
  }

  async getInitialAccounts(
    accessToken: string,
    metadata?: PlaidExchangePublicTokenMetadata,
  ): Promise<PlaidAccountsResult> {
    this.assertConfigured();
    const client = this.createClient();
    const response = await client.accountsGet({
      access_token: accessToken,
    });

    return {
      itemId: response.data.item?.item_id ?? undefined,
      institution: this.resolveInstitutionMetadata(
        metadata,
        response.data.item?.institution_id ?? undefined,
      ),
      accounts: response.data.accounts.map((account) => ({
        externalAccountId: account.account_id,
        displayName: account.name,
        officialName: account.official_name ?? undefined,
        accountType: account.type,
        accountSubType: account.subtype ?? undefined,
        currency:
          account.balances.iso_currency_code ??
          account.balances.unofficial_currency_code ??
          undefined,
        maskLast4: account.mask ?? undefined,
        institutionName: metadata?.institution?.institutionName,
        currentBalance: account.balances.current ?? undefined,
        availableBalance: account.balances.available ?? undefined,
        asOf: undefined,
        metadata: {
          provider: 'PLAID',
          providerType: account.type,
          providerSubType: account.subtype ?? undefined,
        },
      })),
      requestId: response.data.request_id ?? undefined,
    };
  }

  async getCurrentBalances(accessToken: string): Promise<PlaidAccountsResult> {
    this.assertConfigured();
    const client = this.createClient();
    const response = await client.accountsBalanceGet({
      access_token: accessToken,
    });

    return {
      itemId: response.data.item?.item_id ?? undefined,
      institution: {
        institutionId: response.data.item?.institution_id ?? undefined,
      },
      accounts: response.data.accounts.map((account) => ({
        externalAccountId: account.account_id,
        displayName: account.name,
        officialName: account.official_name ?? undefined,
        accountType: account.type,
        accountSubType: account.subtype ?? undefined,
        currency:
          account.balances.iso_currency_code ??
          account.balances.unofficial_currency_code ??
          undefined,
        maskLast4: account.mask ?? undefined,
        currentBalance: account.balances.current ?? undefined,
        availableBalance: account.balances.available ?? undefined,
        asOf: account.balances.last_updated_datetime ?? undefined,
        metadata: {
          provider: 'PLAID',
          providerType: account.type,
          providerSubType: account.subtype ?? undefined,
        },
      })),
      requestId: response.data.request_id ?? undefined,
    };
  }

  private resolveInstitutionMetadata(
    metadata: PlaidExchangePublicTokenMetadata | undefined,
    institutionId: string | undefined,
  ): PlaidInstitutionMetadata | undefined {
    const institutionName = metadata?.institution?.institutionName;
    const resolvedInstitutionId =
      metadata?.institution?.institutionId ?? institutionId;

    if (!institutionName && !resolvedInstitutionId) {
      return undefined;
    }

    return {
      institutionId: resolvedInstitutionId,
      institutionName,
    };
  }

  private createClient(): PlaidApi {
    const config = getPlaidApiConfig(this.configService);

    return new PlaidApi(
      new Configuration({
        basePath: getPlaidBasePath(config.env),
        baseOptions: {
          headers: {
            'PLAID-CLIENT-ID': config.clientId,
            'PLAID-SECRET': config.secret,
            'Plaid-Version': '2020-09-14',
          },
        },
      }),
    );
  }

  private assertConfigured() {
    const missingConfig = getMissingPlaidConfig(this.configService);
    if (missingConfig.length > 0) {
      throw new ProviderNotConfiguredException('PLAID', missingConfig);
    }
  }
}
