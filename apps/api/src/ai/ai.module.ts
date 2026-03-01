import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { HybridInsightEngine } from './insights/hybrid-insight.engine';
import type { InsightEngine } from './insights/insight-engine.interface';
import { INSIGHT_ENGINE } from './insights/insight-engine.token';
import { LLMInsightEngine } from './insights/llm-insight.engine';
import { RuleInsightEngine } from './insights/rule-insight.engine';

@Module({
  imports: [AnalyticsModule, ConfigModule],
  controllers: [AiController],
  providers: [
    RuleInsightEngine,
    LLMInsightEngine,
    HybridInsightEngine,
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
