import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { HybridInsightEngine } from './insights/hybrid-insight.engine';
import { INSIGHT_ENGINE } from './insights/insight-engine.token';
import { LLMInsightEngine } from './insights/llm-insight.engine';
import { RuleInsightEngine } from './insights/rule-insight.engine';

@Module({
  imports: [AnalyticsModule],
  controllers: [AiController],
  providers: [
    {
      provide: INSIGHT_ENGINE,
      useFactory: () => {
        const mode = (process.env.AURUM_INSIGHTS_MODE ?? 'rules').toLowerCase();
        const llmPlaceholderEnabled =
          process.env.AURUM_LLM_PLACEHOLDER === 'true';

        const ruleEngine = new RuleInsightEngine();
        const llmEngine = new LLMInsightEngine(llmPlaceholderEnabled);

        if (mode === 'llm') {
          return llmEngine;
        }
        if (mode === 'hybrid') {
          return new HybridInsightEngine(ruleEngine, llmEngine, true, 10);
        }
        return ruleEngine;
      },
    },
    AiService,
  ],
})
export class AiModule {}
