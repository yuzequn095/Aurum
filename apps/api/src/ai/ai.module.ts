import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AIReportsModule } from '../ai-reports/ai-reports.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { FinancialHealthScoresModule } from '../financial-health-scores/financial-health-scores.module';
import { PortfolioSnapshotsModule } from '../portfolio-snapshots/portfolio-snapshots.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { HybridInsightEngine } from './insights/hybrid-insight.engine';
import type { InsightEngine } from './insights/insight-engine.interface';
import { INSIGHT_ENGINE } from './insights/insight-engine.token';
import { OpenAiCompatibleLlmClient } from './insights/llm/llm-client';
import { LLMInsightEngine } from './insights/llm-insight.engine';
import { RuleInsightEngine } from './insights/rule-insight.engine';
import { OpenAiCompatibleChatClient } from './quick-chat/openai-compatible-chat.client';
import { QuickChatService } from './quick-chat/quick-chat.service';

@Module({
  imports: [
    AnalyticsModule,
    ConfigModule,
    EntitlementsModule,
    PortfolioSnapshotsModule,
    AIReportsModule,
    FinancialHealthScoresModule,
  ],
  controllers: [AiController],
  providers: [
    RuleInsightEngine,
    OpenAiCompatibleLlmClient,
    OpenAiCompatibleChatClient,
    LLMInsightEngine,
    HybridInsightEngine,
    QuickChatService,
    {
      provide: INSIGHT_ENGINE,
      inject: [
        ConfigService,
        RuleInsightEngine,
        LLMInsightEngine,
        HybridInsightEngine,
      ],
      useFactory: (
        config: ConfigService,
        ruleEngine: RuleInsightEngine,
        llmEngine: LLMInsightEngine,
        hybridEngine: HybridInsightEngine,
      ): InsightEngine => {
        const mode = (config.get<string>('AURUM_INSIGHTS_MODE') ?? 'rules')
          .toLowerCase()
          .trim();
        if (mode === 'llm') {
          return llmEngine;
        }
        if (mode === 'hybrid') {
          return hybridEngine;
        }
        return ruleEngine;
      },
    },
    AiService,
  ],
})
export class AiModule {}
