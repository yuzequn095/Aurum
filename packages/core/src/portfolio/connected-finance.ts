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

export interface ConnectedSource {
  id: string;
  userId: string;
  kind: ConnectedSourceKind;
  providerKey?: string;
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
  accountType: string;
  currency: string;
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
