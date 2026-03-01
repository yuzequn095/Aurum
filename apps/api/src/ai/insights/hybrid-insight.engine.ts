import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InsightEngine } from './insight-engine.interface';
import type { Insight, MonthlyReportContext } from './types';
import { LLMInsightEngine } from './llm-insight.engine';
import { RuleInsightEngine } from './rule-insight.engine';

const DEFAULT_MAX_INSIGHTS = 10;
const SEVERITY_PRIORITY: Record<Insight['severity'], number> = {
  error: 4,
  warn: 3,
  good: 2,
  info: 1,
};

@Injectable()
export class HybridInsightEngine implements InsightEngine {
  constructor(
    private readonly ruleEngine: RuleInsightEngine,
    private readonly llmEngine: LLMInsightEngine,
    private readonly config: ConfigService,
  ) {}

  async generate(context: MonthlyReportContext): Promise<Insight[]> {
    const maxInsightsRaw = Number(
      this.config.get<string>('AURUM_INSIGHTS_MAX') ?? '10',
    );
    const maxInsights = Number.isFinite(maxInsightsRaw)
      ? Math.max(1, Math.floor(maxInsightsRaw))
      : 10;
    const llmEnabled =
      (this.config.get<string>('AURUM_LLM_ENABLED') ?? 'false') === 'true';

    const ruleInsights = await this.ruleEngine.generate(context);
    const llmInsights = llmEnabled
      ? await this.llmEngine.generate(context)
      : [];

    return this.mergeInsights(ruleInsights, llmInsights).slice(0, maxInsights);
  }

  private mergeInsights(rule: Insight[], llm: Insight[]): Insight[] {
    const ruleInsights = this.sortBySeverityStable(
      rule.map((insight) => this.attachSource(insight, 'rule')),
    );
    let llmInsights = this.sortBySeverityStable(
      llm.map((insight) => this.attachSource(insight, 'llm')),
    );

    const hasOnlyFallback =
      llmInsights.length === 1 && llmInsights[0]?.id === 'llm-unavailable';
    if (ruleInsights.length > 0 && hasOnlyFallback) {
      llmInsights = [];
    }

    const merged: Insight[] = [];
    const seen = new Set<string>();

    for (const insight of ruleInsights) {
      if (seen.has(insight.id)) continue;
      seen.add(insight.id);
      merged.push(insight);
    }

    for (const insight of llmInsights) {
      if (seen.has(insight.id)) continue;
      seen.add(insight.id);
      merged.push(insight);
    }

    return merged.slice(0, DEFAULT_MAX_INSIGHTS);
  }

  private sortBySeverityStable(insights: Insight[]): Insight[] {
    return insights
      .map((insight, index) => ({ insight, index }))
      .sort((a, b) => {
        const severityDiff =
          SEVERITY_PRIORITY[b.insight.severity] -
          SEVERITY_PRIORITY[a.insight.severity];
        if (severityDiff !== 0) return severityDiff;
        return a.index - b.index;
      })
      .map(({ insight }) => insight);
  }

  private attachSource(insight: Insight, source: 'rule' | 'llm'): Insight {
    return {
      ...insight,
      meta: {
        ...(insight.meta ?? {}),
        source,
      },
    };
  }
}
