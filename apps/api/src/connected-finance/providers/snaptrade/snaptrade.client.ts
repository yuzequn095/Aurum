import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Snaptrade,
  type Account,
  type AuthenticationLoginSnapTradeUser200Response,
  type Balance,
  type BrokerageAuthorization,
  type LoginRedirectURI,
  type Position,
} from 'snaptrade-typescript-sdk';
import { getSnapTradeApiConfig } from './snaptrade.config';
import type {
  SnapTradeAccountHoldingsResult,
  SnapTradeBrokerageAccount,
  SnapTradeBrokerageBalance,
  SnapTradeBrokeragePosition,
  SnapTradeConnectionPortalResult,
  SnapTradeConnectionSummary,
  SnapTradeImportAccountsResult,
} from './snaptrade.types';

function pickConnectionDisplayName(connection: BrokerageAuthorization): string {
  return (
    connection.name ??
    connection.brokerage?.display_name ??
    connection.brokerage?.name ??
    'SnapTrade Brokerage Connection'
  );
}

function pickInstitutionName(
  connection: BrokerageAuthorization,
): string | undefined {
  return connection.brokerage?.display_name ?? connection.brokerage?.name;
}

function maskLast4(
  accountNumber: string | null | undefined,
): string | undefined {
  if (!accountNumber) {
    return undefined;
  }

  return accountNumber.slice(-4);
}

function mapConnection(
  connection: BrokerageAuthorization,
): SnapTradeConnectionSummary {
  return {
    connectionId: connection.id ?? '',
    displayName: pickConnectionDisplayName(connection),
    institutionName: pickInstitutionName(connection),
    disabled: connection.disabled ?? false,
    brokerageSlug: connection.brokerage?.slug,
    metadata: {
      connectionType: connection.type,
      createdDate: connection.created_date,
      disabledDate: connection.disabled_date,
    },
  };
}

function mapAccount(account: Account): SnapTradeBrokerageAccount {
  return {
    externalAccountId: account.id,
    providerConnectionId: account.brokerage_authorization,
    displayName:
      account.name ??
      `${account.institution_name} ${maskLast4(account.number) ?? 'Account'}`,
    officialName: account.name ?? undefined,
    accountType: account.raw_type ?? 'BROKERAGE_ACCOUNT',
    accountSubType: account.status ?? undefined,
    currency: account.balance?.total?.currency ?? undefined,
    institutionName: account.institution_name,
    maskLast4: maskLast4(account.number),
    isActive:
      account.status !== 'closed' &&
      account.status !== 'archived' &&
      account.status !== 'unavailable',
    metadata: {
      provider: 'SNAPTRADE',
      institutionAccountId: account.institution_account_id ?? undefined,
      createdDate: account.created_date,
      fundingDate: account.funding_date ?? undefined,
      openingDate: account.opening_date ?? undefined,
      status: account.status ?? undefined,
      isPaper: account.is_paper,
      balanceTotalAmount: account.balance?.total?.amount ?? undefined,
      balanceTotalCurrency: account.balance?.total?.currency ?? undefined,
    },
  };
}

function mapBalance(
  externalAccountId: string,
  balance: Balance,
): SnapTradeBrokerageBalance {
  return {
    externalAccountId,
    currency: balance.currency?.code ?? undefined,
    cash: balance.cash ?? undefined,
    buyingPower: balance.buying_power ?? undefined,
    metadata: {
      currencyId: balance.currency?.id ?? undefined,
      currencyName: balance.currency?.name ?? undefined,
    },
  };
}

