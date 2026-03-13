import { Module } from '@nestjs/common';
import { PortfolioSnapshotsModule } from '../portfolio-snapshots/portfolio-snapshots.module';
import { AIReportsController } from './ai-reports.controller';
import { AIReportsService } from './ai-reports.service';
import { PortfolioSnapshotReportsController } from './portfolio-snapshot-reports.controller';

@Module({
  imports: [PortfolioSnapshotsModule],
  controllers: [AIReportsController, PortfolioSnapshotReportsController],
  providers: [AIReportsService],
  exports: [AIReportsService],
})
export class AIReportsModule {}
