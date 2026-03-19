import {
  buildFinancialHealthInsight,
  calculateFinancialHealthScore,
  portfolioSnapshotToFinancialHealthScoreInput,
} from '../../../../packages/core/src/index';
import type { FinancialHealthScoreArtifact } from '@aurum/core';
import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PortfolioSnapshotsService } from '../portfolio-snapshots/portfolio-snapshots.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateScoreArtifactFromSnapshotCommand } from './commands/create-score-artifact-from-snapshot.command';
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolioSnapshotsService: PortfolioSnapshotsService,
  ) {}

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

  async createScoreArtifactFromSnapshot(
    command: CreateScoreArtifactFromSnapshotCommand,
  ): Promise<FinancialHealthScoreArtifact> {
    const snapshot = await this.portfolioSnapshotsService.getSnapshotById(
      command.sourceSnapshotId,
      command.userId,
    );
    if (!snapshot) {
      throw new NotFoundException(
        `Portfolio snapshot not found: ${command.sourceSnapshotId}`,
      );
    }

    const scoreInput = portfolioSnapshotToFinancialHealthScoreInput(snapshot);
    const result = calculateFinancialHealthScore(scoreInput);
    const insight = buildFinancialHealthInsight(result);

    const now = new Date().toISOString();
    const scoringVersion = command.scoringVersion?.trim() || '1.0.0';
    const portfolioName = snapshot.metadata.portfolioName?.trim() || undefined;

    const metadata: Record<string, unknown> = {
      sourceSnapshotId: command.sourceSnapshotId,
      snapshotDate: snapshot.metadata.snapshotDate,
    };
    if (portfolioName) {
      metadata.portfolioName = portfolioName;
    }

    return this.createScoreArtifact({
      id: randomUUID(),
      sourceSnapshotId: command.sourceSnapshotId,
      scoringVersion,
      result,
      insight,
      createdAt: now,
      updatedAt: now,
      metadata,
    });
  }
}
