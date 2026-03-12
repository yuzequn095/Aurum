import { Module } from '@nestjs/common';
import { PortfolioSnapshotsService } from './portfolio-snapshots.service';

@Module({
  providers: [PortfolioSnapshotsService],
  exports: [PortfolioSnapshotsService],
})
export class PortfolioSnapshotsModule {}
