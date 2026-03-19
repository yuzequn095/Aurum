import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { PortfolioSnapshot } from '@aurum/core';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PortfolioSnapshotsService } from './portfolio-snapshots.service';

@Controller('v1/portfolio-snapshots')
@UseGuards(JwtAuthGuard)
export class PortfolioSnapshotsController {
  constructor(private readonly service: PortfolioSnapshotsService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() snapshot: PortfolioSnapshot,
  ): Promise<PortfolioSnapshot> {
    return this.service.createSnapshot(snapshot, user.userId);
  }

  @Get()
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PortfolioSnapshot[]> {
    return this.service.listSnapshots(user.userId);
  }

  @Get(':id')
  async getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PortfolioSnapshot> {
    const snapshot = await this.service.getSnapshotById(id, user.userId);
    if (!snapshot) {
      throw new NotFoundException('Portfolio snapshot not found');
    }

    return snapshot;
  }

  @Delete(':id')
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ ok: true }> {
    const ok = await this.service.deleteSnapshot(id, user.userId);
    if (!ok) {
      throw new NotFoundException('Portfolio snapshot not found');
    }

    return { ok: true };
  }
}
