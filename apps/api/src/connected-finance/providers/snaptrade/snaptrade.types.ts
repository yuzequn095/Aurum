import type {
  BrokerageAccountNormalizedInput,
  BrokerageBalanceNormalizedInput,
  BrokeragePositionNormalizedInput,
} from '@aurum/core';

export interface SnapTradeProviderUserSecretPayload extends Record<
  string,
  unknown
> {
  snapTradeUserId: string;
  snapTradeUserSecret: string;
}

export interface SnapTradeConnectionPortalResult {
  connectionPortalUrl: string;
  sessionId?: string;
}

export interface SnapTradeConnectionSummary {
  connectionId: string;
  displayName: string;
  institutionName?: string;
  disabled: boolean;
  brokerageSlug?: string;
  metadata?: Record<string, unknown>;
}

export interface SnapTradeBrokerageAccount extends BrokerageAccountNormalizedInput {
  providerConnectionId: string;
}

export type SnapTradeBrokeragePosition = BrokeragePositionNormalizedInput;

export type SnapTradeBrokerageBalance = BrokerageBalanceNormalizedInput;

export interface SnapTradeImportAccountsResult {
  connections: SnapTradeConnectionSummary[];
  accounts: SnapTradeBrokerageAccount[];
}

export interface SnapTradeAccountHoldingsResult {
  account: SnapTradeBrokerageAccount;
  balances: SnapTradeBrokerageBalance[];
  positions: SnapTradeBrokeragePosition[];
}
