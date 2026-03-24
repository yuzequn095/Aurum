import { Module } from '@nestjs/common';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { PortfolioSnapshotsModule } from '../portfolio-snapshots/portfolio-snapshots.module';
import { AIReportsController } from './ai-reports.controller';
import { AIReportsService } from './ai-reports.service';
import { PortfolioSnapshotReportsController } from './portfolio-snapshot-reports.controller';

@Module({
  imports: [PortfolioSnapshotsModule, EntitlementsModule],
  controllers: [AIReportsController, PortfolioSnapshotReportsController],
  providers: [AIReportsService],
  exports: [AIReportsService],
})
export class AIReportsModule {}
