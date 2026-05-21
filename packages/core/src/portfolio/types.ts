import type { PortfolioSnapshotIngestionMode } from './connected-finance';
import type {
  ConnectedSource,
  ConnectedSourceAccount,
  ConnectedSyncRun,
} from './connected-finance';

export type PortfolioAssetCategory = 'cash' | 'equity' | 'etf' | 'crypto' | 'fund' | 'other';

export type PortfolioDataSourceType = 'manual' | 'csv_import' | 'broker_sync' | 'other';

export interface PortfolioPositionSnapshot {
  assetKey?: string;
  symbol?: string;
  name?: string;
  quantity?: number;
  marketValue: number;
  portfolioWeight?: number;
  costBasis?: number;
  pnlPercent?: number;
  category?: PortfolioAssetCategory;
  sourceAccountId?: string;
  notes?: string;
}

export interface PortfolioSnapshotMetadata {
  portfolioName?: string;
  sourceType?: PortfolioDataSourceType;
  sourceLabel?: string;
  snapshotDate: string;
  valuationCurrency?: string;
  ingestionMode?: PortfolioSnapshotIngestionMode;
  sourceId?: string;
  sourceSyncRunId?: string;
  normalizationVersion?: string;
  sourceFingerprint?: string;
}

export interface PortfolioSnapshot {
  id?: string;
  userId?: string;
  metadata: PortfolioSnapshotMetadata;
  totalValue: number;
  cashValue?: number;
  positions: PortfolioPositionSnapshot[];
  createdAt?: string;
  updatedAt?: string;
}

export interface PortfolioPositionWithAccountContext extends PortfolioPositionSnapshot {
  sourceAccount?: ConnectedSourceAccount;
  sourceName?: string;
}

export interface PortfolioSnapshotLineage {
  snapshot: PortfolioSnapshot;
  source?: ConnectedSource;
  sourceSyncRun?: ConnectedSyncRun;
  accountsById: Record<string, ConnectedSourceAccount>;
  positionsWithAccountContext: PortfolioPositionWithAccountContext[];
}

export type PortfolioSnapshotDeltaChangeType =
  | 'added'
  | 'removed'
  | 'increased'
  | 'decreased'
  | 'unchanged';

export interface PortfolioSnapshotPositionDelta {
  assetKey: string;
  symbol?: string;
  name?: string;
  previousMarketValue?: number;
  currentMarketValue?: number;
  marketValueDelta: number;
  previousQuantity?: number;
  currentQuantity?: number;
  quantityDelta?: number;
  sourceAccountId?: string;
  sourceAccountName?: string;
  changeType: PortfolioSnapshotDeltaChangeType;
}

export interface PortfolioSnapshotAccountDelta {
  sourceAccountId?: string;
  sourceAccountName: string;
  previousValue: number;
  currentValue: number;
  delta: number;
}

export interface PortfolioSnapshotDelta {
  baseSnapshotId: string;
  compareSnapshotId?: string;
  totalValueDelta: number;
  cashValueDelta: number;
  positionDeltas: PortfolioSnapshotPositionDelta[];
  accountDeltas: PortfolioSnapshotAccountDelta[];
  baselineStatus: 'available' | 'no_baseline';
}
