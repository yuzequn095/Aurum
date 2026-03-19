import type { FinancialHealthScoreArtifact } from '@aurum/core';
import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CreateSnapshotFinancialHealthScoreRequest } from './create-snapshot-financial-health-score.request';
import { FinancialHealthScoresService } from './financial-health-scores.service';

@Controller('v1/portfolio-snapshots/:sourceSnapshotId/financial-health-scores')
@UseGuards(JwtAuthGuard)
export class PortfolioSnapshotFinancialHealthScoresController {
  constructor(private readonly service: FinancialHealthScoresService) {}

  @Post()
  async createFromSnapshot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sourceSnapshotId') sourceSnapshotId: string,
    @Body() body: CreateSnapshotFinancialHealthScoreRequest,
  ): Promise<FinancialHealthScoreArtifact> {
    return this.service.createScoreArtifactFromSnapshot({
      userId: user.userId,
      sourceSnapshotId,
      scoringVersion: body.scoringVersion,
    });
  }
}
