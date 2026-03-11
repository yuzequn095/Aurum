import { LocalStorageAIReportRepository } from './local-storage-ai-report-repository';
import { LocalStorageAIRunRepository } from './local-storage-ai-run-repository';

export const aiRunRepository = new LocalStorageAIRunRepository();
export const aiReportRepository = new LocalStorageAIReportRepository();
