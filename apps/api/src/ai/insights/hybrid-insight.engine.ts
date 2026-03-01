import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InsightEngine } from './insight-engine.interface';
import { MonthlyReportContext } from './types';
import { LLMInsightEngine } from './llm-insight.engine';
import { RuleInsightEngine } from './rule-insight.engine';

@Injectable()
export class HybridInsightEngine implements InsightEngine {
  constructor(
    private readonly ruleEngine: RuleInsightEngine,
    private readonly llmEngine: LLMInsightEngine,
    private readonly config: ConfigService,
  ) {}

  async generate(context: MonthlyReportContext) {
    const llmEnabled =
      this.config.get<string>('AURUM_INSIGHTS_MODE') === 'hybrid';
    const maxInsights = Number(
      this.config.get<string>('AURUM_INSIGHTS_MAX') ?? '10',
    );

    const ruleInsights = await this.ruleEngine.generate(context);
    const llmInsights = llmEnabled
      ? await this.llmEngine.generate(context)
      : [];

    const merged = [...ruleInsights, ...llmInsights];
    const deduped: typeof merged = [];
    const seen = new Set<string>();

    for (const insight of merged) {
      if (seen.has(insight.id)) continue;
      seen.add(insight.id);
      deduped.push(insight);
      if (deduped.length >= maxInsights) break;
    }

    return deduped;
  }
}
