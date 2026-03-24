import type { FinancialHealthScoreArtifact } from '@aurum/core';
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinancialHealthScoresService } from './financial-health-scores.service';

@Controller('v1/financial-health-scores')
@UseGuards(JwtAuthGuard)
export class FinancialHealthScoresController {
  constructor(private readonly service: FinancialHealthScoresService) {}

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<FinancialHealthScoreArtifact[]> {
    return this.service.listScoreArtifacts(user.userId);
  }

  @Get('by-snapshot/:sourceSnapshotId')
  async listBySourceSnapshotId(
    @CurrentUser() user: AuthenticatedUser,
    @Param('sourceSnapshotId') sourceSnapshotId: string,
  ): Promise<FinancialHealthScoreArtifact[]> {
    return this.service.listScoreArtifactsBySourceSnapshotId(
      sourceSnapshotId,
      user.userId,
    );
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<FinancialHealthScoreArtifact> {
    const score = await this.service.getScoreArtifactById(id, user.userId);
    if (!score) {
      throw new NotFoundException(`Financial health score not found: ${id}`);
    }

    return score;
  }
}
