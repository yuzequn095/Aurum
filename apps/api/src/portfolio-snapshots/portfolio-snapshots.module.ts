import { Module } from '@nestjs/common';
import { PortfolioSnapshotsController } from './portfolio-snapshots.controller';
import { PortfolioSnapshotsService } from './portfolio-snapshots.service';

@Module({
  controllers: [PortfolioSnapshotsController],
  providers: [PortfolioSnapshotsService],
  exports: [PortfolioSnapshotsService],
})
export class PortfolioSnapshotsModule {}
