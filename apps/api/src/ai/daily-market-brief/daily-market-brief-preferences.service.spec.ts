import { NotFoundException } from '@nestjs/common';
import { DailyMarketBriefPreferencesService } from './daily-market-brief-preferences.service';

describe('DailyMarketBriefPreferencesService', () => {
  type UpsertArgs = {
    where: { userId: string };
    create: {
      enabled: boolean;
      cadence: string;
      deliveryTimeLocal: string;
      timezone: string;
      reportScope: string;
      deliveryChannel: string;
      sourceSnapshotId?: string;
    };
  };

  const prisma = {
    aIDailyMarketBriefPreferenceRecord: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };
  const portfolioSnapshotsService = {
    getSnapshotById: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns default preferences when no record exists', async () => {
    prisma.aIDailyMarketBriefPreferenceRecord.findUnique.mockResolvedValue(
      null,
    );

    const service = new DailyMarketBriefPreferencesService(
      prisma as never,
      portfolioSnapshotsService as never,
    );

    await expect(service.getPreferences('user_1')).resolves.toMatchObject({
      enabled: false,
      cadence: 'daily',
      deliveryTimeLocal: '08:00',
      timezone: 'America/Los_Angeles',
      reportScope: 'portfolio_aware',
      deliveryChannel: 'in_app',
    });
  });

  it('upserts owned delivery preferences for the current user', async () => {
    portfolioSnapshotsService.getSnapshotById.mockResolvedValue({
      id: 'snapshot_1',
    });
    prisma.aIDailyMarketBriefPreferenceRecord.findUnique.mockResolvedValue({
      enabled: true,
      cadence: 'WEEKDAYS',
      deliveryTimeLocal: '07:30',
      timezone: 'America/New_York',
      reportScope: 'MARKET_OVERVIEW',
      deliveryChannel: 'EMAIL_PLACEHOLDER',
      sourceSnapshotId: 'snapshot_1',
      createdAt: new Date('2026-03-24T00:00:00.000Z'),
      updatedAt: new Date('2026-03-24T01:00:00.000Z'),
    });

    const service = new DailyMarketBriefPreferencesService(
      prisma as never,
      portfolioSnapshotsService as never,
    );

    const result = await service.updatePreferences('user_1', {
      enabled: true,
      cadence: 'weekdays',
      deliveryTimeLocal: '07:30',
      timezone: 'America/New_York',
      reportScope: 'market_overview',
      deliveryChannel: 'email_placeholder',
      sourceSnapshotId: 'snapshot_1',
    });

    expect(portfolioSnapshotsService.getSnapshotById).toHaveBeenCalledWith(
      'snapshot_1',
      'user_1',
    );

    const upsertMock = prisma.aIDailyMarketBriefPreferenceRecord
      .upsert as jest.Mock<unknown, [UpsertArgs]>;
    const upsertCall = upsertMock.mock.calls[0]?.[0];

    expect(upsertCall.where).toEqual({ userId: 'user_1' });
    expect(upsertCall.create).toMatchObject({
      enabled: true,
      cadence: 'WEEKDAYS',
      deliveryTimeLocal: '07:30',
      timezone: 'America/New_York',
      reportScope: 'MARKET_OVERVIEW',
      deliveryChannel: 'EMAIL_PLACEHOLDER',
      sourceSnapshotId: 'snapshot_1',
    });
    expect(result).toMatchObject({
      enabled: true,
      cadence: 'weekdays',
      reportScope: 'market_overview',
      deliveryChannel: 'email_placeholder',
      sourceSnapshotId: 'snapshot_1',
    });
  });

  it('rejects snapshot-linked preferences when the snapshot is not owned by the user', async () => {
    portfolioSnapshotsService.getSnapshotById.mockResolvedValue(null);

    const service = new DailyMarketBriefPreferencesService(
      prisma as never,
      portfolioSnapshotsService as never,
    );

    await expect(
      service.updatePreferences('user_1', {
        enabled: true,
        cadence: 'daily',
        deliveryTimeLocal: '08:00',
        timezone: 'America/Los_Angeles',
        reportScope: 'portfolio_aware',
        deliveryChannel: 'in_app',
        sourceSnapshotId: 'snapshot_missing',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
