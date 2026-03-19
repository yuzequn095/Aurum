import type {
  BankLinkTokenResult,
  BankSourceConnectionResult,
  BankSyncMaterializationResult,
  ConnectedSource,
  ConnectedSourceAccount,
  ConnectedSyncRun,
  ManualStaticSnapshotMaterializationResult,
  ManualStaticValuation,
  PortfolioAssetCategory,
  PortfolioSnapshot,
} from '@aurum/core';
import { createHash } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ManualStaticSourceAdapter } from '../../../../packages/core/src/portfolio/manual-static';
import type {
  ConnectedSourceAccountRecord,
  ConnectedSourceRecord,
  ConnectedSourceStatus,
  ConnectedSyncRunRecord,
  ManualStaticValuationRecord,
  PortfolioAssetCategoryType,
  Prisma,
} from '@prisma/client';
import { PortfolioSnapshotsService } from '../portfolio-snapshots/portfolio-snapshots.service';
import { mapPortfolioSnapshotRecordToSnapshot } from '../portfolio-snapshots/portfolio-snapshot.mapper';
import { formatDateOnly, parseDateOnly } from '../common/date-only';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectedSourceSecretsService } from './connected-source-secrets.service';
import { CreateConnectedSourceAccountDto } from './dto/create-connected-source-account.dto';
import { CreateConnectedSourceDto } from './dto/create-connected-source.dto';
import { CreateManualStaticValuationDto } from './dto/create-manual-static-valuation.dto';
import { ExchangePlaidPublicTokenDto } from './dto/exchange-plaid-public-token.dto';
import { ListConnectedSourcesQueryDto } from './dto/list-connected-sources-query.dto';
import { MaterializeManualStaticSnapshotDto } from './dto/materialize-manual-static-snapshot.dto';
import { UpdateConnectedSourceAccountDto } from './dto/update-connected-source-account.dto';
import { UpdateConnectedSourceDto } from './dto/update-connected-source.dto';
import { PlaidBankAdapter } from './providers/plaid/plaid-bank.adapter';
import { PlaidClient } from './providers/plaid/plaid.client';
import type {
  PlaidLinkedAccount,
  PlaidSourceSecretPayload,
} from './providers/plaid/plaid.types';

type OwnedSourceAccountRecord = Prisma.ConnectedSourceAccountRecordGetPayload<{
  include: { source: true };
}>;

type SourceSnapshotRecord = Prisma.PortfolioSnapshotRecordGetPayload<{
  include: { positions: true };
}>;

