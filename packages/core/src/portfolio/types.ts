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

export type PortfolioHistoryScope = 'consolidated' | 'source' | 'account' | 'asset_category';

export interface PortfolioHistoryPoint {
  snapshotId: string;
  snapshotDate: string;
  createdAt: string;
  /** Zero-based position when points are read from oldest to newest. */
  chronologicalIndex: number;
  totalValue: number;
  cashValue?: number;
  sourceId?: string;
  sourceLabel?: string;
  sourceAccountId?: string;
  assetCategory?: PortfolioAssetCategory;
  /** Value represented by the selected history scope. */
  value: number;
  deltaFromPrevious?: number;
  percentDeltaFromPrevious?: number;
}

export interface PortfolioHistorySummary {
  scope: PortfolioHistoryScope;
  pointCount: number;
  latestSnapshotId?: string;
  latestSnapshotDate?: string;
  oldestSnapshotDate?: string;
  latestValue?: number;
  previousValue?: number;
  deltaFromPrevious?: number;
  percentDeltaFromPrevious?: number;
}

export interface PortfolioHistorySeries {
  scope: PortfolioHistoryScope;
  sourceId?: string;
  sourceLabel?: string;
  sourceAccountId?: string;
  sourceAccountLabel?: string;
  assetCategory?: PortfolioAssetCategory;
  valuationCurrency?: string;
  /** Points are returned newest first. Use chronologicalIndex for chart order. */
  points: PortfolioHistoryPoint[];
  summary: PortfolioHistorySummary;
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

export type PortfolioChangeDriverDimension =
  | 'total'
  | 'cash'
  | 'institution'
  | 'account'
  | 'asset_category'
  | 'holding'
  | 'employer_equity'
  | 'data_health';

export type PortfolioChangeCausalityStatus =
  | 'deterministic_state_delta'
  | 'insufficient_data_for_causality';

export type PortfolioChangeCategory =
  | 'known_state_change'
  | 'manual_valuation_change'
  | 'possible_market_or_quantity_change';

export interface PortfolioChangeDriver {
  id: string;
  dimension: PortfolioChangeDriverDimension;
  label: string;
  description: string;
  category: PortfolioChangeCategory;
  previousValue?: number;
  currentValue?: number;
  delta: number;
  percentDelta?: number;
  changeType?: PortfolioSnapshotDeltaChangeType;
  causalityStatus: PortfolioChangeCausalityStatus;
  sourceId?: string;
  sourceLabel?: string;
  sourceAccountId?: string;
  sourceAccountName?: string;
  assetCategory?: PortfolioAssetCategory;
  assetKey?: string;
  symbol?: string;
}

export interface PortfolioChangeExplanationNote {
  code:
    | 'snapshot_state_only'
    | 'not_realized_pnl'
    | 'no_baseline'
    | 'stale_data'
    | 'incomplete_lineage';
  message: string;
}

export type PortfolioChangeCausalityNote = PortfolioChangeExplanationNote;

export interface PortfolioChangeExplanation {
  version: 'portfolio-change-explanation-v1';
  snapshotId: string;
  baselineSnapshotId?: string;
  baselineStatus: 'available' | 'no_baseline';
  stateDeltaStatus: 'deterministic_state_delta';
  causalityStatus: PortfolioChangeCausalityStatus;
  summary: string;
  totalValueDelta: number;
  cashValueDelta: number;
  drivers: PortfolioChangeDriver[];
  dataLimitations: string[];
  notes: PortfolioChangeExplanationNote[];
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
