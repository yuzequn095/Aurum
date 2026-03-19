import type {
  PortfolioAssetCategory,
  PortfolioDataSourceType,
  PortfolioSnapshot,
} from '@aurum/core';
import {
  PortfolioAssetCategoryType,
  PortfolioSnapshotIngestionMode,
  PortfolioSnapshotSourceType,
} from '@prisma/client';
import { ConflictException, Injectable } from '@nestjs/common';
import { parseDateOnly } from '../common/date-only';
import { PrismaService } from '../prisma/prisma.service';
import { LEGACY_SNAPSHOT_OWNER_USER_ID } from './legacy-snapshot-owner';
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

function toPrismaIngestionMode(
  ingestionMode: PortfolioSnapshot['metadata']['ingestionMode'],
  sourceType: PortfolioDataSourceType | undefined,
): PortfolioSnapshotIngestionMode | undefined {
  switch (ingestionMode) {
    case 'MANUAL_STATIC':
      return PortfolioSnapshotIngestionMode.MANUAL_STATIC;
    case 'CSV_IMPORT':
      return PortfolioSnapshotIngestionMode.CSV_IMPORT;
    case 'CONNECTED_SYNC':
      return PortfolioSnapshotIngestionMode.CONNECTED_SYNC;
    default:
      break;
  }

  switch (sourceType) {
    case 'manual':
      return PortfolioSnapshotIngestionMode.MANUAL_STATIC;
    case 'csv_import':
      return PortfolioSnapshotIngestionMode.CSV_IMPORT;
    case 'broker_sync':
      return PortfolioSnapshotIngestionMode.CONNECTED_SYNC;
    default:
      return undefined;
  }
}

function sanitizeOptionalString(value: string | undefined): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function deriveAssetKey(
  position: PortfolioSnapshot['positions'][number],
  index: number,
): string {
  const explicitAssetKey = sanitizeOptionalString(position.assetKey);
  if (explicitAssetKey) {
    return explicitAssetKey;
  }

  const symbol = sanitizeOptionalString(position.symbol);
  if (symbol) {
    return `symbol:${symbol.toUpperCase()}`;
  }

  const name = sanitizeOptionalString(position.name);
  if (name) {
    return `name:${name.toLowerCase().replace(/\s+/g, '_')}`;
  }

  return `position:${index + 1}`;
}

@Injectable()
export class PortfolioSnapshotsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSnapshot(
    snapshot: PortfolioSnapshot,
    userId?: string,
  ): Promise<PortfolioSnapshot> {
    const scopedUserId =
      userId ?? snapshot.userId ?? LEGACY_SNAPSHOT_OWNER_USER_ID;

    const created = await this.prisma.portfolioSnapshotRecord.create({
      data: {
        userId: scopedUserId,
        sourceId: sanitizeOptionalString(snapshot.metadata.sourceId),
        sourceSyncRunId: sanitizeOptionalString(
          snapshot.metadata.sourceSyncRunId,
        ),
        ingestionMode: toPrismaIngestionMode(
          snapshot.metadata.ingestionMode,
          snapshot.metadata.sourceType,
        ),
        normalizationVersion: sanitizeOptionalString(
          snapshot.metadata.normalizationVersion,
        ),
        sourceFingerprint: sanitizeOptionalString(
          snapshot.metadata.sourceFingerprint,
        ),
        portfolioName: snapshot.metadata.portfolioName,
        sourceType: toPrismaSourceType(snapshot.metadata.sourceType),
        sourceLabel: snapshot.metadata.sourceLabel,
        snapshotDate: parseDateOnly(snapshot.metadata.snapshotDate),
        valuationCurrency: snapshot.metadata.valuationCurrency,
        totalValue: snapshot.totalValue,
        cashValue: snapshot.cashValue,
        positions: {
          create: snapshot.positions.map((position, index) => ({
            assetKey: deriveAssetKey(position, index),
            symbol: sanitizeOptionalString(position.symbol),
            name: position.name,
            quantity: position.quantity,
            marketValue: position.marketValue,
            portfolioWeight: position.portfolioWeight,
            costBasis: position.costBasis,
            pnlPercent: position.pnlPercent,
            category: toPrismaCategory(position.category),
            sourceAccountId: sanitizeOptionalString(position.sourceAccountId),
            notes: position.notes,
          })),
        },
      },
      include: {
        positions: {
          orderBy: [{ marketValue: 'desc' }, { assetKey: 'asc' }],
        },
      },
    });

    return mapPortfolioSnapshotRecordToSnapshot(created);
  }

  async getSnapshotById(
    id: string,
    userId?: string,
  ): Promise<PortfolioSnapshot | null> {
    const found = await this.prisma.portfolioSnapshotRecord.findFirst({
      where: {
        id,
        userId: userId ?? LEGACY_SNAPSHOT_OWNER_USER_ID,
      },
      include: {
        positions: {
          orderBy: [{ marketValue: 'desc' }, { assetKey: 'asc' }],
        },
      },
    });

    if (!found) {
      return null;
    }

    return mapPortfolioSnapshotRecordToSnapshot(found);
  }

  async listSnapshots(userId?: string): Promise<PortfolioSnapshot[]> {
    const records = await this.prisma.portfolioSnapshotRecord.findMany({
      where: {
        userId: userId ?? LEGACY_SNAPSHOT_OWNER_USER_ID,
      },
      orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        positions: {
          orderBy: [{ marketValue: 'desc' }, { assetKey: 'asc' }],
        },
      },
    });

    return records.map(mapPortfolioSnapshotRecordToSnapshot);
  }

  async deleteSnapshot(id: string, userId?: string): Promise<boolean> {
    const scopedUserId = userId ?? LEGACY_SNAPSHOT_OWNER_USER_ID;
    const existing = await this.prisma.portfolioSnapshotRecord.findFirst({
      where: { id, userId: scopedUserId },
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

    await this.prisma.portfolioSnapshotRecord.deleteMany({
      where: { id, userId: scopedUserId },
    });

    return true;
  }
}
