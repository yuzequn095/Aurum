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

export type PortfolioDiagnosticsFlagSeverity = 'info' | 'warning';

export interface PortfolioDiagnosticsAllocationItem {
  key: string;
  label: string;
  value: number;
  weight: number;
}

export interface PortfolioDiagnosticsTopHolding {
  assetKey: string;
  symbol?: string;
  name?: string;
  marketValue: number;
  weight: number;
  sourceAccountId?: string;
  sourceAccountName?: string;
}

export interface PortfolioDiagnosticsFlag {
  code:
    | 'high_cash'
    | 'high_crypto'
    | 'high_single_name_concentration'
    | 'high_institution_concentration'
    | 'high_employer_stock_concentration'
    | 'stale_data'
    | 'missing_valuation'
    | 'no_baseline_snapshot';
  label: string;
  severity: PortfolioDiagnosticsFlagSeverity;
  detail?: string;
}

export interface PortfolioDiagnostics {
  snapshotId: string;
  snapshotDate: string;
  totalValue: number;
  allocationByAssetCategory: PortfolioDiagnosticsAllocationItem[];
  allocationByInstitution: PortfolioDiagnosticsAllocationItem[];
  allocationByAccount: PortfolioDiagnosticsAllocationItem[];
  topHoldings: PortfolioDiagnosticsTopHolding[];
  concentration: {
    topHoldingWeight: number;
    topInstitutionWeight: number;
    employerStockWeight: number;
  };
  dataHealth: {
    status: 'fresh' | 'stale' | 'incomplete';
    staleSourceIds: string[];
    missingSourceAccountPositionCount: number;
    hasBaselineSnapshot: boolean;
  };
  postureSummary: {
    cashRatio: number;
    cryptoRatio: number;
    topHoldingWeight: number;
    topInstitutionWeight: number;
    dataHealthStatus: 'fresh' | 'stale' | 'incomplete';
    flags: PortfolioDiagnosticsFlag[];
  };
  flags: PortfolioDiagnosticsFlag[];
}
