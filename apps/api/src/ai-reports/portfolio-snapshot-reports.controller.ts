import type { AIReportArtifact } from '@aurum/core';
import { Body, Controller, Param, Post } from '@nestjs/common';
import { AIReportsService } from './ai-reports.service';
import type { CreateSnapshotReportRequest } from './create-snapshot-report.request';

@Controller('v1/portfolio-snapshots/:sourceSnapshotId/reports')
export class PortfolioSnapshotReportsController {
  constructor(private readonly service: AIReportsService) {}

  @Post()
  async createFromSnapshot(
    @Param('sourceSnapshotId') sourceSnapshotId: string,
    @Body() body: CreateSnapshotReportRequest,
  ): Promise<AIReportArtifact> {
    return this.service.createReportFromSnapshot({
      sourceSnapshotId,
      contentMarkdown: body.contentMarkdown,
      promptVersion: body.promptVersion,
      sourceRunId: body.sourceRunId,
    });
  }
}
