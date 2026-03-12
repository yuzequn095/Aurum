import type { PortfolioPositionSnapshot, PortfolioSnapshot } from '../types';
import type {
  PortfolioCsvImportInput,
  PortfolioCsvRow,
  PortfolioSnapshotSourceAdapter,
} from './types';

function sanitizeOptionalNumber(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  return value;
}

function sanitizeOptionalString(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isValidCsvRow(row: PortfolioCsvRow): boolean {
  const symbol = sanitizeOptionalString(row.symbol);
  if (!symbol) {
    return false;
  }

  return Number.isFinite(row.marketValue);
}

function toPositionSnapshot(row: PortfolioCsvRow): PortfolioPositionSnapshot {
  return {
    symbol: row.symbol.trim(),
    name: sanitizeOptionalString(row.name),
    quantity: sanitizeOptionalNumber(row.quantity),
    marketValue: row.marketValue,
    portfolioWeight: sanitizeOptionalNumber(row.portfolioWeight),
    costBasis: sanitizeOptionalNumber(row.costBasis),
    pnlPercent: sanitizeOptionalNumber(row.pnlPercent),
    category: row.category,
    sourceAccountId: sanitizeOptionalString(row.sourceAccountId),
    notes: sanitizeOptionalString(row.notes),
  };
}

export class CsvPortfolioSnapshotAdapter
  implements PortfolioSnapshotSourceAdapter<PortfolioCsvImportInput>
{
  readonly sourceType = 'csv_import' as const;

  toSnapshot(input: PortfolioCsvImportInput): PortfolioSnapshot {
    const positions = input.rows.filter(isValidCsvRow).map(toPositionSnapshot);
    const positionsValue = positions.reduce((sum, position) => sum + position.marketValue, 0);
    const cashValue = sanitizeOptionalNumber(input.cashValue);

    return {
      metadata: {
        portfolioName: sanitizeOptionalString(input.portfolioName),
        sourceType: this.sourceType,
        sourceLabel: sanitizeOptionalString(input.sourceLabel),
        snapshotDate: input.snapshotDate,
        valuationCurrency: sanitizeOptionalString(input.valuationCurrency),
      },
      totalValue: positionsValue + (cashValue ?? 0),
      cashValue,
      positions,
    };
  }
}
