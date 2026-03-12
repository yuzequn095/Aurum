import type { PortfolioReportInput } from '../../ai/tasks';
import type { PortfolioSnapshot } from '../types';

const DEFAULT_PORTFOLIO_NAME = 'Portfolio Snapshot';

export function portfolioSnapshotToReportInput(
  snapshot: PortfolioSnapshot,
): PortfolioReportInput {
  return {
    portfolioName: snapshot.metadata.portfolioName ?? DEFAULT_PORTFOLIO_NAME,
    snapshotDate: snapshot.metadata.snapshotDate,
    totalValue: snapshot.totalValue,
    cashValue: snapshot.cashValue,
    positions: snapshot.positions.map((position) => ({
      symbol: position.symbol,
      name: position.name,
      quantity: position.quantity,
      marketValue: position.marketValue,
      portfolioWeight: position.portfolioWeight,
      costBasis: position.costBasis,
      pnlPercent: position.pnlPercent,
      notes: position.notes,
    })),
  };
}
