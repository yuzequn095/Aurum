import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type {
  ConnectedSource,
  ConnectedSourceAccount,
  ConnectedSyncRun,
} from '@aurum/core';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConnectedFinanceService } from './connected-finance.service';
import { CreateConnectedSourceDto } from './dto/create-connected-source.dto';
import { ListConnectedSourcesQueryDto } from './dto/list-connected-sources-query.dto';
import { UpdateConnectedSourceDto } from './dto/update-connected-source.dto';

@Controller('v1/connected-finance')
@UseGuards(JwtAuthGuard)
export class ConnectedFinanceController {
  constructor(private readonly service: ConnectedFinanceService) {}

  @Get('sources')
  async listSources(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListConnectedSourcesQueryDto,
  ): Promise<ConnectedSource[]> {
    return this.service.listSources(user.userId, query);
  }

  @Post('sources')
  async createSource(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateConnectedSourceDto,
  ): Promise<ConnectedSource> {
    return this.service.createSource(user.userId, dto);
  }

  @Get('sources/:id')
  async getSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ConnectedSource> {
    const source = await this.service.getSourceById(user.userId, id);
    if (!source) {
      throw new NotFoundException('Connected source not found');
    }

    return source;
  }

  @Patch('sources/:id')
  async updateSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateConnectedSourceDto,
  ): Promise<ConnectedSource> {
    const source = await this.service.updateSource(user.userId, id, dto);
    if (!source) {
      throw new NotFoundException('Connected source not found');
    }

    return source;
  }

  @Get('sources/:id/accounts')
  async listSourceAccounts(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ConnectedSourceAccount[]> {
    const accounts = await this.service.listSourceAccounts(user.userId, id);
    if (!accounts) {
      throw new NotFoundException('Connected source not found');
    }

    return accounts;
  }

  @Get('sources/:id/sync-runs')
  async listSourceSyncRuns(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ConnectedSyncRun[]> {
    const syncRuns = await this.service.listSourceSyncRuns(user.userId, id);
    if (!syncRuns) {
      throw new NotFoundException('Connected source not found');
    }

    return syncRuns;
  }
}
