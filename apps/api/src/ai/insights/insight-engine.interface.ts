import { Insight, MonthlyReportContext } from './types';

export interface InsightEngine {
  generate(context: MonthlyReportContext): Promise<Insight[]>;
}
