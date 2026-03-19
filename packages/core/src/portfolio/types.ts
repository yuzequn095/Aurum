import type { PortfolioSnapshotIngestionMode } from './connected-finance';

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
