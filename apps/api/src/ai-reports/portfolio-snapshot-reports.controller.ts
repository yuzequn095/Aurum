import type { AIReportArtifact } from '@aurum/core';
import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AIReportsService } from './ai-reports.service';
import type { CreateSnapshotReportRequest } from './create-snapshot-report.request';

@Controller('v1/portfolio-snapshots/:sourceSnapshotId/reports')
@UseGuards(JwtAuthGuard)
export class PortfolioSnapshotReportsController {
  constructor(private readonly service: AIReportsService) {}

  @Post()
  async createFromSnapshot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sourceSnapshotId') sourceSnapshotId: string,
    @Body() body: CreateSnapshotReportRequest,
  ): Promise<AIReportArtifact> {
    return this.service.createReportFromSnapshot({
      userId: user.userId,
      sourceSnapshotId,
      contentMarkdown: body.contentMarkdown,
      promptVersion: body.promptVersion,
      sourceRunId: body.sourceRunId,
    });
  }
}
