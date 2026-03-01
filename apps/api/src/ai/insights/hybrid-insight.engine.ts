import { InsightEngine } from './insight-engine.interface';
import { MonthlyReportContext } from './types';

export class HybridInsightEngine implements InsightEngine {
  constructor(
    private readonly ruleEngine: InsightEngine,
    private readonly llmEngine: InsightEngine,
    private readonly llmEnabled = true,
    private readonly maxInsights = 10,
  ) {}

  async generate(context: MonthlyReportContext) {
    const ruleInsights = await this.ruleEngine.generate(context);
    const llmInsights = this.llmEnabled
      ? await this.llmEngine.generate(context)
      : [];

    const merged = [...ruleInsights, ...llmInsights];
    const deduped: typeof merged = [];
    const seen = new Set<string>();

    for (const insight of merged) {
      if (seen.has(insight.id)) continue;
      seen.add(insight.id);
      deduped.push(insight);
      if (deduped.length >= this.maxInsights) break;
    }

    return deduped;
  }
}
