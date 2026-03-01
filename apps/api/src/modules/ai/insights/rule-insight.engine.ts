import { InsightEngine } from './insight-engine.interface';
import { generateRuleInsights } from './rule.engine';
import { MonthlyReportContext } from './types';

export class RuleInsightEngine implements InsightEngine {
  generate(context: MonthlyReportContext) {
    return Promise.resolve(generateRuleInsights(context));
  }
}
