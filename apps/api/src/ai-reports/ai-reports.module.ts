import { Module } from '@nestjs/common';
import { PortfolioSnapshotsModule } from '../portfolio-snapshots/portfolio-snapshots.module';
import { AIReportsController } from './ai-reports.controller';
import { AIReportsService } from './ai-reports.service';

@Module({
  imports: [PortfolioSnapshotsModule],
  controllers: [AIReportsController],
  providers: [AIReportsService],
  exports: [AIReportsService],
})
export class AIReportsModule {}
