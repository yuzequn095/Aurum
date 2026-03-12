import type { AIReportArtifact } from '@aurum/core';
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { AIReportsService } from './ai-reports.service';

@Controller('v1/ai-reports')
export class AIReportsController {
  constructor(private readonly service: AIReportsService) {}

  @Post()
  async create(@Body() report: AIReportArtifact): Promise<AIReportArtifact> {
    return this.service.createReport(report);
  }

  @Get()
  async list(): Promise<AIReportArtifact[]> {
    return this.service.listReports();
  }

  @Get('by-snapshot/:sourceSnapshotId')
  async listBySourceSnapshotId(
    @Param('sourceSnapshotId') sourceSnapshotId: string,
  ): Promise<AIReportArtifact[]> {
    return this.service.listReportsBySourceSnapshotId(sourceSnapshotId);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<AIReportArtifact> {
    const report = await this.service.getReportById(id);
    if (!report) {
      throw new NotFoundException(`AI report not found: ${id}`);
    }

    return report;
  }
}
