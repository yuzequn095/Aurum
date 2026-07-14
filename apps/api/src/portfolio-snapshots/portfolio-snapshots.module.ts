import { Module } from '@nestjs/common';
import { PortfolioSnapshotsController } from './portfolio-snapshots.controller';
import { PortfolioAIContextService } from './portfolio-ai-context.service';
import { PortfolioSnapshotsService } from './portfolio-snapshots.service';

@Module({
  controllers: [PortfolioSnapshotsController],
  providers: [PortfolioSnapshotsService, PortfolioAIContextService],
  exports: [PortfolioSnapshotsService, PortfolioAIContextService],
})
export class PortfolioSnapshotsModule {}
