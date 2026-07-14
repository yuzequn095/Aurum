import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  PortfolioSnapshot,
  PortfolioSnapshotDelta,
  PortfolioDiagnostics,
  PortfolioSnapshotLineage,
  PortfolioAssetCategory,
  PortfolioHistoryScope,
  PortfolioHistorySeries,
} from '@aurum/core';
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

  @Get('history')
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('scope') scope: PortfolioHistoryScope = 'consolidated',
    @Query('sourceId') sourceId?: string,
    @Query('sourceAccountId') sourceAccountId?: string,
    @Query('assetCategory') assetCategory?: PortfolioAssetCategory,
    @Query('limit') limitValue?: string,
  ): Promise<PortfolioHistorySeries> {
    const supportedScopes: PortfolioHistoryScope[] = [
      'consolidated',
      'source',
      'account',
      'asset_category',
    ];
    const supportedCategories: PortfolioAssetCategory[] = [
      'cash',
      'equity',
      'etf',
      'crypto',
      'fund',
      'other',
    ];
    if (!supportedScopes.includes(scope)) {
      throw new BadRequestException('Unsupported portfolio history scope.');
    }
    if (assetCategory && !supportedCategories.includes(assetCategory)) {
      throw new BadRequestException('Unsupported portfolio asset category.');
    }
    const limit = limitValue === undefined ? undefined : Number(limitValue);
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1)) {
      throw new BadRequestException('limit must be a positive integer.');
    }

    return this.service.getPortfolioHistory(
      { scope, sourceId, sourceAccountId, assetCategory, limit },
      user.userId,
    );
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

  @Get(':id/lineage')
  async getLineage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PortfolioSnapshotLineage> {
    const lineage = await this.service.getSnapshotLineage(id, user.userId);
    if (!lineage) {
      throw new NotFoundException('Portfolio snapshot not found');
    }

    return lineage;
  }

  @Get(':id/delta')
  async getDelta(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('compareTo') compareTo: string = 'previous',
  ): Promise<PortfolioSnapshotDelta> {
    const delta = await this.service.getSnapshotDelta(
      id,
      compareTo,
      user.userId,
    );
    if (!delta) {
      throw new NotFoundException('Portfolio snapshot not found');
    }

    return delta;
  }

  @Get(':id/diagnostics')
  async getDiagnostics(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PortfolioDiagnostics> {
    const diagnostics = await this.service.getSnapshotDiagnostics(
      id,
      user.userId,
    );
    if (!diagnostics) {
      throw new NotFoundException('Portfolio snapshot not found');
    }

    return diagnostics;
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
