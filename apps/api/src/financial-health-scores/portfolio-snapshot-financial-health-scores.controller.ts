import type { FinancialHealthScoreArtifact } from '@aurum/core';
import { Body, Controller, Param, Post } from '@nestjs/common';
import type { CreateSnapshotFinancialHealthScoreRequest } from './create-snapshot-financial-health-score.request';
import { FinancialHealthScoresService } from './financial-health-scores.service';

@Controller('v1/portfolio-snapshots/:sourceSnapshotId/financial-health-scores')
export class PortfolioSnapshotFinancialHealthScoresController {
  constructor(private readonly service: FinancialHealthScoresService) {}

  @Post()
  async createFromSnapshot(
    @Param('sourceSnapshotId') sourceSnapshotId: string,
    @Body() body: CreateSnapshotFinancialHealthScoreRequest,
  ): Promise<FinancialHealthScoreArtifact> {
    return this.service.createScoreArtifactFromSnapshot({
      sourceSnapshotId,
      scoringVersion: body.scoringVersion,
    });
  }
}
