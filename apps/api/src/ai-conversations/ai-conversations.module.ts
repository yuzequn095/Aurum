import { Module } from '@nestjs/common';
import { AIReportsModule } from '../ai-reports/ai-reports.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { FinancialHealthScoresModule } from '../financial-health-scores/financial-health-scores.module';
import { PortfolioSnapshotsModule } from '../portfolio-snapshots/portfolio-snapshots.module';
import { AIConversationsController } from './ai-conversations.controller';
import { AIConversationsService } from './ai-conversations.service';

@Module({
  imports: [
    PortfolioSnapshotsModule,
    AIReportsModule,
    FinancialHealthScoresModule,
    EntitlementsModule,
  ],
  controllers: [AIConversationsController],
  providers: [AIConversationsService],
  exports: [AIConversationsService],
})
export class AIConversationsModule {}
