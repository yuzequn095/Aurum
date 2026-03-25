import type {
  AIReportArtifact,
  FinancialHealthScoreArtifact,
  PortfolioSnapshot,
} from '@aurum/core';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AIReportsService } from '../../ai-reports/ai-reports.service';
import { EntitlementsService } from '../../entitlements/entitlements.service';
import { FinancialHealthScoresService } from '../../financial-health-scores/financial-health-scores.service';
import { PortfolioSnapshotsService } from '../../portfolio-snapshots/portfolio-snapshots.service';
import { QuickChatRequestDto } from './dto/quick-chat.dto';
import { OpenAiCompatibleChatClient } from './openai-compatible-chat.client';
import {
  buildQuickChatFallbackReply,
  buildQuickChatPromptMessages,
} from './quick-chat.prompt';
import type {
  QuickChatContextView,
  QuickChatResponseView,
} from './quick-chat.types';

function trimRequiredText(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new BadRequestException(`${fieldName} must not be empty.`);
  }

  return trimmed;
}

function normalizeContext(input: {
  sourceSnapshotId?: string;
  sourceReportId?: string;
  sourceFinancialHealthScoreId?: string;
}): QuickChatContextView | undefined {
  const context: QuickChatContextView = {
    sourceSnapshotId: input.sourceSnapshotId?.trim() || undefined,
    sourceReportId: input.sourceReportId?.trim() || undefined,
    sourceFinancialHealthScoreId:
      input.sourceFinancialHealthScoreId?.trim() || undefined,
  };

  return Object.values(context).some((value) => value != null)
    ? context
    : undefined;
}

@Injectable()
export class QuickChatService {
  private readonly logger = new Logger(QuickChatService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly entitlementsService: EntitlementsService,
    private readonly portfolioSnapshotsService: PortfolioSnapshotsService,
    private readonly aiReportsService: AIReportsService,
    private readonly financialHealthScoresService: FinancialHealthScoresService,
    private readonly chatClient: OpenAiCompatibleChatClient,
  ) {}

  async runQuickChat(
    userId: string,
    dto: QuickChatRequestDto,
  ): Promise<QuickChatResponseView> {
    await this.entitlementsService.assertFeatureEnabled(
      userId,
      'ai.quick_chat',
    );

    const transcript = dto.messages.map((message) => ({
      role: message.role,
      content: trimRequiredText(message.content, 'Quick chat message'),
    }));

    const lastMessage = transcript[transcript.length - 1];
    if (!lastMessage || lastMessage.role !== 'user') {
      throw new BadRequestException(
        'Quick chat requires the final transcript message to be from the user.',
      );
    }

    const context = await this.resolveOwnedContext(userId, dto);
    const createdAt = new Date().toISOString();

    const llmEnabled =
      (this.config.get<string>('AURUM_LLM_ENABLED') ?? 'false') === 'true';
    if (llmEnabled) {
      try {
        const content = await this.chatClient.completeChat({
          messages: buildQuickChatPromptMessages({
            transcript: transcript.slice(-12),
            context,
          }),
        });

        return {
          mode: 'llm',
          context: normalizeContext(dto),
          reply: {
            role: 'assistant',
            content,
            createdAt,
          },
        };
      } catch (error) {
        this.logger.warn(
          `Quick chat falling back after provider error: ${error instanceof Error ? error.message : 'unknown-error'}`,
        );
      }
    }

    return {
      mode: 'fallback',
      context: normalizeContext(dto),
      reply: {
        role: 'assistant',
        content: buildQuickChatFallbackReply({
          transcript,
          context,
        }),
        createdAt,
      },
    };
  }

  private async resolveOwnedContext(
    userId: string,
    dto: QuickChatRequestDto,
  ): Promise<{
    snapshot?: PortfolioSnapshot;
    report?: AIReportArtifact;
    score?: FinancialHealthScoreArtifact;
  }> {
    const snapshot = dto.sourceSnapshotId
      ? await this.portfolioSnapshotsService.getSnapshotById(
          dto.sourceSnapshotId,
          userId,
        )
      : null;
    if (dto.sourceSnapshotId && !snapshot) {
      throw new NotFoundException(
        `Portfolio snapshot not found: ${dto.sourceSnapshotId}`,
      );
    }

    const report = dto.sourceReportId
      ? await this.aiReportsService.getReportById(dto.sourceReportId, userId)
      : null;
    if (dto.sourceReportId && !report) {
      throw new NotFoundException(`AI report not found: ${dto.sourceReportId}`);
    }

    const score = dto.sourceFinancialHealthScoreId
      ? await this.financialHealthScoresService.getScoreArtifactById(
          dto.sourceFinancialHealthScoreId,
          userId,
        )
      : null;
    if (dto.sourceFinancialHealthScoreId && !score) {
      throw new NotFoundException(
        `Financial health score not found: ${dto.sourceFinancialHealthScoreId}`,
      );
    }

    const snapshotId = snapshot?.id ?? dto.sourceSnapshotId;
    if (
      snapshotId &&
      report?.sourceSnapshotId &&
      report.sourceSnapshotId !== snapshotId
    ) {
      throw new BadRequestException(
        'Quick chat report context must belong to the selected snapshot.',
      );
    }
    if (
      snapshotId &&
      score?.sourceSnapshotId &&
      score.sourceSnapshotId !== snapshotId
    ) {
      throw new BadRequestException(
        'Quick chat score context must belong to the selected snapshot.',
      );
    }
    if (
      report?.sourceSnapshotId &&
      score?.sourceSnapshotId &&
      report.sourceSnapshotId !== score.sourceSnapshotId
    ) {
      throw new BadRequestException(
        'Quick chat report and score contexts must reference the same snapshot.',
      );
    }

    return {
      snapshot: snapshot ?? undefined,
      report: report ?? undefined,
      score: score ?? undefined,
    };
  }
}
