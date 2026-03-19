import { Module } from '@nestjs/common';
import { ConnectedFinanceController } from './connected-finance.controller';
import { ConnectedFinanceService } from './connected-finance.service';

@Module({
  controllers: [ConnectedFinanceController],
  providers: [ConnectedFinanceService],
  exports: [ConnectedFinanceService],
})
export class ConnectedFinanceModule {}
