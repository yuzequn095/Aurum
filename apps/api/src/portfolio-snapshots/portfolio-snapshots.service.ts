import type {
  ConnectedSource,
  ConnectedSourceAccount,
  ConnectedSyncRun,
  PortfolioAssetCategory,
  PortfolioDataSourceType,
  PortfolioDiagnostics,
  PortfolioDiagnosticsAllocationItem,
  PortfolioDiagnosticsFlag,
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
import { formatDateOnly, parseDateOnly } from '../common/date-only';
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

type SourceAccountWithSourceRecord =
  Prisma.ConnectedSourceAccountRecordGetPayload<{
    include: { source: true };
  }>;

const PORTFOLIO_DIAGNOSTIC_THRESHOLDS = {
  singleHoldingConcentration: 0.25,
  cryptoExposure: 0.15,
  cashExposure: 0.3,
  staleSourceDays: 7,
  employerStockConcentration: 0.25,
};

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

  async getSnapshotDiagnostics(
    id: string,
    userId?: string,
  ): Promise<PortfolioDiagnostics | null> {
    const scopedUserId = userId ?? LEGACY_SNAPSHOT_OWNER_USER_ID;
    const snapshot = await this.prisma.portfolioSnapshotRecord.findFirst({
      where: { id, userId: scopedUserId },
      include: {
        positions: {
          orderBy: [{ marketValue: 'desc' }, { assetKey: 'asc' }],
        },
        source: true,
      },
    });
    if (!snapshot) {
      return null;
    }

    const sourceAccountIds = [
      ...new Set(
        snapshot.positions
          .map((position) => position.sourceAccountId)
          .filter((value): value is string => Boolean(value)),
      ),
    ];
    const sourceAccounts =
      await this.prisma.connectedSourceAccountRecord.findMany({
        where: { id: { in: sourceAccountIds } },
        include: { source: true },
      });
    const accountsById = new Map(
      sourceAccounts.map((account) => [account.id, account]),
    );
    const previous = await this.findPreviousSnapshot(scopedUserId, snapshot);
    const totalValue = Number(snapshot.totalValue);

    const allocationByAssetCategory = this.buildCategoryAllocation(
      snapshot,
      totalValue,
    );
    const allocationByInstitution = this.buildInstitutionAllocation(
      snapshot,
      accountsById,
      totalValue,
    );
    const allocationByAccount = this.buildAccountAllocation(
      snapshot,
      accountsById,
      totalValue,
    );
    const topHoldings = snapshot.positions.slice(0, 10).map((position) => {
      const sourceAccount = position.sourceAccountId
        ? accountsById.get(position.sourceAccountId)
        : undefined;

      return {
        assetKey: position.assetKey,
        symbol: position.symbol ?? undefined,
        name: position.name ?? undefined,
        marketValue: Number(position.marketValue),
        weight: this.safeRatio(Number(position.marketValue), totalValue),
        sourceAccountId: position.sourceAccountId ?? undefined,
        sourceAccountName: sourceAccount?.displayName,
      };
    });
    const cashRatio =
      allocationByAssetCategory.find((item) => item.key === 'cash')?.weight ??
      0;
    const cryptoRatio =
      allocationByAssetCategory.find((item) => item.key === 'crypto')?.weight ??
      0;
    const topHoldingWeight = topHoldings[0]?.weight ?? 0;
    const topInstitutionWeight = allocationByInstitution[0]?.weight ?? 0;
    const employerStockWeight = this.calculateEmployerStockWeight(
      snapshot,
      accountsById,
      totalValue,
    );
    const staleSourceIds = this.getStaleSourceIds(
      sourceAccounts,
      snapshot.source,
    );
    const missingSourceAccountPositionCount = snapshot.positions.filter(
      (position) => !position.sourceAccountId,
    ).length;
    const hasBaselineSnapshot = Boolean(previous);
    const flags = this.buildDiagnosticsFlags({
      cashRatio,
      cryptoRatio,
      topHoldingWeight,
      topInstitutionWeight,
      employerStockWeight,
      staleSourceIds,
      missingSourceAccountPositionCount,
      hasBaselineSnapshot,
    });
    const dataHealthStatus =
      missingSourceAccountPositionCount > 0
        ? 'incomplete'
        : staleSourceIds.length > 0
          ? 'stale'
          : 'fresh';

    return {
      snapshotId: snapshot.id,
      snapshotDate: formatDateOnly(snapshot.snapshotDate),
      totalValue,
      allocationByAssetCategory,
      allocationByInstitution,
      allocationByAccount,
      topHoldings,
      concentration: {
        topHoldingWeight,
        topInstitutionWeight,
        employerStockWeight,
      },
      dataHealth: {
        status: dataHealthStatus,
        staleSourceIds,
        missingSourceAccountPositionCount,
        hasBaselineSnapshot,
      },
      postureSummary: {
        cashRatio,
        cryptoRatio,
        topHoldingWeight,
        topInstitutionWeight,
        dataHealthStatus,
        flags,
      },
      flags,
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

  private buildCategoryAllocation(
    snapshot: SnapshotRecord,
    totalValue: number,
  ): PortfolioDiagnosticsAllocationItem[] {
    const labels: Record<PortfolioAssetCategory, string> = {
      cash: 'Cash',
      equity: 'Equity',
      etf: 'ETF',
      crypto: 'Crypto',
      fund: 'Fund',
      other: 'Other',
    };
    const values = new Map<PortfolioAssetCategory, number>(
      (Object.keys(labels) as PortfolioAssetCategory[]).map((category) => [
        category,
        0,
      ]),
    );
    snapshot.positions.forEach((position) => {
      const category = mapCategory(position.category) ?? 'other';
      values.set(
        category,
        (values.get(category) ?? 0) + Number(position.marketValue),
      );
    });

    return [...values.entries()]
      .map(([key, value]) => ({
        key,
        label: labels[key],
        value,
        weight: this.safeRatio(value, totalValue),
      }))
      .filter((item) => item.value > 0 || item.key === 'other')
      .sort((left, right) => right.value - left.value);
  }

  private buildInstitutionAllocation(
    snapshot: SnapshotRecord,
    accountsById: Map<string, SourceAccountWithSourceRecord>,
    totalValue: number,
  ): PortfolioDiagnosticsAllocationItem[] {
    const values = new Map<string, { label: string; value: number }>();
    snapshot.positions.forEach((position) => {
      const account = position.sourceAccountId
        ? accountsById.get(position.sourceAccountId)
        : undefined;
      const key =
        account?.source.metadata &&
        typeof account.source.metadata === 'object' &&
        !Array.isArray(account.source.metadata) &&
        typeof account.source.metadata.institutionKey === 'string'
          ? account.source.metadata.institutionKey
          : (account?.sourceId ?? snapshot.sourceId ?? 'unknown');
      const label =
        account?.source.institutionName ??
        account?.source.displayName ??
        snapshot.sourceLabel ??
        'Unknown';
      const current = values.get(key) ?? { label, value: 0 };
      values.set(key, {
        label: current.label,
        value: current.value + Number(position.marketValue),
      });
    });

    return this.mapAllocationValues(values, totalValue);
  }

  private buildAccountAllocation(
    snapshot: SnapshotRecord,
    accountsById: Map<string, SourceAccountWithSourceRecord>,
    totalValue: number,
  ): PortfolioDiagnosticsAllocationItem[] {
    const values = new Map<string, { label: string; value: number }>();
    snapshot.positions.forEach((position) => {
      const key = position.sourceAccountId ?? 'unknown';
      const account = position.sourceAccountId
        ? accountsById.get(position.sourceAccountId)
        : undefined;
      const label = account?.displayName ?? 'Unknown';
      const current = values.get(key) ?? { label, value: 0 };
      values.set(key, {
        label: current.label,
        value: current.value + Number(position.marketValue),
      });
    });

    return this.mapAllocationValues(values, totalValue);
  }

  private mapAllocationValues(
    values: Map<string, { label: string; value: number }>,
    totalValue: number,
  ): PortfolioDiagnosticsAllocationItem[] {
    return [...values.entries()]
      .map(([key, item]) => ({
        key,
        label: item.label,
        value: item.value,
        weight: this.safeRatio(item.value, totalValue),
      }))
      .sort((left, right) => right.value - left.value);
  }

  private calculateEmployerStockWeight(
    snapshot: SnapshotRecord,
    accountsById: Map<string, SourceAccountWithSourceRecord>,
    totalValue: number,
  ): number {
    const employerStockValue = snapshot.positions
      .filter((position) => {
        const account = position.sourceAccountId
          ? accountsById.get(position.sourceAccountId)
          : undefined;
        const metadata = mapMetadata(account?.metadata ?? null);

        return (
          metadata?.employerStockCandidate === true ||
          account?.assetSubType?.toLowerCase().includes('rsu') ||
          account?.accountType.toLowerCase().includes('rsu')
        );
      })
      .reduce((sum, position) => sum + Number(position.marketValue), 0);

    return this.safeRatio(employerStockValue, totalValue);
  }

  private getStaleSourceIds(
    accounts: SourceAccountWithSourceRecord[],
    fallbackSource?: SnapshotLineageRecord['source'],
  ): string[] {
    const now = Date.now();
    const thresholdMs =
      PORTFOLIO_DIAGNOSTIC_THRESHOLDS.staleSourceDays * 24 * 60 * 60 * 1000;
    const sources = new Map(
      accounts.map((account) => [account.source.id, account.source]),
    );
    if (fallbackSource) {
      sources.set(fallbackSource.id, fallbackSource);
    }

    return [...sources.values()]
      .filter(
        (source) =>
          source.lastSuccessfulSyncAt &&
          now - source.lastSuccessfulSyncAt.getTime() > thresholdMs,
      )
      .map((source) => source.id);
  }

  private buildDiagnosticsFlags(input: {
    cashRatio: number;
    cryptoRatio: number;
    topHoldingWeight: number;
    topInstitutionWeight: number;
    employerStockWeight: number;
    staleSourceIds: string[];
    missingSourceAccountPositionCount: number;
    hasBaselineSnapshot: boolean;
  }): PortfolioDiagnosticsFlag[] {
    const flags: PortfolioDiagnosticsFlag[] = [];

    if (input.cashRatio > PORTFOLIO_DIAGNOSTIC_THRESHOLDS.cashExposure) {
      flags.push({
        code: 'high_cash',
        label: 'High cash exposure',
        severity: 'info',
        detail: `${Math.round(input.cashRatio * 100)}% of the snapshot is cash.`,
      });
    }
    if (input.cryptoRatio > PORTFOLIO_DIAGNOSTIC_THRESHOLDS.cryptoExposure) {
      flags.push({
        code: 'high_crypto',
        label: 'High crypto exposure',
        severity: 'warning',
        detail: `${Math.round(input.cryptoRatio * 100)}% of the snapshot is crypto.`,
      });
    }
    if (
      input.topHoldingWeight >
      PORTFOLIO_DIAGNOSTIC_THRESHOLDS.singleHoldingConcentration
    ) {
      flags.push({
        code: 'high_single_name_concentration',
        label: 'High single holding concentration',
        severity: 'warning',
        detail: `${Math.round(input.topHoldingWeight * 100)}% is in the largest holding.`,
      });
    }
    if (
      input.topInstitutionWeight >
      PORTFOLIO_DIAGNOSTIC_THRESHOLDS.singleHoldingConcentration
    ) {
      flags.push({
        code: 'high_institution_concentration',
        label: 'High institution concentration',
        severity: 'info',
        detail: `${Math.round(input.topInstitutionWeight * 100)}% is held at the largest institution.`,
      });
    }
    if (
      input.employerStockWeight >
      PORTFOLIO_DIAGNOSTIC_THRESHOLDS.employerStockConcentration
    ) {
      flags.push({
        code: 'high_employer_stock_concentration',
        label: 'High employer stock concentration',
        severity: 'warning',
        detail: `${Math.round(input.employerStockWeight * 100)}% appears linked to employer equity.`,
      });
    }
    if (input.staleSourceIds.length > 0) {
      flags.push({
        code: 'stale_data',
        label: 'Stale data',
        severity: 'warning',
        detail: `${input.staleSourceIds.length} institution(s) last synced more than 7 days ago.`,
      });
    }
    if (input.missingSourceAccountPositionCount > 0) {
      flags.push({
        code: 'missing_valuation',
        label: 'Missing account context',
        severity: 'info',
        detail: `${input.missingSourceAccountPositionCount} position(s) do not have account lineage.`,
      });
    }
    if (!input.hasBaselineSnapshot) {
      flags.push({
        code: 'no_baseline_snapshot',
        label: 'No baseline snapshot',
        severity: 'info',
        detail: 'Create another snapshot to enable change comparison.',
      });
    }

    return flags;
  }

  private safeRatio(value: number, totalValue: number): number {
    return totalValue > 0 ? value / totalValue : 0;
  }
}
