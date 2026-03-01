import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildLlmPrompt,
  parseAndValidateLlmOutput,
  type LlmInsight,
  type LlmMonthlyContext,
} from './prompt';

export interface LlmClient {
  generateInsights(input: LlmMonthlyContext): Promise<LlmInsight[]>;
}

type ChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export class LlmClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LlmClientError';
  }
}

function isLocalhostUrl(baseUrl: string): boolean {
  try {
    const parsed = new URL(baseUrl);
    return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname);
  } catch {
    return false;
  }
}

@Injectable()
export class OpenAiCompatibleLlmClient implements LlmClient {
  constructor(private readonly config: ConfigService) {}

  async generateInsights(input: LlmMonthlyContext): Promise<LlmInsight[]> {
    const baseUrl = (
      this.config.get<string>('AURUM_LLM_BASE_URL') ?? 'http://localhost:8000'
    )
      .trim()
      .replace(/\/+$/, '');
    const apiKey = (this.config.get<string>('AURUM_LLM_API_KEY') ?? '').trim();
    const model = (
      this.config.get<string>('AURUM_LLM_MODEL') ?? 'gpt-4.1-mini'
    ).trim();
    const timeoutMs = Number(
      this.config.get<string>('AURUM_LLM_TIMEOUT_MS') ?? '8000',
    );

    if (!apiKey && !isLocalhostUrl(baseUrl)) {
      throw new LlmClientError(
        'AURUM_LLM_API_KEY is required for non-local LLM base URL',
      );
    }

    const { system, user } = buildLlmPrompt(input);
    const endpoint = `${baseUrl}/v1/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new LlmClientError(
          `LLM request failed (${response.status}): ${errorBody.slice(0, 240)}`,
        );
      }

      const payload = (await response.json()) as ChatCompletionsResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw new LlmClientError(
          'LLM response did not include message content',
        );
      }

      return parseAndValidateLlmOutput(content);
    } catch (error) {
      if (error instanceof LlmClientError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new LlmClientError('LLM request timed out');
      }
      throw new LlmClientError('LLM request failed');
    } finally {
      clearTimeout(timeout);
    }
  }
}
