import type {
  ConnectedSource,
  ConnectedSourceAccount,
  ConnectedSyncRun,
  PortfolioAssetCategory,
  PortfolioDataSourceType,
  PortfolioSnapshotDelta,
  PortfolioSnapshotLineage,
  PortfolioSnapshot,
} from '@aurum/core';
import {
  PortfolioAssetCategoryType,
  PortfolioSnapshotIngestionMode,
  PortfolioSnapshotSourceType,
  Prisma,
} from '@prisma/client';
import { ConflictException, Injectable } from '@nestjs/common';
import { parseDateOnly } from '../common/date-only';
import { PrismaService } from '../prisma/prisma.service';
import { LEGACY_SNAPSHOT_OWNER_USER_ID } from './legacy-snapshot-owner';
import { mapPortfolioSnapshotRecordToSnapshot } from './portfolio-snapshot.mapper';

type SnapshotRecord = Prisma.PortfolioSnapshotRecordGetPayload<{
  include: { positions: true };
}>;

type SnapshotLineageRecord = Prisma.PortfolioSnapshotRecordGetPayload<{
  include: {
    positions: true;
    source: true;
    sourceSyncRun: true;
  };
}>;

type SourceAccountRecord =
  Prisma.ConnectedSourceAccountRecordGetPayload<object>;

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

function mapCategory(
  category: PortfolioAssetCategoryType | null,
): PortfolioAssetCategory | undefined {
  switch (category) {
    case PortfolioAssetCategoryType.CASH:
      return 'cash';
    case PortfolioAssetCategoryType.EQUITY:
      return 'equity';
    case PortfolioAssetCategoryType.ETF:
      return 'etf';
    case PortfolioAssetCategoryType.CRYPTO:
      return 'crypto';
    case PortfolioAssetCategoryType.FUND:
      return 'fund';
    case PortfolioAssetCategoryType.OTHER:
      return 'other';
    default:
      return undefined;
  }
}

function decimalToNumber(
  value: Prisma.Decimal | number | null | undefined,
): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return Number(value);
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

