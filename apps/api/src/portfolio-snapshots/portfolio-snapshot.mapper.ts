import type {
  PortfolioAssetCategory,
  PortfolioDataSourceType,
  PortfolioSnapshot,
} from '@aurum/core';
import {
  type PortfolioAssetCategoryType,
  type PortfolioSnapshotSourceType,
  Prisma,
} from '@prisma/client';
import { formatDateOnly } from '../common/date-only';

export type PortfolioSnapshotRecordWithPositions =
  Prisma.PortfolioSnapshotRecordGetPayload<{
    include: { positions: true };
  }>;

function decimalToNumber(
  value: Prisma.Decimal | number | null | undefined,
): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return Number(value);
}

function mapSourceType(
  sourceType: PortfolioSnapshotSourceType | null,
): PortfolioDataSourceType | undefined {
  switch (sourceType) {
    case 'MANUAL':
      return 'manual';
    case 'CSV_IMPORT':
      return 'csv_import';
    case 'BROKER_SYNC':
      return 'broker_sync';
    case 'OTHER':
      return 'other';
    default:
      return undefined;
  }
}

function mapCategory(
  category: PortfolioAssetCategoryType | null,
): PortfolioAssetCategory | undefined {
  switch (category) {
    case 'CASH':
      return 'cash';
    case 'EQUITY':
      return 'equity';
    case 'ETF':
      return 'etf';
    case 'CRYPTO':
      return 'crypto';
    case 'FUND':
      return 'fund';
    case 'OTHER':
      return 'other';
    default:
      return undefined;
  }
}

export function mapPortfolioSnapshotRecordToSnapshot(
  record: PortfolioSnapshotRecordWithPositions,
): PortfolioSnapshot {
  return {
    id: record.id,
    metadata: {
      portfolioName: record.portfolioName ?? undefined,
      sourceType: mapSourceType(record.sourceType),
      sourceLabel: record.sourceLabel ?? undefined,
      snapshotDate: formatDateOnly(record.snapshotDate),
      valuationCurrency: record.valuationCurrency ?? undefined,
    },
    totalValue: Number(record.totalValue),
    cashValue: decimalToNumber(record.cashValue),
    positions: record.positions.map((position) => ({
      symbol: position.symbol,
      name: position.name ?? undefined,
      quantity: decimalToNumber(position.quantity),
      marketValue: Number(position.marketValue),
      portfolioWeight: decimalToNumber(position.portfolioWeight),
      costBasis: decimalToNumber(position.costBasis),
      pnlPercent: decimalToNumber(position.pnlPercent),
      category: mapCategory(position.category),
      sourceAccountId: position.sourceAccountId ?? undefined,
      notes: position.notes ?? undefined,
    })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
