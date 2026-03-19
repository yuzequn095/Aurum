import { Module } from '@nestjs/common';
import { PortfolioSnapshotsModule } from '../portfolio-snapshots/portfolio-snapshots.module';
import { ConnectedFinanceController } from './connected-finance.controller';
import { ConnectedFinanceService } from './connected-finance.service';

@Module({
  imports: [PortfolioSnapshotsModule],
  controllers: [ConnectedFinanceController],
  providers: [ConnectedFinanceService],
  exports: [ConnectedFinanceService],
})
export class ConnectedFinanceModule {}