function mapPosition(
  externalAccountId: string,
  position: Position,
): SnapTradeBrokeragePosition {
  const symbol = position.symbol?.symbol;

  return {
    externalAccountId,
    providerInstrumentId: symbol?.id ?? undefined,
    symbol: symbol?.symbol ?? undefined,
    rawSymbol: symbol?.raw_symbol ?? undefined,
    description:
      symbol?.description ?? position.symbol?.description ?? undefined,
    quantity: position.units ?? undefined,
    unitPrice: position.price ?? undefined,
    marketValue:
      position.units !== null &&
      position.units !== undefined &&
      position.price !== null &&
      position.price !== undefined
        ? position.units * position.price
        : undefined,
    currency: position.currency?.code ?? undefined,
    securityType:
      symbol?.type?.description ??
      symbol?.type?.code ??
      symbol?.type?.id ??
      undefined,
    exchange:
      symbol?.exchange?.mic_code ??
      symbol?.exchange?.code ??
      symbol?.exchange?.name ??
      undefined,
    cashEquivalent: position.cash_equivalent ?? undefined,
    metadata: {
      openPnl: position.open_pnl ?? undefined,
      averagePurchasePrice: position.average_purchase_price ?? undefined,
      currencyName: position.currency?.name ?? undefined,
      exchangeName: symbol?.exchange?.name ?? undefined,
      figiCode: symbol?.figi_code ?? undefined,
    },
  };
}

function isLoginRedirectUri(
  response: AuthenticationLoginSnapTradeUser200Response,
): response is LoginRedirectURI {
  return (
    typeof response === 'object' &&
    response !== null &&
    'redirectURI' in response
  );
}

@Injectable()
export class SnapTradeClient {
  constructor(private readonly configService: ConfigService) {}

  async registerUser(providerUserId: string): Promise<{
    snapTradeUserId: string;
    snapTradeUserSecret: string;
  }> {
    const client = this.createClient();
    const response = await client.authentication.registerSnapTradeUser({
      userId: providerUserId,
    });

    return {
      snapTradeUserId: response.data.userId ?? providerUserId,
      snapTradeUserSecret: response.data.userSecret ?? '',
    };
  }

  async createConnectionPortal(
    providerUserId: string,
    providerUserSecret: string,
  ): Promise<SnapTradeConnectionPortalResult> {
    const client = this.createClient();
    const config = getSnapTradeApiConfig(this.configService);
    const response = await client.authentication.loginSnapTradeUser({
      userId: providerUserId,
      userSecret: providerUserSecret,
      customRedirect: config.redirectUri,
      connectionPortalVersion: 'v4',
      connectionType: 'read',
    });

    if (!isLoginRedirectUri(response.data) || !response.data.redirectURI) {
      throw new Error(
        'SnapTrade returned an unsupported connection portal response.',
      );
    }

    return {
      connectionPortalUrl: response.data.redirectURI,
      sessionId: response.data.sessionId ?? undefined,
    };
  }

  async importAccounts(
    providerUserId: string,
    providerUserSecret: string,
  ): Promise<SnapTradeImportAccountsResult> {
    const client = this.createClient();
    const [connectionsResponse, accountsResponse] = await Promise.all([
      client.connections.listBrokerageAuthorizations({
        userId: providerUserId,
        userSecret: providerUserSecret,
      }),
      client.accountInformation.listUserAccounts({
        userId: providerUserId,
        userSecret: providerUserSecret,
      }),
    ]);

    return {
      connections: connectionsResponse.data
        .filter((connection) => connection.id)
        .map(mapConnection),
      accounts: accountsResponse.data.map(mapAccount),
    };
  }

  async getAccountHoldings(
    providerUserId: string,
    providerUserSecret: string,
    account: SnapTradeBrokerageAccount,
  ): Promise<SnapTradeAccountHoldingsResult> {
    const client = this.createClient();
    const [balancesResponse, positionsResponse] = await Promise.all([
      client.accountInformation.getUserAccountBalance({
        userId: providerUserId,
        userSecret: providerUserSecret,
        accountId: account.externalAccountId,
      }),
      client.accountInformation.getUserAccountPositions({
        userId: providerUserId,
        userSecret: providerUserSecret,
        accountId: account.externalAccountId,
      }),
    ]);

    return {
      account,
      balances: balancesResponse.data.map((balance) =>
        mapBalance(account.externalAccountId, balance),
      ),
      positions: positionsResponse.data.map((position) =>
        mapPosition(account.externalAccountId, position),
      ),
    };
  }

  private createClient(): Snaptrade {
    const config = getSnapTradeApiConfig(this.configService);

    return new Snaptrade({
      clientId: config.clientId,
      consumerKey: config.consumerKey,
      basePath: config.baseUrl,
    });
  }
}
