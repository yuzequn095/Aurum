import type { AIProviderKind } from '../types';
import type { AIProviderAdapter } from './provider-adapter';
import { manualChatGPTProvider } from './manual-chatgpt-provider';

export const aiProviderRegistry: Partial<Record<AIProviderKind, AIProviderAdapter>> = {
  manual_chatgpt: manualChatGPTProvider,
};

export function getAIProviderAdapter(
  providerKind: AIProviderKind,
): AIProviderAdapter | undefined {
  return aiProviderRegistry[providerKind];
}
