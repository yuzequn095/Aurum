import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AIConversationMessageRole, type Prisma } from '@prisma/client';
import { AIReportsService } from '../ai-reports/ai-reports.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { FinancialHealthScoresService } from '../financial-health-scores/financial-health-scores.service';
import { PortfolioSnapshotsService } from '../portfolio-snapshots/portfolio-snapshots.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  mapAIConversationDetailRecord,
  mapAIConversationSummaryRecord,
} from './ai-conversation.mapper';
import type {
  AIConversationDetailView,
  AIConversationSummaryView,
} from './ai-conversations.types';
import {
  CreateAIConversationDto,
  type CreateAIConversationMessageDto,
} from './dto/create-ai-conversation.dto';
import { UpdateAIConversationDto } from './dto/update-ai-conversation.dto';

function mapMessageRole(
  role: CreateAIConversationMessageDto['role'],
): AIConversationMessageRole {
  switch (role) {
    case 'system':
      return AIConversationMessageRole.SYSTEM;
    case 'user':
      return AIConversationMessageRole.USER;
    case 'assistant':
      return AIConversationMessageRole.ASSISTANT;
  }
}

function trimRequiredText(value: string, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new BadRequestException(`${fieldName} must not be empty.`);
  }

  return trimmed;
}

function mapMetadataToPrisma(
  metadata: Record<string, unknown> | undefined,
): Prisma.InputJsonValue | undefined {
  if (!metadata) {
    return undefined;
  }

  return metadata as Prisma.InputJsonValue;
}

@Injectable()
export class AIConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementsService: EntitlementsService,
    private readonly portfolioSnapshotsService: PortfolioSnapshotsService,
    private readonly aiReportsService: AIReportsService,
    private readonly financialHealthScoresService: FinancialHealthScoresService,
  ) {}

  async createConversation(
    userId: string,
    dto: CreateAIConversationDto,
  ): Promise<AIConversationDetailView> {
    await this.entitlementsService.assertFeatureEnabled(
      userId,
      'ai.conversations.save',
    );
    await this.validateContextOwnership(userId, dto);

    const title = trimRequiredText(dto.title, 'Conversation title');
    const messages = (dto.messages ?? []).map((message) => ({
      role: mapMessageRole(message.role),
      content: trimRequiredText(message.content, 'Conversation message'),
      metadata: message.metadata,
    }));

    const created = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.aIConversationRecord.create({
        data: {
          userId,
          title,
          sourceSnapshotId: dto.sourceSnapshotId,
          sourceReportId: dto.sourceReportId,
          sourceFinancialHealthScoreId: dto.sourceFinancialHealthScoreId,
        },
      });

      if (messages.length > 0) {
        await tx.aIConversationMessageRecord.createMany({
          data: messages.map((message, index) => ({
            conversationId: conversation.id,
            sortOrder: index,
            role: message.role,
            content: message.content,
            metadata: mapMetadataToPrisma(message.metadata),
          })),
        });
      }

      return tx.aIConversationRecord.findUniqueOrThrow({
        where: { id: conversation.id },
        include: {
          messages: {
            orderBy: [{ sortOrder: 'asc' }],
          },
        },
      });
    });

    return mapAIConversationDetailRecord(created);
  }

  async listConversations(
    userId: string,
  ): Promise<AIConversationSummaryView[]> {
    const records = await this.prisma.aIConversationRecord.findMany({
      where: { userId },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      include: {
        _count: {
          select: { messages: true },
        },
        messages: {
          select: { createdAt: true },
          orderBy: [{ sortOrder: 'desc' }],
          take: 1,
        },
      },
    });

    return records.map(mapAIConversationSummaryRecord);
  }

  async getConversationById(
    userId: string,
    id: string,
  ): Promise<AIConversationDetailView | null> {
    const record = await this.prisma.aIConversationRecord.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: [{ sortOrder: 'asc' }],
        },
      },
    });

    return record ? mapAIConversationDetailRecord(record) : null;
  }

  async updateConversation(
    userId: string,
    id: string,
    dto: UpdateAIConversationDto,
  ): Promise<AIConversationSummaryView | null> {
    const data: { title?: string } = {};
    if (dto.title != null) {
      data.title = trimRequiredText(dto.title, 'Conversation title');
    }
    if (Object.keys(data).length === 0) {
      throw new BadRequestException(
        'At least one supported conversation field must be provided.',
      );
    }

    const updated = await this.prisma.aIConversationRecord.updateMany({
      where: { id, userId },
      data,
    });
    if (updated.count === 0) {
      return null;
    }

    const record = await this.prisma.aIConversationRecord.findFirstOrThrow({
      where: { id, userId },
      include: {
        _count: {
          select: { messages: true },
        },
        messages: {
          select: { createdAt: true },
          orderBy: [{ sortOrder: 'desc' }],
          take: 1,
        },
      },
    });

    return mapAIConversationSummaryRecord(record);
  }

  async deleteConversation(userId: string, id: string): Promise<boolean> {
    const deleted = await this.prisma.aIConversationRecord.deleteMany({
      where: { id, userId },
    });

    return deleted.count > 0;
  }

  private async validateContextOwnership(
    userId: string,
    dto: CreateAIConversationDto,
  ): Promise<void> {
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
        'Conversation report context must belong to the selected snapshot.',
      );
    }
    if (
      snapshotId &&
      score?.sourceSnapshotId &&
      score.sourceSnapshotId !== snapshotId
    ) {
      throw new BadRequestException(
        'Conversation score context must belong to the selected snapshot.',
      );
    }
    if (
      report?.sourceSnapshotId &&
      score?.sourceSnapshotId &&
      report.sourceSnapshotId !== score.sourceSnapshotId
    ) {
      throw new BadRequestException(
        'Conversation report and score contexts must reference the same snapshot.',
      );
    }
  }
}
