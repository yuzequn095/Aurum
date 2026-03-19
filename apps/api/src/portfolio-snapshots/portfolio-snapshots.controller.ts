import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import type { PortfolioSnapshot } from '@aurum/core';
import { PortfolioSnapshotsService } from './portfolio-snapshots.service';

@Controller('v1/portfolio-snapshots')
export class PortfolioSnapshotsController {
  constructor(private readonly service: PortfolioSnapshotsService) {}

  @Post()
  async create(
    @Body() snapshot: PortfolioSnapshot,
  ): Promise<PortfolioSnapshot> {
    return this.service.createSnapshot(snapshot);
  }

  @Get()
  async list(): Promise<PortfolioSnapshot[]> {
    return this.service.listSnapshots();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<PortfolioSnapshot> {
    const snapshot = await this.service.getSnapshotById(id);
    if (!snapshot) {
      throw new NotFoundException('Portfolio snapshot not found');
    }

    return snapshot;
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<{ ok: true }> {
    const ok = await this.service.deleteSnapshot(id);
    if (!ok) {
      throw new NotFoundException('Portfolio snapshot not found');
    }

    return { ok: true };
  }
}
