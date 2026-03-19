import type { FinancialHealthScoreInput } from '../../ai/score';
import type { PortfolioSnapshot } from '../types';

export function portfolioSnapshotToFinancialHealthScoreInput(
  snapshot: PortfolioSnapshot,
): FinancialHealthScoreInput {
  return {
    snapshotDate: snapshot.metadata.snapshotDate,
    totalAssets: snapshot.totalValue,
    cashValue: snapshot.cashValue,
    positions: snapshot.positions.map((position) => ({
      symbol: position.symbol ?? position.assetKey ?? position.name ?? 'UNKNOWN',
      marketValue: position.marketValue,
      portfolioWeight: position.portfolioWeight,
      category: position.category,
    })),
  };
}
