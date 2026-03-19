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
  BankLinkTokenResult,
  BankSourceConnectionResult,
  BankSyncMaterializationResult,
  ConnectedSource,
  ConnectedSourceAccount,
  ConnectedSyncRun,
  ManualStaticSnapshotMaterializationResult,
  ManualStaticValuation,
  PortfolioSnapshot,
} from '@aurum/core';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConnectedFinanceService } from './connected-finance.service';
import { CreateConnectedSourceAccountDto } from './dto/create-connected-source-account.dto';
import { CreateConnectedSourceDto } from './dto/create-connected-source.dto';
import { CreateManualStaticValuationDto } from './dto/create-manual-static-valuation.dto';
import { ExchangePlaidPublicTokenDto } from './dto/exchange-plaid-public-token.dto';
import { ListConnectedSourcesQueryDto } from './dto/list-connected-sources-query.dto';
import { MaterializeManualStaticSnapshotDto } from './dto/materialize-manual-static-snapshot.dto';
import { UpdateConnectedSourceAccountDto } from './dto/update-connected-source-account.dto';
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

  @Post('bank/plaid/link-token')
  async createPlaidLinkToken(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<BankLinkTokenResult> {
    return this.service.createPlaidLinkToken(user.userId);
  }

  @Post('bank/plaid/exchange-public-token')
  async exchangePlaidPublicToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ExchangePlaidPublicTokenDto,
  ): Promise<BankSourceConnectionResult> {
    return this.service.exchangePlaidPublicToken(user.userId, dto);
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

  @Post('sources/:id/accounts')
  async createSourceAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateConnectedSourceAccountDto,
  ): Promise<ConnectedSourceAccount> {
    const account = await this.service.createSourceAccount(
      user.userId,
      id,
      dto,
    );
    if (!account) {
      throw new NotFoundException('Connected source not found');
    }

    return account;
  }

  @Patch('accounts/:accountId')
  async updateSourceAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateConnectedSourceAccountDto,
  ): Promise<ConnectedSourceAccount> {
    const account = await this.service.updateSourceAccount(
      user.userId,
      accountId,
      dto,
    );
    if (!account) {
      throw new NotFoundException('Connected source account not found');
    }

    return account;
  }

  @Get('accounts/:accountId/manual-valuations')
  async listManualStaticValuations(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountId') accountId: string,
  ): Promise<ManualStaticValuation[]> {
    const valuations = await this.service.listManualStaticValuations(
      user.userId,
      accountId,
    );
    if (!valuations) {
      throw new NotFoundException('Connected source account not found');
    }

    return valuations;
  }

  @Post('accounts/:accountId/manual-valuations')
  async createManualStaticValuation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('accountId') accountId: string,
    @Body() dto: CreateManualStaticValuationDto,
  ): Promise<ManualStaticValuation> {
    const valuation = await this.service.createManualStaticValuation(
      user.userId,
      accountId,
      dto,
    );
    if (!valuation) {
      throw new NotFoundException('Connected source account not found');
    }

    return valuation;
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

  @Post('sources/:id/sync')
  async syncSource(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<BankSyncMaterializationResult> {
    const result = await this.service.syncBankSource(user.userId, id);
    if (!result) {
      throw new NotFoundException('Connected source not found');
    }

    return result;
  }

  @Get('sources/:id/snapshots')
  async listSourceSnapshots(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PortfolioSnapshot[]> {
    const snapshots = await this.service.listSourceSnapshots(user.userId, id);
    if (!snapshots) {
      throw new NotFoundException('Connected source not found');
    }

    return snapshots;
  }

  @Post('sources/:id/materialize-snapshot')
  async materializeManualStaticSnapshot(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: MaterializeManualStaticSnapshotDto,
  ): Promise<ManualStaticSnapshotMaterializationResult> {
    const result = await this.service.materializeManualStaticSnapshot(
      user.userId,
      id,
      dto,
    );
    if (!result) {
      throw new NotFoundException('Connected source not found');
    }

    return result;
  }
}
