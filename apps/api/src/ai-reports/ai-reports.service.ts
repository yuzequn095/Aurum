import type { AIReportArtifact } from '@aurum/core';
import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { mapAIReportRecordToArtifact } from './ai-report.mapper';

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
  constructor(private readonly prisma: PrismaService) {}

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
}
