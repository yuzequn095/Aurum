import type {
  ConnectedSource,
  ConnectedSourceAccount,
  ConnectedSourceAdapter,
  ConnectedSyncRun,
  NormalizedPortfolioSnapshotInput,
} from './connected-finance';
import type { PortfolioSnapshot } from './types';

export const cryptoConnectionProviderKeys = ['COINBASE'] as const;

export type CryptoConnectionProviderKey = (typeof cryptoConnectionProviderKeys)[number];

export interface CryptoAccountNormalizedInput {
  externalAccountId: string;
  displayName: string;
  officialName?: string;
  accountType: string;
  currency?: string;
  assetCode?: string;
  assetName?: string;
  assetType?: 'crypto' | 'fiat';
  institutionName?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface CryptoBalanceNormalizedInput {
  externalAccountId: string;
  assetId?: string;
  symbol?: string;
  assetName?: string;
  quantity?: number;
  unitPrice?: number;
  marketValue?: number;
  valuationCurrency?: string;
  accountType?: string;
  metadata?: Record<string, unknown>;
}

export interface ConnectedCryptoSourceAdapterInput {
  source: ConnectedSource;
  accounts: ConnectedSourceAccount[];
  accountInputs: CryptoAccountNormalizedInput[];
  balances: CryptoBalanceNormalizedInput[];
  snapshotDate: string;
}

export interface CryptoSyncMaterializationResult {
  snapshot: PortfolioSnapshot;
  syncRun: ConnectedSyncRun;
  syncedAccountCount: number;
  materializedPositionCount: number;
  snapshotDate: string;
}

export interface CryptoSourceConnectionResult {
  providerKey: CryptoConnectionProviderKey;
  source: ConnectedSource;
  accounts: ConnectedSourceAccount[];
}

export interface ConnectedCryptoSourceAdapter extends ConnectedSourceAdapter<ConnectedCryptoSourceAdapterInput> {
  readonly kind: 'CRYPTO';
  readonly providerKey: CryptoConnectionProviderKey;
  normalize(input: ConnectedCryptoSourceAdapterInput): NormalizedPortfolioSnapshotInput;
}
