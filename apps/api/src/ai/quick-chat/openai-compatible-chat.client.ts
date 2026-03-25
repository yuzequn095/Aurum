import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface QuickChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface QuickChatCompletionInput {
  messages: QuickChatCompletionMessage[];
  temperature?: number;
}

type ChatCompletionsResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

export class QuickChatClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'QuickChatClientError';
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
export class OpenAiCompatibleChatClient {
  constructor(private readonly config: ConfigService) {}

  async completeChat(input: QuickChatCompletionInput): Promise<string> {
    const baseUrl = (
      this.config.get<string>('AURUM_LLM_BASE_URL') ?? 'http://localhost:8000'
    )
      .trim()
      .replace(/\/+$/, '');
    const apiKey = (this.config.get<string>('AURUM_LLM_API_KEY') ?? '').trim();
    const model = (
      this.config.get<string>('AURUM_CHAT_MODEL') ??
      this.config.get<string>('AURUM_LLM_MODEL') ??
      'gpt-4.1-mini'
    ).trim();
    const timeoutMs = Number(
      this.config.get<string>('AURUM_LLM_TIMEOUT_MS') ?? '8000',
    );
    const temperature =
      input.temperature ??
      Number(this.config.get<string>('AURUM_CHAT_TEMPERATURE') ?? '0.4');

    if (!apiKey && !isLocalhostUrl(baseUrl)) {
      throw new QuickChatClientError(
        'AURUM_LLM_API_KEY is required for non-local chat base URL',
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          model,
          temperature,
          messages: input.messages,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new QuickChatClientError(
          `Quick chat request failed (${response.status}): ${errorBody.slice(0, 240)}`,
        );
      }

      const payload = (await response.json()) as ChatCompletionsResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw new QuickChatClientError(
          'Quick chat response did not include message content',
        );
      }

      return content.trim();
    } catch (error) {
      if (error instanceof QuickChatClientError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new QuickChatClientError('Quick chat request timed out');
      }
      throw new QuickChatClientError('Quick chat request failed');
    } finally {
      clearTimeout(timeout);
    }
  }
}
