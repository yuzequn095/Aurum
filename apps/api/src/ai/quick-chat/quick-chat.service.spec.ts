import { BadRequestException } from '@nestjs/common';
import { QuickChatService } from './quick-chat.service';

describe('QuickChatService', () => {
  const config = {
    get: jest.fn(),
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
  const chatClient = {
    completeChat: jest.fn(),
  };

  beforeEach(() => {
    jest.resetAllMocks();
    config.get.mockImplementation((key: string) => {
      if (key === 'AURUM_LLM_ENABLED') {
        return 'false';
      }

      return undefined;
    });
  });

  it('runs quick chat ephemerally with fallback mode and owned context', async () => {
    entitlementsService.assertFeatureEnabled.mockResolvedValue(undefined);
    portfolioSnapshotsService.getSnapshotById.mockResolvedValue({
      id: 'snapshot_1',
      metadata: {
        portfolioName: 'Household Portfolio',
        snapshotDate: '2026-03-24',
        valuationCurrency: 'USD',
      },
      totalValue: 250000,
      cashValue: 20000,
      positions: [{ assetKey: 'AAPL', marketValue: 75000 }],
    });
    aiReportsService.getReportById.mockResolvedValue({
      id: 'report_1',
      title: 'March Portfolio Report',
      sourceSnapshotId: 'snapshot_1',
      contentMarkdown: 'Allocation remains balanced.',
    });
    financialHealthScoresService.getScoreArtifactById.mockResolvedValue({
      id: 'score_1',
      sourceSnapshotId: 'snapshot_1',
      result: {
        totalScore: 84,
        maxScore: 100,
        grade: 'STRONG',
      },
      insight: {
        headline: 'Financial footing is strong.',
        summary: 'Cash reserves and diversification remain healthy.',
      },
    });

    const service = new QuickChatService(
      config as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
      aiReportsService as never,
      financialHealthScoresService as never,
      chatClient as never,
    );

    const response = await service.runQuickChat('user_1', {
      messages: [{ role: 'user', content: 'What stands out?' }],
      sourceSnapshotId: 'snapshot_1',
      sourceReportId: 'report_1',
      sourceFinancialHealthScoreId: 'score_1',
    });

    expect(entitlementsService.assertFeatureEnabled).toHaveBeenCalledWith(
      'user_1',
      'ai.quick_chat',
    );
    expect(chatClient.completeChat).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      mode: 'fallback',
      context: {
        sourceSnapshotId: 'snapshot_1',
        sourceReportId: 'report_1',
        sourceFinancialHealthScoreId: 'score_1',
      },
      reply: {
        role: 'assistant',
      },
    });
    expect(response.reply.content).toContain('Household Portfolio');
  });

  it('returns llm mode when the configured provider succeeds', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'AURUM_LLM_ENABLED') {
        return 'true';
      }

      return undefined;
    });
    entitlementsService.assertFeatureEnabled.mockResolvedValue(undefined);
    chatClient.completeChat.mockResolvedValue('Here is a grounded answer.');

    const service = new QuickChatService(
      config as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
      aiReportsService as never,
      financialHealthScoresService as never,
      chatClient as never,
    );

    const response = await service.runQuickChat('user_1', {
      messages: [{ role: 'user', content: 'Give me a quick overview.' }],
    });

    expect(chatClient.completeChat).toHaveBeenCalledTimes(1);
    expect(response).toMatchObject({
      mode: 'llm',
      context: undefined,
      reply: {
        role: 'assistant',
        content: 'Here is a grounded answer.',
      },
    });
    expect(typeof response.reply.createdAt).toBe('string');
  });

  it('rejects transcripts that do not end with a user message', async () => {
    entitlementsService.assertFeatureEnabled.mockResolvedValue(undefined);

    const service = new QuickChatService(
      config as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
      aiReportsService as never,
      financialHealthScoresService as never,
      chatClient as never,
    );

    await expect(
      service.runQuickChat('user_1', {
        messages: [{ role: 'assistant', content: 'Previous reply' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
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

    const service = new QuickChatService(
      config as never,
      entitlementsService as never,
      portfolioSnapshotsService as never,
      aiReportsService as never,
      financialHealthScoresService as never,
      chatClient as never,
    );

    await expect(
      service.runQuickChat('user_1', {
        messages: [{ role: 'user', content: 'What changed?' }],
        sourceSnapshotId: 'snapshot_1',
        sourceReportId: 'report_1',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
