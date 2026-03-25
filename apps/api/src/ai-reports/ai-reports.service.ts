import type { AIReportArtifact } from '@aurum/core';
import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { PortfolioSnapshotsService } from '../portfolio-snapshots/portfolio-snapshots.service';
import { PrismaService } from '../prisma/prisma.service';
import { mapAIReportRecordToArtifact } from './ai-report.mapper';
import type { CreateReportFromSnapshotCommand } from './commands/create-report-from-snapshot.command';
import type { AIEntitlementFeatureKey } from '../entitlements/entitlements.types';

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
    private readonly entitlementsService: EntitlementsService,
    private readonly portfolioSnapshotsService: PortfolioSnapshotsService,
  ) {}

  async createReport(
    report: AIReportArtifact,
    userId: string,
  ): Promise<AIReportArtifact> {
    return this.createOwnedSnapshotReport(
      report,
      userId,
      'ai.report.snapshot_portfolio_report',
    );
  }

  async createMonthlyFinancialReviewReport(input: {
    userId: string;
    sourceSnapshotId: string;
    title: string;
    contentMarkdown: string;
    promptVersion: string;
    sourceRunId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AIReportArtifact> {
    return this.createPresetSnapshotReport(
      {
        userId: input.userId,
        reportType: 'monthly_financial_review_v1',
        taskType: 'monthly_financial_review_v1',
        sourceSnapshotId: input.sourceSnapshotId,
        title: input.title,
        contentMarkdown: input.contentMarkdown,
        promptVersion: input.promptVersion,
        sourceRunId: input.sourceRunId,
        metadata: input.metadata,
      },
      'ai.report.monthly_financial_review',
      'monthly-review',
    );
  }

  async createDailyMarketBriefReport(input: {
    userId: string;
    sourceSnapshotId: string;
    title: string;
    contentMarkdown: string;
    promptVersion: string;
    sourceRunId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AIReportArtifact> {
    return this.createPresetSnapshotReport(
      {
        userId: input.userId,
        reportType: 'daily_market_brief_v1',
        taskType: 'daily_market_brief_v1',
        sourceSnapshotId: input.sourceSnapshotId,
        title: input.title,
        contentMarkdown: input.contentMarkdown,
        promptVersion: input.promptVersion,
        sourceRunId: input.sourceRunId,
        metadata: input.metadata,
      },
      'ai.report.daily_market_brief',
      'daily-market-brief',
    );
  }

  async getReportById(
    id: string,
    userId: string,
  ): Promise<AIReportArtifact | null> {
    const found = await this.prisma.aIReportRecord.findFirst({
      where: {
        id,
        sourceSnapshot: {
          is: {
            userId,
          },
        },
      },
    });

    if (!found) {
      return null;
    }

    return mapAIReportRecordToArtifact(found);
  }

  async listReports(userId: string): Promise<AIReportArtifact[]> {
    const records = await this.prisma.aIReportRecord.findMany({
      where: {
        sourceSnapshot: {
          is: {
            userId,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return records.map(mapAIReportRecordToArtifact);
  }

  async listReportsBySourceSnapshotId(
    sourceSnapshotId: string,
    userId: string,
  ): Promise<AIReportArtifact[]> {
    const records = await this.prisma.aIReportRecord.findMany({
      where: {
        sourceSnapshotId,
        sourceSnapshot: {
          is: {
            userId,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    return records.map(mapAIReportRecordToArtifact);
  }

  async createReportFromSnapshot(
    command: CreateReportFromSnapshotCommand,
  ): Promise<AIReportArtifact> {
    const snapshot = await this.requireOwnedSnapshot(
      command.sourceSnapshotId,
      command.userId,
      'ai.report.snapshot_portfolio_report',
    );

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

    return this.persistReport({
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

  private async createPresetSnapshotReport(
    input: {
      userId: string;
      reportType: AIReportArtifact['reportType'];
      taskType: AIReportArtifact['taskType'];
      sourceSnapshotId: string;
      title: string;
      contentMarkdown: string;
      promptVersion: string;
      sourceRunId?: string;
      metadata?: Record<string, unknown>;
    },
    featureKey: AIEntitlementFeatureKey,
    sourceRunPrefix: string,
  ): Promise<AIReportArtifact> {
    const now = new Date().toISOString();

    return this.createOwnedSnapshotReport(
      {
        id: randomUUID(),
        reportType: input.reportType,
        taskType: input.taskType,
        sourceRunId:
          input.sourceRunId?.trim() ||
          `${sourceRunPrefix}:${input.sourceSnapshotId}:${now}`,
        sourceSnapshotId: input.sourceSnapshotId,
        title: input.title,
        contentMarkdown: input.contentMarkdown,
        promptVersion: input.promptVersion,
        createdAt: now,
        updatedAt: now,
        metadata: input.metadata,
      },
      input.userId,
      featureKey,
    );
  }

  private async createOwnedSnapshotReport(
    report: AIReportArtifact,
    userId: string,
    featureKey: AIEntitlementFeatureKey,
  ): Promise<AIReportArtifact> {
    if (!report.sourceSnapshotId?.trim()) {
      throw new BadRequestException(
        'AI report must reference a source portfolio snapshot.',
      );
    }

    await this.requireOwnedSnapshot(
      report.sourceSnapshotId,
      userId,
      featureKey,
    );

    return this.persistReport(report);
  }

  private async requireOwnedSnapshot(
    sourceSnapshotId: string,
    userId: string,
    featureKey: AIEntitlementFeatureKey,
  ) {
    await this.entitlementsService.assertFeatureEnabled(userId, featureKey);

    const snapshot = await this.portfolioSnapshotsService.getSnapshotById(
      sourceSnapshotId,
      userId,
    );
    if (!snapshot) {
      throw new NotFoundException(
        `Portfolio snapshot not found: ${sourceSnapshotId}`,
      );
    }

    return snapshot;
  }

  private async persistReport(
    report: AIReportArtifact,
  ): Promise<AIReportArtifact> {
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
}
