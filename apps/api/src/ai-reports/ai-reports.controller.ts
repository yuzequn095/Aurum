import type { AIReportArtifact } from '@aurum/core';
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AIReportsService } from './ai-reports.service';

@Controller('v1/ai-reports')
@UseGuards(JwtAuthGuard)
export class AIReportsController {
  constructor(private readonly service: AIReportsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() report: AIReportArtifact,
  ): Promise<AIReportArtifact> {
    return this.service.createReport(report, user.userId);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AIReportArtifact[]> {
    return this.service.listReports(user.userId);
  }

  @Get('by-snapshot/:sourceSnapshotId')
  async listBySourceSnapshotId(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sourceSnapshotId') sourceSnapshotId: string,
  ): Promise<AIReportArtifact[]> {
    return this.service.listReportsBySourceSnapshotId(
      sourceSnapshotId,
      user.userId,
    );
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<AIReportArtifact> {
    const report = await this.service.getReportById(id, user.userId);
    if (!report) {
      throw new NotFoundException(`AI report not found: ${id}`);
    }

    return report;
  }
}
