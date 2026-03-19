import type {
  ConnectedSource,
  ConnectedSourceAccount,
  ConnectedSyncRun,
} from '@aurum/core';
import { Injectable } from '@nestjs/common';
import type {
  ConnectedSourceAccountRecord,
  ConnectedSourceKind,
  ConnectedSourceRecord,
  ConnectedSourceStatus,
  ConnectedSyncRunRecord,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConnectedSourceDto } from './dto/create-connected-source.dto';
import { ListConnectedSourcesQueryDto } from './dto/list-connected-sources-query.dto';
import { UpdateConnectedSourceDto } from './dto/update-connected-source.dto';

function mapMetadata(
  value: Prisma.JsonValue | null,
): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return value as Record<string, unknown>;
}

function mapSourceRecord(record: ConnectedSourceRecord): ConnectedSource {
  return {
    id: record.id,
    userId: record.userId,
    kind: record.kind,
    providerKey: record.providerKey ?? undefined,
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
    accountType: record.accountType,
    currency: record.currency,
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

function mapKind(
  kind: ConnectedSourceKind | undefined,
): ConnectedSourceKind | undefined {
  return kind;
}

function mapStatus(
  status: ConnectedSourceStatus | undefined,
): ConnectedSourceStatus | undefined {
  return status;
}

@Injectable()
export class ConnectedFinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async listSources(
    userId: string,
    query: ListConnectedSourcesQueryDto,
  ): Promise<ConnectedSource[]> {
    const where: Prisma.ConnectedSourceRecordWhereInput = {
      userId,
      kind: mapKind(query.kind),
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
    const record = await this.prisma.connectedSourceRecord.findFirst({
      where: { id, userId },
    });

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

  private getOwnedSourceRecord(userId: string, id: string) {
    return this.prisma.connectedSourceRecord.findFirst({
      where: { id, userId },
    });
  }
}
