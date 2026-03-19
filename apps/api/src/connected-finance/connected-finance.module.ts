import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PortfolioSnapshotsModule } from '../portfolio-snapshots/portfolio-snapshots.module';
import { ConnectedSourceSecretsService } from './connected-source-secrets.service';
import { ConnectedFinanceController } from './connected-finance.controller';
import { ConnectedFinanceService } from './connected-finance.service';
import { PlaidBankAdapter } from './providers/plaid/plaid-bank.adapter';
import { PlaidClient } from './providers/plaid/plaid.client';

@Module({
  imports: [PortfolioSnapshotsModule, ConfigModule],
  controllers: [ConnectedFinanceController],
  providers: [
    ConnectedFinanceService,
    ConnectedSourceSecretsService,
    PlaidClient,
    PlaidBankAdapter,
  ],
  exports: [ConnectedFinanceService],
})
export class ConnectedFinanceModule {}
