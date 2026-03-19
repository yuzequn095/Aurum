import type { FinancialHealthScoreArtifact } from '@aurum/core';
import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { FinancialHealthScoresService } from './financial-health-scores.service';

@Controller('v1/financial-health-scores')
export class FinancialHealthScoresController {
  constructor(private readonly service: FinancialHealthScoresService) {}

  @Get()
  async list(): Promise<FinancialHealthScoreArtifact[]> {
    return this.service.listScoreArtifacts();
  }

  @Get('by-snapshot/:sourceSnapshotId')
  async listBySourceSnapshotId(
    @Param('sourceSnapshotId') sourceSnapshotId: string,
  ): Promise<FinancialHealthScoreArtifact[]> {
    return this.service.listScoreArtifactsBySourceSnapshotId(sourceSnapshotId);
  }

  @Get(':id')
  async getById(
    @Param('id') id: string,
  ): Promise<FinancialHealthScoreArtifact> {
    const score = await this.service.getScoreArtifactById(id);
    if (!score) {
      throw new NotFoundException(`Financial health score not found: ${id}`);
    }

    return score;
  }
}
