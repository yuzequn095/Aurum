import { Module } from '@nestjs/common';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { PortfolioSnapshotsModule } from '../portfolio-snapshots/portfolio-snapshots.module';
import { FinancialHealthScoresController } from './financial-health-scores.controller';
import { PortfolioSnapshotFinancialHealthScoresController } from './portfolio-snapshot-financial-health-scores.controller';
import { FinancialHealthScoresService } from './financial-health-scores.service';

@Module({
  imports: [PortfolioSnapshotsModule, EntitlementsModule],
  controllers: [
    FinancialHealthScoresController,
    PortfolioSnapshotFinancialHealthScoresController,
  ],
  providers: [FinancialHealthScoresService],
  exports: [FinancialHealthScoresService],
})
export class FinancialHealthScoresModule {}
