import type {
  ConnectedSource,
  ConnectedSourceAccount,
  ConnectedSourceAdapter,
  ConnectedSyncRun,
  NormalizedPortfolioSnapshotInput,
} from './connected-finance';
import type { PortfolioSnapshot } from './types';

export const bankConnectionProviderKeys = ['PLAID'] as const;

export type BankConnectionProviderKey =
  (typeof bankConnectionProviderKeys)[number];

export const bankBalanceSelectionStrategies = [
  'AVAILABLE_THEN_CURRENT',
] as const;

export type BankBalanceSelectionStrategy =
  (typeof bankBalanceSelectionStrategies)[number];

export interface BankAccountNormalizedInput {
  externalAccountId: string;
  displayName: string;
  officialName?: string;
  accountType: string;
  accountSubType?: string;
  currency?: string;
  maskLast4?: string;
  institutionName?: string;
  metadata?: Record<string, unknown>;
}

export interface BankBalanceNormalizedInput {
  externalAccountId: string;
  currentBalance?: number;
  availableBalance?: number;
  currency?: string;
  asOf?: string;
  metadata?: Record<string, unknown>;
}

export interface ConnectedBankSourceAdapterInput {
  source: ConnectedSource;
  accounts: ConnectedSourceAccount[];
  accountInputs: BankAccountNormalizedInput[];
  balances: BankBalanceNormalizedInput[];
  snapshotDate: string;
}

export interface BankSyncMaterializationResult {
  snapshot: PortfolioSnapshot;
  syncRun: ConnectedSyncRun;
  syncedAccountCount: number;
  materializedPositionCount: number;
  snapshotDate: string;
  balanceSelectionStrategy: BankBalanceSelectionStrategy;
}

export interface BankLinkTokenResult {
  providerKey: BankConnectionProviderKey;
  linkToken: string;
  expiration?: string;
}

export interface BankSourceConnectionResult {
  providerKey: BankConnectionProviderKey;
  source: ConnectedSource;
  accounts: ConnectedSourceAccount[];
}

export interface ConnectedBankSourceAdapter
  extends ConnectedSourceAdapter<ConnectedBankSourceAdapterInput> {
  readonly kind: 'BANK';
  readonly providerKey: BankConnectionProviderKey;
  readonly balanceSelectionStrategy: BankBalanceSelectionStrategy;
  normalize(input: ConnectedBankSourceAdapterInput): NormalizedPortfolioSnapshotInput;
}
