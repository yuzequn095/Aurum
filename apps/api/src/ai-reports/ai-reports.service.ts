import type { AIReportArtifact } from '@aurum/core';
import { randomUUID } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PortfolioSnapshotsService } from '../portfolio-snapshots/portfolio-snapshots.service';
import { PrismaService } from '../prisma/prisma.service';
import { mapAIReportRecordToArtifact } from './ai-report.mapper';
import type { CreateReportFromSnapshotCommand } from './commands/create-report-from-snapshot.command';

function mapMetadataToPrisma(
  metadata: AIReportArtifact['metadata'],
): Prisma.InputJsonValue | undefined {
  if (!metadata) {
    return undefined;
  }

  return metadata as Prisma.InputJsonValue;
}

@Injectable()
export class AIReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolioSnapshotsService: PortfolioSnapshotsService,
  ) {}

  async createReport(report: AIReportArtifact): Promise<AIReportArtifact> {
    const created = await this.prisma.aIReportRecord.create({
      data: {
        id: report.id,
        reportType: report.reportType,
        taskType: report.taskType,
        sourceRunId: report.sourceRunId,
        sourceSnapshotId: report.sourceSnapshotId,
        title: report.title,
        contentMarkdown: report.contentMarkdown,
        promptVersion: report.promptVersion,
        metadata: mapMetadataToPrisma(report.metadata),
        createdAt: new Date(report.createdAt),
        updatedAt: new Date(report.updatedAt),
      },
    });

    return mapAIReportRecordToArtifact(created);
  }

  async getReportById(id: string): Promise<AIReportArtifact | null> {
    const found = await this.prisma.aIReportRecord.findUnique({
      where: { id },
    });

    if (!found) {
      return null;
    }

    return mapAIReportRecordToArtifact(found);
  }

  async listReports(): Promise<AIReportArtifact[]> {
    const records = await this.prisma.aIReportRecord.findMany({
      orderBy: [{ createdAt: 'desc' }],
    });

    return records.map(mapAIReportRecordToArtifact);
  }

  async listReportsBySourceSnapshotId(
    sourceSnapshotId: string,
  ): Promise<AIReportArtifact[]> {
    const records = await this.prisma.aIReportRecord.findMany({
      where: { sourceSnapshotId },
      orderBy: [{ createdAt: 'desc' }],
    });

    return records.map(mapAIReportRecordToArtifact);
  }

  async createReportFromSnapshot(
    command: CreateReportFromSnapshotCommand,
  ): Promise<AIReportArtifact> {
    const snapshot = await this.portfolioSnapshotsService.getSnapshotById(
      command.sourceSnapshotId,
      command.userId,
    );
    if (!snapshot) {
      throw new NotFoundException(
        `Portfolio snapshot not found: ${command.sourceSnapshotId}`,
      );
    }

    const now = new Date().toISOString();
    const portfolioName = snapshot.metadata.portfolioName?.trim() || undefined;
    const snapshotDate = snapshot.metadata.snapshotDate;

    const title = portfolioName
      ? `${portfolioName} - Portfolio Report`
      : 'Portfolio Report';

    const sourceRunId = command.sourceRunId?.trim()
      ? command.sourceRunId
      : `snapshot:${command.sourceSnapshotId}:${now}`;

    const metadata: Record<string, unknown> = {
      sourceTaskType: 'portfolio_report_v1',
      sourceSnapshotId: command.sourceSnapshotId,
    };
    if (portfolioName) {
      metadata.portfolioName = portfolioName;
    }
    if (snapshotDate) {
      metadata.snapshotDate = snapshotDate;
    }

    return this.createReport({
      id: randomUUID(),
      reportType: 'portfolio_report_v1',
      taskType: 'portfolio_report_v1',
      sourceRunId,
      sourceSnapshotId: command.sourceSnapshotId,
      title,
      contentMarkdown: command.contentMarkdown,
      promptVersion: command.promptVersion,
      createdAt: now,
      updatedAt: now,
      metadata,
    });
  }
}
