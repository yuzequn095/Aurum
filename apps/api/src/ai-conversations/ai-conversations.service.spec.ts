import { AIConversationMessageRole } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { AIConversationsService } from './ai-conversations.service';

describe('AIConversationsService', () => {
  const prisma = {
    $transaction: jest.fn(),
    aIConversationRecord: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      updateMany: jest.fn(),
      findFirstOrThrow: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  const entitlementsService = {
    assertFeatureEnabled: jest.fn(),
  };
  const portfolioSnapshotsService = {
    getSnapshotById: jest.fn(),
  };
  const aiReportsService = {
    getReportById: jest.fn(),
  };
  const financialHealthScoresService = {
    getScoreArtifactById: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates saved conversations with messages and optional context', async () => {
    const tx = {
      aIConversationRecord: {
        create: jest.fn().mockResolvedValue({ id: 'conversation_1' }),
        findUniqueOrThrow: jest.fn().mockResolvedValue({
          id: 'conversation_1',
          userId: 'user_1',
          title: 'Saved quick chat',
          sourceSnapshotId: 'snapshot_1',
          sourceReportId: 'report_1',
          sourceFinancialHealthScoreId: 'score_1',
          createdAt: new Date('2026-03-24T00:00:00.000Z'),
          updatedAt: new Date('2026-03-24T00:00:00.000Z'),
          messages: [
            {
              id: 'message_1',
              conversationId: 'conversation_1',
              sortOrder: 0,
              role: AIConversationMessageRole.USER,
              content: 'How am I doing?',
              metadata: null,
              createdAt: new Date('2026-03-24T00:00:00.000Z'),
              updatedAt: new Date('2026-03-24T00:00:00.000Z'),
            },
            {
              id: 'message_2',
              conversationId: 'conversation_1',
              sortOrder: 1,
              role: AIConversationMessageRole.ASSISTANT,
              content: 'You are diversified.',
              metadata: null,
              createdAt: new Date('2026-03-24T00:01:00.000Z'),
              updatedAt: new Date('2026-03-24T00:01:00.000Z'),
            },
          ],
        }),
      },
      aIConversationMessageRecord: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    prisma.$transaction.mockImplementation(
      async (callback: (transactionClient: unknown) => Promise<unknown>) =>
        callback(tx),
    );
    portfolioSnapshotsService.getSnapshotById.mockResolvedValue({
      id: 'snapshot_1',
    });
    aiReportsService.getReportById.mockResolvedValue({
      id: 'report_1',
      sourceSnapshotId: 'snapshot_1',
    });
    financialHealthScoresService.getScoreArtifactById.mockResolvedValue({
      id: 'score_1',
      sourceSnapshotId: 'snapshot_1',
    });

    const service = new AIConversationsService(
      prisma as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
      aiReportsService as never,
      financialHealthScoresService as never,
    );

    const created = await service.createConversation('user_1', {
      title: 'Saved quick chat',
      sourceSnapshotId: 'snapshot_1',
      sourceReportId: 'report_1',
      sourceFinancialHealthScoreId: 'score_1',
      messages: [
        {
          role: 'user',
          content: 'How am I doing?',
        },
        {
          role: 'assistant',
          content: 'You are diversified.',
        },
      ],
    });

    expect(entitlementsService.assertFeatureEnabled).toHaveBeenCalledWith(
      'user_1',
      'ai.conversations.save',
    );
    expect(tx.aIConversationRecord.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        title: 'Saved quick chat',
        sourceSnapshotId: 'snapshot_1',
        sourceReportId: 'report_1',
        sourceFinancialHealthScoreId: 'score_1',
      },
    });
    expect(tx.aIConversationMessageRecord.createMany).toHaveBeenCalledWith({
      data: [
        {
          conversationId: 'conversation_1',
          sortOrder: 0,
          role: AIConversationMessageRole.USER,
          content: 'How am I doing?',
          metadata: undefined,
        },
        {
          conversationId: 'conversation_1',
          sortOrder: 1,
          role: AIConversationMessageRole.ASSISTANT,
          content: 'You are diversified.',
          metadata: undefined,
        },
      ],
    });
    expect(created).toMatchObject({
      id: 'conversation_1',
      title: 'Saved quick chat',
      context: {
        sourceSnapshotId: 'snapshot_1',
        sourceReportId: 'report_1',
        sourceFinancialHealthScoreId: 'score_1',
      },
      messages: [
        expect.objectContaining({ role: 'user', content: 'How am I doing?' }),
        expect.objectContaining({
          role: 'assistant',
          content: 'You are diversified.',
        }),
      ],
    });
  });

  it('lists, gets, renames, and deletes only the current user conversations', async () => {
    prisma.aIConversationRecord.findMany.mockResolvedValue([
      {
        id: 'conversation_1',
        userId: 'user_1',
        title: 'Saved quick chat',
        sourceSnapshotId: null,
        sourceReportId: null,
        sourceFinancialHealthScoreId: null,
        createdAt: new Date('2026-03-24T00:00:00.000Z'),
        updatedAt: new Date('2026-03-24T00:05:00.000Z'),
        _count: { messages: 2 },
        messages: [{ createdAt: new Date('2026-03-24T00:04:00.000Z') }],
      },
    ]);
    prisma.aIConversationRecord.findFirst.mockResolvedValue({
      id: 'conversation_1',
      userId: 'user_1',
      title: 'Saved quick chat',
      sourceSnapshotId: null,
      sourceReportId: null,
      sourceFinancialHealthScoreId: null,
      createdAt: new Date('2026-03-24T00:00:00.000Z'),
      updatedAt: new Date('2026-03-24T00:05:00.000Z'),
      messages: [
        {
          id: 'message_1',
          conversationId: 'conversation_1',
          sortOrder: 0,
          role: AIConversationMessageRole.USER,
          content: 'Hello',
          metadata: null,
          createdAt: new Date('2026-03-24T00:00:00.000Z'),
          updatedAt: new Date('2026-03-24T00:00:00.000Z'),
        },
      ],
    });
    prisma.aIConversationRecord.updateMany.mockResolvedValue({ count: 1 });
    prisma.aIConversationRecord.findFirstOrThrow.mockResolvedValue({
      id: 'conversation_1',
      userId: 'user_1',
      title: 'Renamed chat',
      sourceSnapshotId: null,
      sourceReportId: null,
      sourceFinancialHealthScoreId: null,
      createdAt: new Date('2026-03-24T00:00:00.000Z'),
      updatedAt: new Date('2026-03-24T00:06:00.000Z'),
      _count: { messages: 2 },
      messages: [{ createdAt: new Date('2026-03-24T00:04:00.000Z') }],
    });
    prisma.aIConversationRecord.deleteMany.mockResolvedValue({ count: 1 });

    const service = new AIConversationsService(
      prisma as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
      aiReportsService as never,
      financialHealthScoresService as never,
    );

    const list = await service.listConversations('user_1');
    const conversation = await service.getConversationById(
      'user_1',
      'conversation_1',
    );
    const updated = await service.updateConversation(
      'user_1',
      'conversation_1',
      {
        title: 'Renamed chat',
      },
    );
    const deleted = await service.deleteConversation(
      'user_1',
      'conversation_1',
    );

    expect(prisma.aIConversationRecord.findMany).toHaveBeenCalledWith({
      where: { userId: 'user_1' },
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
    expect(prisma.aIConversationRecord.findFirst).toHaveBeenCalledWith({
      where: { id: 'conversation_1', userId: 'user_1' },
      include: {
        messages: {
          orderBy: [{ sortOrder: 'asc' }],
        },
      },
    });
    expect(prisma.aIConversationRecord.updateMany).toHaveBeenCalledWith({
      where: { id: 'conversation_1', userId: 'user_1' },
      data: { title: 'Renamed chat' },
    });
    expect(prisma.aIConversationRecord.deleteMany).toHaveBeenCalledWith({
      where: { id: 'conversation_1', userId: 'user_1' },
    });
    expect(list[0]).toMatchObject({
      id: 'conversation_1',
      messageCount: 2,
    });
    expect(conversation).toMatchObject({
      id: 'conversation_1',
      messages: [expect.objectContaining({ role: 'user' })],
    });
    expect(updated).toMatchObject({
      id: 'conversation_1',
      title: 'Renamed chat',
    });
    expect(deleted).toBe(true);
  });

  it('rejects mismatched report and snapshot context links', async () => {
    entitlementsService.assertFeatureEnabled.mockResolvedValue(undefined);
    portfolioSnapshotsService.getSnapshotById.mockResolvedValue({
      id: 'snapshot_1',
    });
    aiReportsService.getReportById.mockResolvedValue({
      id: 'report_1',
      sourceSnapshotId: 'snapshot_2',
    });

    const service = new AIConversationsService(
      prisma as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
      aiReportsService as never,
      financialHealthScoresService as never,
    );

    await expect(
      service.createConversation('user_1', {
        title: 'Saved quick chat',
        sourceSnapshotId: 'snapshot_1',
        sourceReportId: 'report_1',
        messages: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects empty conversation updates', async () => {
    const service = new AIConversationsService(
      prisma as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
      aiReportsService as never,
      financialHealthScoresService as never,
    );

    await expect(
      service.updateConversation('user_1', 'conversation_1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
