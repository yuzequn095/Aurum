import type { AIRouteDecision, AITaskType } from '../types';

export interface AIRouter {
  resolve(taskType: AITaskType): AIRouteDecision;
}
