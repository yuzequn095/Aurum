import type {
  PortfolioAssetCategory,
  PortfolioDataSourceType,
  PortfolioSnapshot,
} from '@aurum/core';
import {
  PortfolioAssetCategoryType,
  PortfolioSnapshotSourceType,
} from '@prisma/client';
import { ConflictException, Injectable } from '@nestjs/common';
import { parseDateOnly } from '../common/date-only';
import { PrismaService } from '../prisma/prisma.service';
import { mapPortfolioSnapshotRecordToSnapshot } from './portfolio-snapshot.mapper';

function toPrismaSourceType(
  sourceType: PortfolioDataSourceType | undefined,
): PortfolioSnapshotSourceType | undefined {
  switch (sourceType) {
    case 'manual':
      return PortfolioSnapshotSourceType.MANUAL;
    case 'csv_import':
      return PortfolioSnapshotSourceType.CSV_IMPORT;
    case 'broker_sync':
      return PortfolioSnapshotSourceType.BROKER_SYNC;
    case 'other':
      return PortfolioSnapshotSourceType.OTHER;
    default:
      return undefined;
  }
}

function toPrismaCategory(
  category: PortfolioAssetCategory | undefined,
): PortfolioAssetCategoryType | undefined {
  switch (category) {
    case 'cash':
      return PortfolioAssetCategoryType.CASH;
    case 'equity':
      return PortfolioAssetCategoryType.EQUITY;
    case 'etf':
      return PortfolioAssetCategoryType.ETF;
    case 'crypto':
      return PortfolioAssetCategoryType.CRYPTO;
    case 'fund':
      return PortfolioAssetCategoryType.FUND;
    case 'other':
      return PortfolioAssetCategoryType.OTHER;
    default:
      return undefined;
  }
}

@Injectable()
export class PortfolioSnapshotsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSnapshot(snapshot: PortfolioSnapshot): Promise<PortfolioSnapshot> {
    const created = await this.prisma.portfolioSnapshotRecord.create({
      data: {
        portfolioName: snapshot.metadata.portfolioName,
        sourceType: toPrismaSourceType(snapshot.metadata.sourceType),
        sourceLabel: snapshot.metadata.sourceLabel,
        snapshotDate: parseDateOnly(snapshot.metadata.snapshotDate),
        valuationCurrency: snapshot.metadata.valuationCurrency,
        totalValue: snapshot.totalValue,
        cashValue: snapshot.cashValue,
        positions: {
          create: snapshot.positions.map((position) => ({
            symbol: position.symbol,
            name: position.name,
            quantity: position.quantity,
            marketValue: position.marketValue,
            portfolioWeight: position.portfolioWeight,
            costBasis: position.costBasis,
            pnlPercent: position.pnlPercent,
            category: toPrismaCategory(position.category),
            sourceAccountId: position.sourceAccountId,
            notes: position.notes,
          })),
        },
      },
      include: {
        positions: {
          orderBy: [{ marketValue: 'desc' }, { symbol: 'asc' }],
        },
      },
    });

    return mapPortfolioSnapshotRecordToSnapshot(created);
  }

  async getSnapshotById(id: string): Promise<PortfolioSnapshot | null> {
    const found = await this.prisma.portfolioSnapshotRecord.findUnique({
      where: { id },
      include: {
        positions: {
          orderBy: [{ marketValue: 'desc' }, { symbol: 'asc' }],
        },
      },
    });

    if (!found) {
      return null;
    }

    return mapPortfolioSnapshotRecordToSnapshot(found);
  }

  async listSnapshots(): Promise<PortfolioSnapshot[]> {
    const records = await this.prisma.portfolioSnapshotRecord.findMany({
      orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        positions: {
          orderBy: [{ marketValue: 'desc' }, { symbol: 'asc' }],
        },
      },
    });

    return records.map(mapPortfolioSnapshotRecordToSnapshot);
  }

  async deleteSnapshot(id: string): Promise<boolean> {
    const existing = await this.prisma.portfolioSnapshotRecord.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return false;
    }

    const linkedReportCount = await this.prisma.aIReportRecord.count({
      where: { sourceSnapshotId: id },
    });
    if (linkedReportCount > 0) {
      throw new ConflictException(
        `Portfolio snapshot cannot be deleted because ${linkedReportCount} linked report(s) exist.`,
      );
    }

    await this.prisma.portfolioSnapshotRecord.delete({
      where: { id },
    });

    return true;
  }
}