function mapMetadata(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function mapAssetType(
  assetType: PortfolioAssetCategoryType | null,
): PortfolioAssetCategory | undefined {
  switch (assetType) {
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

function toPrismaAssetType(
  assetType: PortfolioAssetCategory | undefined,
): PortfolioAssetCategoryType | undefined {
  switch (assetType) {
    case 'cash':
      return 'CASH';
    case 'equity':
      return 'EQUITY';
    case 'etf':
      return 'ETF';
    case 'crypto':
      return 'CRYPTO';
    case 'fund':
      return 'FUND';
    case 'other':
      return 'OTHER';
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

function mapSourceRecord(record: ConnectedSourceRecord): ConnectedSource {
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

function mapSourceAccountRecord(
  record: ConnectedSourceAccountRecord,
): ConnectedSourceAccount {
  return {
    id: record.id,
    sourceId: record.sourceId,
    externalAccountId: record.externalAccountId ?? undefined,
    displayName: record.displayName,
    officialName: record.officialName ?? undefined,
    accountType: record.accountType,
    currency: record.currency,
    assetType: mapAssetType(record.assetType),
    assetSubType: record.assetSubType ?? undefined,
    institutionOrIssuer: record.institutionOrIssuer ?? undefined,
    maskLast4: record.maskLast4 ?? undefined,
    isActive: record.isActive,
    metadata: mapMetadata(record.metadata),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapSyncRunRecord(record: ConnectedSyncRunRecord): ConnectedSyncRun {
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

function mapValuationRecord(
  record: ManualStaticValuationRecord,
): ManualStaticValuation {
  return {
    id: record.id,
    userId: record.userId,
    sourceId: record.sourceId,
    sourceAccountId: record.sourceAccountId,
    valuationDate: formatDateOnly(record.valuationDate),
    currency: record.currency,
    marketValue: Number(record.marketValue),
    quantity: decimalToNumber(record.quantity),
    unitPrice: decimalToNumber(record.unitPrice),
    symbol: record.symbol ?? undefined,
    assetName: record.assetName ?? undefined,
    note: record.note ?? undefined,
    metadata: mapMetadata(record.metadata),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

function mapStatus(
  status: ConnectedSourceStatus | undefined,
): ConnectedSourceStatus | undefined {
  return status;
}

function getLatestValuationDate(
  valuations: ManualStaticValuation[],
  requestedSnapshotDate?: string,
): string {
  if (requestedSnapshotDate) {
    return requestedSnapshotDate;
  }

  return valuations.reduce(
    (latest, valuation) =>
      valuation.valuationDate > latest ? valuation.valuationDate : latest,
    valuations[0]?.valuationDate ?? formatDateOnly(new Date()),
  );
}

function buildSourceFingerprint(items: Array<Record<string, unknown>>): string {
  return createHash('sha256').update(JSON.stringify(items)).digest('hex');
}

function mapPlaidAccountAssetType(
  accountType: string,
): PortfolioAssetCategoryType {
  return accountType.trim().toLowerCase() === 'depository' ? 'CASH' : 'OTHER';
}

@Injectable()
export class ConnectedFinanceService {
  private readonly manualStaticSourceAdapter = new ManualStaticSourceAdapter();

  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolioSnapshotsService: PortfolioSnapshotsService,
    private readonly connectedSourceSecretsService: ConnectedSourceSecretsService,
    private readonly plaidClient: PlaidClient,
    private readonly plaidBankAdapter: PlaidBankAdapter,
  ) {}

  async listSources(
    userId: string,
    query: ListConnectedSourcesQueryDto,
  ): Promise<ConnectedSource[]> {
    const where: Prisma.ConnectedSourceRecordWhereInput = {
      userId,
      kind: query.kind,
      status: mapStatus(query.status),
    };

    const records = await this.prisma.connectedSourceRecord.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });

    return records.map(mapSourceRecord);
  }

  async createSource(
    userId: string,
    dto: CreateConnectedSourceDto,
  ): Promise<ConnectedSource> {
    const created = await this.prisma.connectedSourceRecord.create({
      data: {
        userId,
        kind: dto.kind,
        providerKey: dto.providerKey,
        displayName: dto.displayName,
        status: mapStatus(dto.status) ?? 'ACTIVE',
        institutionName: dto.institutionName,
        baseCurrency: dto.baseCurrency ?? 'USD',
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    return mapSourceRecord(created);
  }

  async getSourceById(
    userId: string,
    id: string,
  ): Promise<ConnectedSource | null> {
    const record = await this.getOwnedSourceRecord(userId, id);
    return record ? mapSourceRecord(record) : null;
  }

  async updateSource(
    userId: string,
    id: string,
    dto: UpdateConnectedSourceDto,
  ): Promise<ConnectedSource | null> {
    const result = await this.prisma.connectedSourceRecord.updateMany({
      where: { id, userId },
      data: {
        providerKey: dto.providerKey,
        displayName: dto.displayName,
        status: mapStatus(dto.status),
        institutionName: dto.institutionName,
        baseCurrency: dto.baseCurrency,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    if (result.count === 0) {
      return null;
    }

    return this.getSourceById(userId, id);
  }

  async createPlaidLinkToken(userId: string): Promise<BankLinkTokenResult> {
    const result = await this.plaidClient.createLinkToken(userId);

    return {
      providerKey: 'PLAID',
      linkToken: result.linkToken,
      expiration: result.expiration,
    };
  }

  async exchangePlaidPublicToken(
    userId: string,
    dto: ExchangePlaidPublicTokenDto,
  ): Promise<BankSourceConnectionResult> {
    const exchange = await this.plaidClient.exchangePublicToken(
      dto.publicToken,
    );
    const initialAccounts = await this.plaidClient.getInitialAccounts(
      exchange.accessToken,
      dto.metadata,
    );
    if (initialAccounts.accounts.length === 0) {
      throw new BadRequestException(
        'Plaid connection returned no accounts to link.',
      );
    }

    const institutionName =
      dto.metadata?.institution?.institutionName ??
      initialAccounts.institution?.institutionName;
    const providerConnectionId = initialAccounts.itemId ?? exchange.itemId;

    const existingSource = await this.prisma.connectedSourceRecord.findFirst({
      where: {
        userId,
        kind: 'BANK',
        providerKey: 'PLAID',
        providerConnectionId,
      },
    });

    const sourceMetadata = {
      ...(existingSource ? mapMetadata(existingSource.metadata) : {}),
      provider: 'PLAID',
      linkSessionId: dto.metadata?.linkSessionId,
      lastExchangeRequestId: exchange.requestId,
    } satisfies Record<string, unknown>;

    const source = existingSource
      ? await this.prisma.connectedSourceRecord.update({
          where: { id: existingSource.id },
          data: {
            status: 'ACTIVE',
            displayName: institutionName ?? existingSource.displayName,
            institutionName,
            baseCurrency:
              initialAccounts.accounts[0]?.currency ??
              existingSource.baseCurrency,
            metadata: sourceMetadata as Prisma.InputJsonValue,
          },
        })
      : await this.prisma.connectedSourceRecord.create({
          data: {
            userId,
            kind: 'BANK',
            providerKey: 'PLAID',
            providerConnectionId,
            displayName: institutionName ?? 'Plaid Bank Connection',
            status: 'ACTIVE',
            institutionName,
            baseCurrency: initialAccounts.accounts[0]?.currency ?? 'USD',
            metadata: sourceMetadata as Prisma.InputJsonValue,
          },
        });

    await this.prisma.connectedSourceSecretRecord.upsert({
      where: {
        sourceId_secretType: {
          sourceId: source.id,
          secretType: 'PROVIDER_CREDENTIALS',
        },
      },
      create: {
        userId,
        sourceId: source.id,
        secretType: 'PROVIDER_CREDENTIALS',
        encryptedPayload: this.connectedSourceSecretsService.encryptJson({
          accessToken: exchange.accessToken,
          itemId: providerConnectionId,
          institutionId: dto.metadata?.institution?.institutionId,
          institutionName,
        }),
      },
      update: {
        userId,
        encryptedPayload: this.connectedSourceSecretsService.encryptJson({
          accessToken: exchange.accessToken,
          itemId: providerConnectionId,
          institutionId: dto.metadata?.institution?.institutionId,
          institutionName,
        }),
      },
    });

    const sourceAccounts = await this.syncPlaidSourceAccounts(
      source,
      initialAccounts.accounts,
      institutionName,
    );

    return {
      providerKey: 'PLAID',
      source: mapSourceRecord(source),
      accounts: sourceAccounts.map(mapSourceAccountRecord),
    };
  }

  async createSourceAccount(
    userId: string,
    sourceId: string,
    dto: CreateConnectedSourceAccountDto,
  ): Promise<ConnectedSourceAccount | null> {
    const source = await this.getOwnedSourceRecord(userId, sourceId);
    if (!source) {
      return null;
    }

    this.assertManualStaticSource(source);

    const created = await this.prisma.connectedSourceAccountRecord.create({
      data: {
        sourceId,
        externalAccountId: dto.externalAccountId,
        displayName: dto.displayName,
        accountType: dto.accountType,
        currency: dto.currency ?? source.baseCurrency,
        assetType: toPrismaAssetType(dto.assetType),
        assetSubType: dto.assetSubType,
        institutionOrIssuer: dto.institutionOrIssuer,
        maskLast4: dto.maskLast4,
        isActive: dto.isActive ?? true,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    return mapSourceAccountRecord(created);
  }

  async updateSourceAccount(
    userId: string,
    accountId: string,
    dto: UpdateConnectedSourceAccountDto,
  ): Promise<ConnectedSourceAccount | null> {
    const account = await this.getOwnedSourceAccountRecord(userId, accountId);
    if (!account) {
      return null;
    }

    this.assertManualStaticSource(account.source);

    const updated = await this.prisma.connectedSourceAccountRecord.update({
      where: { id: accountId },
      data: {
        displayName: dto.displayName,
        accountType: dto.accountType,
        currency: dto.currency,
        assetType: dto.assetType ? toPrismaAssetType(dto.assetType) : undefined,
        assetSubType: dto.assetSubType,
        institutionOrIssuer: dto.institutionOrIssuer,
        externalAccountId: dto.externalAccountId,
        maskLast4: dto.maskLast4,
        isActive: dto.isActive,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    return mapSourceAccountRecord(updated);
  }

  async listSourceAccounts(
    userId: string,
    sourceId: string,
  ): Promise<ConnectedSourceAccount[] | null> {
    const source = await this.getOwnedSourceRecord(userId, sourceId);
    if (!source) {
      return null;
    }

    const records = await this.prisma.connectedSourceAccountRecord.findMany({
      where: { sourceId: source.id },
      orderBy: [{ createdAt: 'asc' }],
    });

    return records.map(mapSourceAccountRecord);
  }

  async listSourceSyncRuns(
    userId: string,
    sourceId: string,
  ): Promise<ConnectedSyncRun[] | null> {
    const source = await this.getOwnedSourceRecord(userId, sourceId);
    if (!source) {
      return null;
    }

    const records = await this.prisma.connectedSyncRunRecord.findMany({
      where: { sourceId: source.id, userId },
      orderBy: [{ createdAt: 'desc' }],
    });

    return records.map(mapSyncRunRecord);
  }

  async createManualStaticValuation(
    userId: string,
    accountId: string,
    dto: CreateManualStaticValuationDto,
  ): Promise<ManualStaticValuation | null> {
    const account = await this.getOwnedSourceAccountRecord(userId, accountId);
    if (!account) {
      return null;
    }

    this.assertManualStaticSource(account.source);

    // `marketValue` remains the canonical source of truth in v1 materialization.
    const created = await this.prisma.manualStaticValuationRecord.create({
      data: {
        userId,
        sourceId: account.sourceId,
        sourceAccountId: account.id,
        valuationDate: parseDateOnly(dto.valuationDate),
        currency: dto.currency ?? account.currency,
        marketValue: dto.marketValue,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
        symbol: dto.symbol,
        assetName: dto.assetName,
        note: dto.note,
        metadata: dto.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    return mapValuationRecord(created);
  }

  async listManualStaticValuations(
    userId: string,
    accountId: string,
  ): Promise<ManualStaticValuation[] | null> {
    const account = await this.getOwnedSourceAccountRecord(userId, accountId);
    if (!account) {
      return null;
    }

    this.assertManualStaticSource(account.source);

    const records = await this.prisma.manualStaticValuationRecord.findMany({
      where: {
        userId,
        sourceAccountId: account.id,
      },
      orderBy: [{ valuationDate: 'desc' }, { createdAt: 'desc' }],
    });

    return records.map(mapValuationRecord);
  }

  async materializeManualStaticSnapshot(
    userId: string,
    sourceId: string,
    dto: MaterializeManualStaticSnapshotDto,
  ): Promise<ManualStaticSnapshotMaterializationResult | null> {
    const source = await this.getOwnedSourceRecord(userId, sourceId);
    if (!source) {
      return null;
    }

    this.assertManualStaticSource(source);

    const activeAccounts =
      await this.prisma.connectedSourceAccountRecord.findMany({
        where: {
          sourceId,
          isActive: true,
        },
        orderBy: [{ createdAt: 'asc' }],
      });

    if (activeAccounts.length === 0) {
      throw new BadRequestException(
        'Manual static source has no active accounts to materialize.',
      );
    }

    const valuationRecords =
      await this.prisma.manualStaticValuationRecord.findMany({
        where: {
          userId,
          sourceId,
          sourceAccountId: {
            in: activeAccounts.map((account) => account.id),
          },
        },
        orderBy: [
          { sourceAccountId: 'asc' },
          { valuationDate: 'desc' },
          { createdAt: 'desc' },
        ],
      });

    const latestValuations = this.selectLatestValuations(valuationRecords);
    if (latestValuations.length === 0) {
      throw new BadRequestException(
        'Manual static source has no valuation history to materialize.',
      );
    }

    const snapshotDate = getLatestValuationDate(
      latestValuations,
      dto.snapshotDate,
    );
    const normalized = this.manualStaticSourceAdapter.normalize({
      source: mapSourceRecord(source),
      accounts: activeAccounts.map(mapSourceAccountRecord),
      latestValuations,
      snapshotDate,
    });
    if (normalized.positions.length === 0) {
      throw new BadRequestException(
        'Manual static source has no usable latest valuations for active accounts.',
      );
    }

    const sourceFingerprint = buildSourceFingerprint(
      latestValuations.map((valuation) => ({
        id: valuation.id,
        sourceAccountId: valuation.sourceAccountId,
        valuationDate: valuation.valuationDate,
        marketValue: valuation.marketValue,
        quantity: valuation.quantity,
        unitPrice: valuation.unitPrice,
      })),
    );
    const syncRun = await this.prisma.connectedSyncRunRecord.create({
      data: {
        userId,
        sourceId,
        triggerType: 'MANUAL',
        status: 'RUNNING',
        startedAt: new Date(),
        normalizationVersion: normalized.normalizationVersion,
        metadata: {
          materializationMode: 'manual_static_latest_valuations',
          latestValuationIds: latestValuations.map((valuation) => valuation.id),
        } as Prisma.InputJsonValue,
      },
    });

    try {
      const snapshot = await this.portfolioSnapshotsService.createSnapshot(
        {
          userId,
          metadata: {
            portfolioName: normalized.portfolioName,
            sourceType: 'manual',
            sourceLabel: normalized.sourceLabel ?? source.displayName,
            snapshotDate: normalized.snapshotDate,
            valuationCurrency: normalized.valuationCurrency,
            ingestionMode: 'MANUAL_STATIC',
            sourceId,
            sourceSyncRunId: syncRun.id,
            normalizationVersion: normalized.normalizationVersion,
            sourceFingerprint,
          },
          totalValue: normalized.totalValue,
          cashValue: normalized.cashValue,
          positions: normalized.positions.map((position) => ({
            assetKey: position.assetKey,
            symbol: position.symbol,
            name: position.name,
            quantity: position.quantity,
            marketValue: position.marketValue,
            category: this.toPortfolioCategory(position.category),
            sourceAccountId: position.sourceAccountRef,
            notes: position.notes,
          })),
        },
        userId,
      );

      const completedSyncRun = await this.prisma.connectedSyncRunRecord.update({
        where: { id: syncRun.id },
        data: {
          status: 'SUCCEEDED',
          finishedAt: new Date(),
          producedSnapshotId: snapshot.id,
          metadata: {
            materializationMode: 'manual_static_latest_valuations',
            snapshotId: snapshot.id,
            latestValuationIds: latestValuations.map(
              (valuation) => valuation.id,
            ),
          } as Prisma.InputJsonValue,
        },
      });

      await this.prisma.connectedSourceRecord.update({
        where: { id: sourceId },
        data: { lastSuccessfulSyncAt: new Date() },
      });

      return {
        snapshot,
        syncRun: mapSyncRunRecord(completedSyncRun),
        latestValuationCount: latestValuations.length,
        materializedAccountCount: normalized.positions.length,
        snapshotDate,
      };
    } catch (error) {
      await this.prisma.connectedSyncRunRecord.update({
        where: { id: syncRun.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorCode: 'MANUAL_STATIC_MATERIALIZATION_FAILED',
          errorMessage:
            error instanceof Error
              ? error.message
              : 'Snapshot materialization failed',
        },
      });

      throw error;
    }
  }

  async syncBankSource(
    userId: string,
    sourceId: string,
  ): Promise<BankSyncMaterializationResult | null> {
    const source = await this.getOwnedSourceRecord(userId, sourceId);
    if (!source) {
      return null;
    }

    this.assertPlaidBankSource(source);

    const secretRecord =
      await this.prisma.connectedSourceSecretRecord.findFirst({
        where: {
          userId,
          sourceId,
          secretType: 'PROVIDER_CREDENTIALS',
        },
      });
    if (!secretRecord) {
      throw new BadRequestException(
        'Plaid bank source is missing provider credentials.',
      );
    }

    const secretPayload =
      this.connectedSourceSecretsService.decryptJson<PlaidSourceSecretPayload>(
        secretRecord.encryptedPayload,
      );
    const syncRun = await this.prisma.connectedSyncRunRecord.create({
      data: {
        userId,
        sourceId,
        triggerType: 'MANUAL',
        status: 'RUNNING',
        startedAt: new Date(),
        normalizationVersion: this.plaidBankAdapter.normalizationVersion,
        metadata: {
          providerKey: 'PLAID',
          syncMode: 'balance_snapshot',
          itemId: secretPayload.itemId,
        } as Prisma.InputJsonValue,
      },
    });

    try {
      const plaidBalances = await this.plaidClient.getCurrentBalances(
        secretPayload.accessToken,
      );
      if (plaidBalances.accounts.length === 0) {
        throw new BadRequestException(
          'Plaid bank source returned no linked accounts to sync.',
        );
      }

      const syncedAccounts = await this.syncPlaidSourceAccounts(
        source,
        plaidBalances.accounts,
        secretPayload.institutionName ??
          plaidBalances.institution?.institutionName,
      );
      const snapshotDate = formatDateOnly(new Date());
      const normalized = this.plaidBankAdapter.normalize({
        source: mapSourceRecord(source),
        accounts: syncedAccounts
          .map(mapSourceAccountRecord)
          .filter((account) => account.isActive),
        accountInputs: plaidBalances.accounts,
        balances: plaidBalances.accounts,
        snapshotDate,
      });
      if (normalized.positions.length === 0) {
        throw new BadRequestException(
          'Plaid bank source returned no usable account balances to materialize.',
        );
      }

      const sourceFingerprint = buildSourceFingerprint(
        plaidBalances.accounts.map((account) => ({
          externalAccountId: account.externalAccountId,
          currentBalance: account.currentBalance,
          availableBalance: account.availableBalance,
          currency: account.currency,
        })),
      );
      const snapshot = await this.portfolioSnapshotsService.createSnapshot(
        {
          userId,
          metadata: {
            portfolioName: normalized.portfolioName,
            sourceType: 'other',
            sourceLabel: normalized.sourceLabel ?? source.displayName,
            snapshotDate,
            valuationCurrency: normalized.valuationCurrency,
            ingestionMode: 'CONNECTED_SYNC',
            sourceId,
            sourceSyncRunId: syncRun.id,
            normalizationVersion: normalized.normalizationVersion,
            sourceFingerprint,
          },
          totalValue: normalized.totalValue,
          cashValue: normalized.cashValue,
          positions: normalized.positions.map((position) => ({
            assetKey: position.assetKey,
            symbol: position.symbol,
            name: position.name,
            quantity: position.quantity,
            marketValue: position.marketValue,
            category: this.toPortfolioCategory(position.category),
            sourceAccountId: position.sourceAccountRef,
            notes: position.notes,
          })),
        },
        userId,
      );

      const completedSyncRun = await this.prisma.connectedSyncRunRecord.update({
        where: { id: syncRun.id },
        data: {
          status: 'SUCCEEDED',
          finishedAt: new Date(),
          producedSnapshotId: snapshot.id,
          rawPayloadRef: plaidBalances.requestId,
          metadata: {
            providerKey: 'PLAID',
            syncMode: 'balance_snapshot',
            itemId: secretPayload.itemId,
            snapshotId: snapshot.id,
            syncedExternalAccountIds: plaidBalances.accounts.map(
              (account) => account.externalAccountId,
            ),
          } as Prisma.InputJsonValue,
        },
      });

      await this.prisma.connectedSourceRecord.update({
        where: { id: sourceId },
        data: {
          lastSuccessfulSyncAt: new Date(),
          institutionName:
            secretPayload.institutionName ??
            plaidBalances.institution?.institutionName,
          metadata: {
            ...(mapMetadata(source.metadata) ?? {}),
            provider: 'PLAID',
            lastBalanceSyncRequestId: plaidBalances.requestId,
          } as Prisma.InputJsonValue,
        },
      });

      return {
        snapshot,
        syncRun: mapSyncRunRecord(completedSyncRun),
        syncedAccountCount: plaidBalances.accounts.length,
        materializedPositionCount: normalized.positions.length,
        snapshotDate,
        balanceSelectionStrategy:
          this.plaidBankAdapter.balanceSelectionStrategy,
      };
    } catch (error) {
      await this.prisma.connectedSyncRunRecord.update({
        where: { id: syncRun.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorCode: 'PLAID_BANK_SYNC_FAILED',
          errorMessage:
            error instanceof Error ? error.message : 'Plaid bank sync failed',
        },
      });

      throw error;
    }
  }

  async listSourceSnapshots(
    userId: string,
    sourceId: string,
  ): Promise<PortfolioSnapshot[] | null> {
    const source = await this.getOwnedSourceRecord(userId, sourceId);
    if (!source) {
      return null;
    }

    const snapshots = await this.prisma.portfolioSnapshotRecord.findMany({
      where: {
        userId,
        sourceId,
      },
      orderBy: [{ snapshotDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        positions: {
          orderBy: [{ marketValue: 'desc' }, { assetKey: 'asc' }],
        },
      },
    });

    return snapshots.map((snapshot) =>
      mapPortfolioSnapshotRecordToSnapshot(snapshot as SourceSnapshotRecord),
    );
  }

  private async getOwnedSourceRecord(userId: string, id: string) {
    return this.prisma.connectedSourceRecord.findFirst({
      where: { id, userId },
    });
  }

  private async getOwnedSourceAccountRecord(
    userId: string,
    accountId: string,
  ): Promise<OwnedSourceAccountRecord | null> {
    return this.prisma.connectedSourceAccountRecord.findFirst({
      where: {
        id: accountId,
        source: {
          userId,
        },
      },
      include: {
        source: true,
      },
    });
  }

  private async syncPlaidSourceAccounts(
    source: ConnectedSourceRecord,
    plaidAccounts: PlaidLinkedAccount[],
    institutionName?: string,
  ): Promise<ConnectedSourceAccountRecord[]> {
    const existingAccounts =
      await this.prisma.connectedSourceAccountRecord.findMany({
        where: { sourceId: source.id },
      });
    const existingByExternalAccountId = new Map(
      existingAccounts
        .filter((account) => account.externalAccountId)
        .map((account) => [account.externalAccountId as string, account]),
    );
    const syncedAccounts: ConnectedSourceAccountRecord[] = [];

    for (const plaidAccount of plaidAccounts) {
      const data = {
        displayName: plaidAccount.displayName,
        officialName: plaidAccount.officialName,
        accountType: plaidAccount.accountType,
        currency: plaidAccount.currency ?? source.baseCurrency,
        assetType: mapPlaidAccountAssetType(plaidAccount.accountType),
        assetSubType: plaidAccount.accountSubType,
        institutionOrIssuer:
          plaidAccount.institutionName ??
          institutionName ??
          source.institutionName,
        maskLast4: plaidAccount.maskLast4,
        isActive: true,
        metadata: {
          ...(plaidAccount.metadata ?? {}),
          currentBalance: plaidAccount.currentBalance,
          availableBalance: plaidAccount.availableBalance,
          balanceAsOf: plaidAccount.asOf,
          externalAccountId: plaidAccount.externalAccountId,
        } as Prisma.InputJsonValue,
      };
      const existing = existingByExternalAccountId.get(
        plaidAccount.externalAccountId,
      );
      const synced = existing
        ? await this.prisma.connectedSourceAccountRecord.update({
            where: { id: existing.id },
            data,
          })
        : await this.prisma.connectedSourceAccountRecord.create({
            data: {
              sourceId: source.id,
              externalAccountId: plaidAccount.externalAccountId,
              ...data,
            },
          });

      syncedAccounts.push(synced);
    }

    await this.prisma.connectedSourceAccountRecord.updateMany({
      where: {
        sourceId: source.id,
        externalAccountId: {
          notIn: plaidAccounts.map((account) => account.externalAccountId),
        },
      },
      data: {
        isActive: false,
      },
    });

    return syncedAccounts;
  }

  private assertManualStaticSource(source: ConnectedSourceRecord) {
    if (source.kind !== 'MANUAL_STATIC') {
      throw new BadRequestException(
        'Manual static accounts and valuations require a MANUAL_STATIC source.',
      );
    }
  }

  private assertPlaidBankSource(source: ConnectedSourceRecord) {
    if (source.kind !== 'BANK' || source.providerKey !== 'PLAID') {
      throw new BadRequestException(
        'Plaid bank sync requires a BANK source with providerKey PLAID.',
      );
    }
  }

  private selectLatestValuations(
    valuationRecords: ManualStaticValuationRecord[],
  ): ManualStaticValuation[] {
    const latestByAccountId = new Map<string, ManualStaticValuation>();

    valuationRecords.forEach((record) => {
      if (!latestByAccountId.has(record.sourceAccountId)) {
        latestByAccountId.set(
          record.sourceAccountId,
          mapValuationRecord(record),
        );
      }
    });

    return Array.from(latestByAccountId.values());
  }

  private toPortfolioCategory(
    category: string | undefined,
  ): PortfolioAssetCategory | undefined {
    switch (category) {
      case 'cash':
      case 'equity':
      case 'etf':
      case 'crypto':
      case 'fund':
      case 'other':
        return category;
      default:
        return undefined;
    }
  }
}
