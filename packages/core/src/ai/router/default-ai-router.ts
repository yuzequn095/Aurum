import type { AIRouter } from './router';
import { resolvePhase1Route } from './routing-policy';
import type { AIRouteDecision, AITaskType } from '../types';

export class DefaultAIRouter implements AIRouter {
  resolve(taskType: AITaskType): AIRouteDecision {
    return resolvePhase1Route(taskType);
  }
}