function mapMetadata(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function mapConnectedSource(
  record: NonNullable<SnapshotLineageRecord['source']>,
): ConnectedSource {
  return {
    id: record.id,
    userId: record.userId,
    kind: record.kind,
    providerKey: record.providerKey ?? undefined,
    providerConnectionId: record.providerConnectionId ?? undefined,
    displayName: record.displayName,
    status: record.status,
    institutionName: record.institutionName ?? undefined,
    baseCurrency: record.baseCurrency,
    metadata: mapMetadata(record.metadata),
    lastSuccessfulSyncAt: record.lastSuccessfulSyncAt?.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapConnectedSourceAccount(
  record: SourceAccountRecord,
): ConnectedSourceAccount {
  return {
    id: record.id,
    sourceId: record.sourceId,
    externalAccountId: record.externalAccountId ?? undefined,
    displayName: record.displayName,
    officialName: record.officialName ?? undefined,
    accountType: record.accountType,
    currency: record.currency,
    assetType: record.assetType ? mapCategory(record.assetType) : undefined,
    assetSubType: record.assetSubType ?? undefined,
    institutionOrIssuer: record.institutionOrIssuer ?? undefined,
    maskLast4: record.maskLast4 ?? undefined,
    isActive: record.isActive,
    metadata: mapMetadata(record.metadata),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapConnectedSyncRun(
  record: NonNullable<SnapshotLineageRecord['sourceSyncRun']>,
): ConnectedSyncRun {
  return {
    id: record.id,
    userId: record.userId,
    sourceId: record.sourceId,
    triggerType: record.triggerType,
    status: record.status,
    startedAt: record.startedAt?.toISOString(),
    finishedAt: record.finishedAt?.toISOString(),
    errorCode: record.errorCode ?? undefined,
    errorMessage: record.errorMessage ?? undefined,
    normalizationVersion: record.normalizationVersion ?? undefined,
    rawPayloadRef: record.rawPayloadRef ?? undefined,
    producedSnapshotId: record.producedSnapshotId ?? undefined,
    metadata: mapMetadata(record.metadata),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
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

  async getSnapshotLineage(
    id: string,
    userId?: string,
  ): Promise<PortfolioSnapshotLineage | null> {
    const scopedUserId = userId ?? LEGACY_SNAPSHOT_OWNER_USER_ID;
    const record = await this.prisma.portfolioSnapshotRecord.findFirst({
      where: {
        id,
        userId: scopedUserId,
      },
      include: {
        positions: {
          orderBy: [{ marketValue: 'desc' }, { assetKey: 'asc' }],
        },
        source: true,
        sourceSyncRun: true,
      },
    });

    if (!record) {
      return null;
    }

    const sourceAccountIds = [
      ...new Set(
        record.positions
          .map((position) => position.sourceAccountId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const accounts = await this.prisma.connectedSourceAccountRecord.findMany({
      where: record.sourceId
        ? { sourceId: record.sourceId }
        : { id: { in: sourceAccountIds } },
      orderBy: [{ createdAt: 'asc' }],
    });
    const accountsById = Object.fromEntries(
      accounts.map((account) => [
        account.id,
        mapConnectedSourceAccount(account),
      ]),
    );
    const snapshot = mapPortfolioSnapshotRecordToSnapshot(record);

    return {
      snapshot,
      source: record.source ? mapConnectedSource(record.source) : undefined,
      sourceSyncRun: record.sourceSyncRun
        ? mapConnectedSyncRun(record.sourceSyncRun)
        : undefined,
      accountsById,
      positionsWithAccountContext: snapshot.positions.map((position) => {
        const sourceAccount = position.sourceAccountId
          ? accountsById[position.sourceAccountId]
          : undefined;

        return {
          ...position,
          sourceAccount,
          sourceName:
            sourceAccount?.displayName ??
            record.source?.displayName ??
            snapshot.metadata.sourceLabel,
        };
      }),
    };
  }

  async getSnapshotDelta(
    id: string,
    compareTo: 'previous' = 'previous',
    userId?: string,
  ): Promise<PortfolioSnapshotDelta | null> {
    const scopedUserId = userId ?? LEGACY_SNAPSHOT_OWNER_USER_ID;
    const current = await this.prisma.portfolioSnapshotRecord.findFirst({
      where: { id, userId: scopedUserId },
      include: {
        positions: {
          orderBy: [{ marketValue: 'desc' }, { assetKey: 'asc' }],
        },
      },
    });
    if (!current) {
      return null;
    }

    const previous =
      compareTo === 'previous'
        ? await this.findPreviousSnapshot(scopedUserId, current)
        : null;

    if (!previous) {
      return {
        baseSnapshotId: current.id,
        compareSnapshotId: undefined,
        totalValueDelta: 0,
        cashValueDelta: 0,
        positionDeltas: [],
        accountDeltas: [],
        baselineStatus: 'no_baseline',
      };
    }

    const accountIds = [
      ...new Set(
        [...current.positions, ...previous.positions]
          .map((position) => position.sourceAccountId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const accountRecords =
      await this.prisma.connectedSourceAccountRecord.findMany({
        where: { id: { in: accountIds } },
      });
    const accountNames = new Map(
      accountRecords.map((account) => [account.id, account.displayName]),
    );
    const previousPositions = new Map(
      previous.positions.map((position) => [
        this.getPositionDeltaKey(position),
        position,
      ]),
    );
    const currentPositions = new Map(
      current.positions.map((position) => [
        this.getPositionDeltaKey(position),
        position,
      ]),
    );
    const keys = [
      ...new Set([...previousPositions.keys(), ...currentPositions.keys()]),
    ];
    const positionDeltas = keys
      .map((key) => {
        const previousPosition = previousPositions.get(key);
        const currentPosition = currentPositions.get(key);
        const previousMarketValue = previousPosition
          ? Number(previousPosition.marketValue)
          : undefined;
        const currentMarketValue = currentPosition
          ? Number(currentPosition.marketValue)
          : undefined;
        const marketValueDelta =
          (currentMarketValue ?? 0) - (previousMarketValue ?? 0);
        const previousQuantity = decimalToNumber(previousPosition?.quantity);
        const currentQuantity = decimalToNumber(currentPosition?.quantity);
        const sourceAccountId =
          currentPosition?.sourceAccountId ??
          previousPosition?.sourceAccountId ??
          undefined;

        return {
          assetKey:
            currentPosition?.assetKey ?? previousPosition?.assetKey ?? key,
          symbol:
            currentPosition?.symbol ?? previousPosition?.symbol ?? undefined,
          name: currentPosition?.name ?? previousPosition?.name ?? undefined,
          previousMarketValue,
          currentMarketValue,
          marketValueDelta,
          previousQuantity,
          currentQuantity,
          quantityDelta:
            previousQuantity === undefined && currentQuantity === undefined
              ? undefined
              : (currentQuantity ?? 0) - (previousQuantity ?? 0),
          sourceAccountId,
          sourceAccountName: sourceAccountId
            ? accountNames.get(sourceAccountId)
            : undefined,
          changeType: this.getChangeType(
            previousMarketValue,
            currentMarketValue,
          ),
        };
      })
      .sort(
        (left, right) =>
          Math.abs(right.marketValueDelta) - Math.abs(left.marketValueDelta),
      );

    return {
      baseSnapshotId: current.id,
      compareSnapshotId: previous.id,
      totalValueDelta: Number(current.totalValue) - Number(previous.totalValue),
      cashValueDelta:
        (decimalToNumber(current.cashValue) ?? 0) -
        (decimalToNumber(previous.cashValue) ?? 0),
      positionDeltas,
      accountDeltas: this.buildAccountDeltas(previous, current, accountNames),
      baselineStatus: 'available',
    };
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

  private async findPreviousSnapshot(
    userId: string,
    current: SnapshotRecord,
  ): Promise<SnapshotRecord | null> {
    const beforeCurrent: Prisma.PortfolioSnapshotRecordWhereInput = {
      OR: [
        { snapshotDate: { lt: current.snapshotDate } },
        {
          snapshotDate: current.snapshotDate,
          createdAt: { lt: current.createdAt },
        },
      ],
    };

    const sourceScopedPrevious = current.sourceId
      ? await this.prisma.portfolioSnapshotRecord.findFirst({
          where: {
            userId,
            sourceId: current.sourceId,
            ...beforeCurrent,
          },
          orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
          include: {
            positions: {
              orderBy: [{ marketValue: 'desc' }, { assetKey: 'asc' }],
            },
          },
        })
      : null;
    if (sourceScopedPrevious) {
      return sourceScopedPrevious;
    }

    return this.prisma.portfolioSnapshotRecord.findFirst({
      where: {
        userId,
        ...beforeCurrent,
      },
      orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        positions: {
          orderBy: [{ marketValue: 'desc' }, { assetKey: 'asc' }],
        },
      },
    });
  }

  private getPositionDeltaKey(
    position: SnapshotRecord['positions'][number],
  ): string {
    return `${position.sourceAccountId ?? 'unknown'}:${position.assetKey}`;
  }

  private getChangeType(
    previousMarketValue: number | undefined,
    currentMarketValue: number | undefined,
  ): PortfolioSnapshotDelta['positionDeltas'][number]['changeType'] {
    if (previousMarketValue === undefined) {
      return 'added';
    }
    if (currentMarketValue === undefined) {
      return 'removed';
    }
    if (currentMarketValue > previousMarketValue) {
      return 'increased';
    }
    if (currentMarketValue < previousMarketValue) {
      return 'decreased';
    }
    return 'unchanged';
  }

  private buildAccountDeltas(
    previous: SnapshotRecord,
    current: SnapshotRecord,
    accountNames: Map<string, string>,
  ): PortfolioSnapshotDelta['accountDeltas'] {
    const previousValues = this.sumPositionsByAccount(previous);
    const currentValues = this.sumPositionsByAccount(current);
    const accountIds = [
      ...new Set([...previousValues.keys(), ...currentValues.keys()]),
    ];

    return accountIds
      .map((sourceAccountId) => {
        const previousValue = previousValues.get(sourceAccountId) ?? 0;
        const currentValue = currentValues.get(sourceAccountId) ?? 0;

        return {
          sourceAccountId:
            sourceAccountId === 'unknown' ? undefined : sourceAccountId,
          sourceAccountName:
            sourceAccountId === 'unknown'
              ? 'Unknown'
              : (accountNames.get(sourceAccountId) ?? 'Unknown'),
          previousValue,
          currentValue,
          delta: currentValue - previousValue,
        };
      })
      .sort((left, right) => Math.abs(right.delta) - Math.abs(left.delta));
  }

  private sumPositionsByAccount(snapshot: SnapshotRecord): Map<string, number> {
    const values = new Map<string, number>();
    snapshot.positions.forEach((position) => {
      const key = position.sourceAccountId ?? 'unknown';
      values.set(key, (values.get(key) ?? 0) + Number(position.marketValue));
    });

    return values;
  }
}
