import type { PortfolioAssetCategory } from './types';

export const connectedSourceKinds = ['MANUAL_STATIC', 'BANK', 'BROKERAGE', 'CRYPTO'] as const;

export type ConnectedSourceKind = (typeof connectedSourceKinds)[number];

export const connectedSourceStatuses = [
  'ACTIVE',
  'NEEDS_ATTENTION',
  'DISCONNECTED',
  'ARCHIVED',
] as const;

export type ConnectedSourceStatus = (typeof connectedSourceStatuses)[number];

export const connectedSyncTriggerTypes = ['MANUAL', 'SCHEDULED', 'WEBHOOK', 'SYSTEM'] as const;

export type ConnectedSyncTriggerType = (typeof connectedSyncTriggerTypes)[number];

export const connectedSyncStatuses = [
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'PARTIAL_SUCCESS',
] as const;

export type ConnectedSyncStatus = (typeof connectedSyncStatuses)[number];

export const portfolioSnapshotIngestionModes = [
  'MANUAL_STATIC',
  'CSV_IMPORT',
  'CONNECTED_SYNC',
] as const;

export type PortfolioSnapshotIngestionMode = (typeof portfolioSnapshotIngestionModes)[number];

export const connectedFinanceProviderKeys = [
  'PLAID',
  'COINBASE',
  'SNAPTRADE',
] as const;

export type ConnectedFinanceProviderKey =
  (typeof connectedFinanceProviderKeys)[number];

export const connectedFinanceErrorCodes = [
  'PROVIDER_NOT_CONFIGURED',
] as const;

export type ConnectedFinanceErrorCode =
  (typeof connectedFinanceErrorCodes)[number];

export interface ConnectedFinanceProviderErrorDetails {
  statusCode?: number;
  code: ConnectedFinanceErrorCode;
  provider: Extract<ConnectedFinanceProviderKey, 'PLAID' | 'COINBASE'>;
  message: string;
  userMessage?: string;
  missingConfig?: string[];
}

export function getProviderNotConfiguredGuidance(
  provider: Extract<ConnectedFinanceProviderKey, 'PLAID' | 'COINBASE'>,
): { title: string; body: string } {
  const providerLabel = provider === 'PLAID' ? 'Plaid' : 'Coinbase';

  return {
    title: `${providerLabel} is not configured yet`,
    body:
      'This environment does not have the required backend credentials configured for this provider. For now, use Manual Create in Manual Static Accounts to add assets or accounts manually.',
  };
}

export function parseProviderNotConfiguredDetails(
  details: unknown,
): ({
  provider: Extract<ConnectedFinanceProviderKey, 'PLAID' | 'COINBASE'>;
  title: string;
  body: string;
} | null) {
  if (!details || typeof details !== 'object') {
    return null;
  }

  const candidate = details as Partial<ConnectedFinanceProviderErrorDetails>;
  if (
    candidate.code !== 'PROVIDER_NOT_CONFIGURED' ||
    (candidate.provider !== 'PLAID' && candidate.provider !== 'COINBASE')
  ) {
    return null;
  }

  const guidance = getProviderNotConfiguredGuidance(candidate.provider);

  return {
    provider: candidate.provider,
    title: guidance.title,
    body: candidate.userMessage ?? guidance.body,
  };
}

export interface ConnectedSource {
  id: string;
  userId: string;
  kind: ConnectedSourceKind;
  providerKey?: string;
  providerConnectionId?: string;
  displayName: string;
  status: ConnectedSourceStatus;
  institutionName?: string;
  baseCurrency: string;
  metadata?: Record<string, unknown>;
  lastSuccessfulSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectedSourceAccount {
  id: string;
  sourceId: string;
  externalAccountId?: string;
  displayName: string;
  officialName?: string;
  accountType: string;
  currency: string;
  assetType?: PortfolioAssetCategory;
  assetSubType?: string;
  institutionOrIssuer?: string;
  maskLast4?: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectedSyncRun {
  id: string;
  userId: string;
  sourceId: string;
  triggerType: ConnectedSyncTriggerType;
  status: ConnectedSyncStatus;
  startedAt?: string;
  finishedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  normalizationVersion?: string;
  rawPayloadRef?: string;
  producedSnapshotId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface NormalizedConnectedSourceAccountInput {
  externalAccountId?: string;
  displayName: string;
  accountType: string;
  currency?: string;
  maskLast4?: string;
  isActive?: boolean;
  metadata?: Record<string, unknown>;
}

export interface NormalizedPortfolioPositionInput {
  assetKey: string;
  symbol?: string;
  name?: string;
  quantity?: number;
  marketValue: number;
  portfolioWeight?: number;
  costBasis?: number;
  pnlPercent?: number;
  category?: string;
  sourceAccountRef?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

export interface NormalizedPortfolioSnapshotInput {
  portfolioName?: string;
  sourceLabel?: string;
  snapshotDate: string;
  valuationCurrency?: string;
  totalValue: number;
  cashValue?: number;
  ingestionMode: PortfolioSnapshotIngestionMode;
  normalizationVersion: string;
  sourceFingerprint?: string;
  accounts?: NormalizedConnectedSourceAccountInput[];
  positions: NormalizedPortfolioPositionInput[];
  metadata?: Record<string, unknown>;
}

export interface ConnectedSourceAdapter<TInput = unknown> {
  readonly kind: ConnectedSourceKind;
  readonly providerKey?: string;
  readonly normalizationVersion: string;
  normalize(input: TInput): NormalizedPortfolioSnapshotInput;
}
