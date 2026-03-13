import { Module } from '@nestjs/common';
import { PortfolioSnapshotsModule } from '../portfolio-snapshots/portfolio-snapshots.module';
import { PortfolioSnapshotFinancialHealthScoresController } from './portfolio-snapshot-financial-health-scores.controller';
import { FinancialHealthScoresService } from './financial-health-scores.service';

@Module({
  imports: [PortfolioSnapshotsModule],
  controllers: [PortfolioSnapshotFinancialHealthScoresController],
  providers: [FinancialHealthScoresService],
  exports: [FinancialHealthScoresService],
})
export class FinancialHealthScoresModule {}
