import type {
  ConnectedSource,
  ConnectedSourceAccount,
  ConnectedSourceAdapter,
  ConnectedSyncRun,
  NormalizedPortfolioSnapshotInput,
} from './connected-finance';
import type { PortfolioSnapshot } from './types';

export const brokerageConnectionProviderKeys = ['SNAPTRADE'] as const;

export type BrokerageConnectionProviderKey =
  (typeof brokerageConnectionProviderKeys)[number];

export interface BrokerageAccountNormalizedInput {
  externalAccountId: string;
  providerConnectionId: string;
  displayName: string;
  officialName?: string;
  accountType: string;
  accountSubType?: string;
  currency?: string;
  institutionName?: string;
  maskLast4?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface BrokeragePositionNormalizedInput {
  externalAccountId: string;
  providerInstrumentId?: string;
  symbol?: string;
  rawSymbol?: string;
  description?: string;
  quantity?: number;
  unitPrice?: number;
  marketValue?: number;
  currency?: string;
  securityType?: string;
  exchange?: string;
  cashEquivalent?: boolean;
  metadata?: Record<string, unknown>;
}

export interface BrokerageBalanceNormalizedInput {
  externalAccountId: string;
  currency?: string;
  cash?: number;
  buyingPower?: number;
  metadata?: Record<string, unknown>;
}

export interface ConnectedBrokerageSourceAdapterInput {
  source: ConnectedSource;
  accounts: ConnectedSourceAccount[];
  accountInputs: BrokerageAccountNormalizedInput[];
  positions: BrokeragePositionNormalizedInput[];
  balances: BrokerageBalanceNormalizedInput[];
  snapshotDate: string;
}

export interface BrokerageSyncMaterializationResult {
  snapshot: PortfolioSnapshot;
  syncRun: ConnectedSyncRun;
  syncedAccountCount: number;
  materializedPositionCount: number;
  snapshotDate: string;
}

export interface BrokerageConnectionPortalResult {
  providerKey: BrokerageConnectionProviderKey;
  providerUserId: string;
  connectionPortalUrl: string;
  sessionId?: string;
}

export interface BrokerageSourceImportSummary {
  source: ConnectedSource;
  accounts: ConnectedSourceAccount[];
}

export interface BrokerageSourceImportResult {
  providerKey: BrokerageConnectionProviderKey;
  providerUserId: string;
  sources: BrokerageSourceImportSummary[];
}

export interface ConnectedBrokerageSourceAdapter
  extends ConnectedSourceAdapter<ConnectedBrokerageSourceAdapterInput> {
  readonly kind: 'BROKERAGE';
  readonly providerKey: BrokerageConnectionProviderKey;
  normalize(
    input: ConnectedBrokerageSourceAdapterInput,
  ): NormalizedPortfolioSnapshotInput;
}
