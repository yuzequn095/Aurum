import type { AIRouteDecision, AITaskType } from '../types';

export function resolvePhase1Route(_taskType: AITaskType): AIRouteDecision {
  return {
    provider: 'manual_chatgpt',
    executionMode: 'manual',
    reason: 'Phase 1 manual workflow policy',
  };
}
