import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PortfolioSnapshotsModule } from '../portfolio-snapshots/portfolio-snapshots.module';
import { ConnectedSourceSecretsService } from './connected-source-secrets.service';
import { ConnectedFinanceController } from './connected-finance.controller';
import { ConnectedFinanceService } from './connected-finance.service';
import { CoinbaseCryptoAdapter } from './providers/coinbase/coinbase-crypto.adapter';
import { CoinbaseClient } from './providers/coinbase/coinbase.client';
import { PlaidBankAdapter } from './providers/plaid/plaid-bank.adapter';
import { PlaidClient } from './providers/plaid/plaid.client';
import { SnapTradeBrokerageAdapter } from './providers/snaptrade/snaptrade-brokerage.adapter';
import { SnapTradeClient } from './providers/snaptrade/snaptrade.client';

@Module({
  imports: [PortfolioSnapshotsModule, ConfigModule],
  controllers: [ConnectedFinanceController],
  providers: [
    ConnectedFinanceService,
    ConnectedSourceSecretsService,
    CoinbaseClient,
    CoinbaseCryptoAdapter,
    PlaidClient,
    PlaidBankAdapter,
    SnapTradeClient,
    SnapTradeBrokerageAdapter,
  ],
  exports: [ConnectedFinanceService],
})
export class ConnectedFinanceModule {}
