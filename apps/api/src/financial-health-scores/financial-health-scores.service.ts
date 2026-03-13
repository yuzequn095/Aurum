import type { FinancialHealthScoreArtifact } from '@aurum/core';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { mapFinancialHealthScoreRecordToArtifact } from './financial-health-score.mapper';

function mapToPrismaJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function mapMetadataToPrisma(
  metadata: FinancialHealthScoreArtifact['metadata'],
): Prisma.InputJsonValue | undefined {
  if (!metadata) {
    return undefined;
  }

  return metadata as Prisma.InputJsonValue;
}

@Injectable()
export class FinancialHealthScoresService {
  constructor(private readonly prisma: PrismaService) {}

  async createScoreArtifact(
    artifact: FinancialHealthScoreArtifact,
  ): Promise<FinancialHealthScoreArtifact> {
    const created = await this.prisma.financialHealthScoreRecord.create({
      data: {
        id: artifact.id,
        sourceSnapshotId: artifact.sourceSnapshotId,
        scoringVersion: artifact.scoringVersion,
        result: mapToPrismaJson(artifact.result),
        insight: mapToPrismaJson(artifact.insight),
        metadata: mapMetadataToPrisma(artifact.metadata),
        createdAt: new Date(artifact.createdAt),
        updatedAt: new Date(artifact.updatedAt),
      },
    });

    return mapFinancialHealthScoreRecordToArtifact(created);
  }

  async getScoreArtifactById(
    id: string,
  ): Promise<FinancialHealthScoreArtifact | null> {
    const found = await this.prisma.financialHealthScoreRecord.findUnique({
      where: { id },
    });

    if (!found) {
      return null;
    }

    return mapFinancialHealthScoreRecordToArtifact(found);
  }

  async listScoreArtifacts(): Promise<FinancialHealthScoreArtifact[]> {
    const records = await this.prisma.financialHealthScoreRecord.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });

    return records.map(mapFinancialHealthScoreRecordToArtifact);
  }

  async listScoreArtifactsBySourceSnapshotId(
    sourceSnapshotId: string,
  ): Promise<FinancialHealthScoreArtifact[]> {
    const records = await this.prisma.financialHealthScoreRecord.findMany({
      where: { sourceSnapshotId },
      orderBy: [{ createdAt: 'desc' }],
    });

    return records.map(mapFinancialHealthScoreRecordToArtifact);
  }
}
