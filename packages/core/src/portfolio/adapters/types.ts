import type {
  PortfolioAssetCategory,
  PortfolioDataSourceType,
  PortfolioSnapshot,
} from '../types';

export interface PortfolioSnapshotSourceAdapter<TInput> {
  sourceType: PortfolioDataSourceType;
  toSnapshot(input: TInput): PortfolioSnapshot;
}

export interface PortfolioCsvRow {
  symbol: string;
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

export interface PortfolioCsvImportInput {
  portfolioName?: string;
  sourceLabel?: string;
  snapshotDate: string;
  valuationCurrency?: string;
  cashValue?: number;
  rows: PortfolioCsvRow[];
}
