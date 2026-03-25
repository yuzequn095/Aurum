import {
  AIDailyMarketBriefCadence,
  AIDailyMarketBriefDeliveryChannel,
  AIDailyMarketBriefScope,
} from '@prisma/client';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PortfolioSnapshotsService } from '../../portfolio-snapshots/portfolio-snapshots.service';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateDailyMarketBriefPreferencesDto } from './dto/update-daily-market-brief-preferences.dto';
import type { DailyMarketBriefPreferenceView } from './daily-market-brief.types';

function mapCadenceToView(
  cadence: AIDailyMarketBriefCadence,
): DailyMarketBriefPreferenceView['cadence'] {
  switch (cadence) {
    case AIDailyMarketBriefCadence.WEEKDAYS:
      return 'weekdays';
    case AIDailyMarketBriefCadence.WEEKLY:
      return 'weekly';
    case AIDailyMarketBriefCadence.DAILY:
    default:
      return 'daily';
  }
}

function mapScopeToView(
  scope: AIDailyMarketBriefScope,
): DailyMarketBriefPreferenceView['reportScope'] {
  switch (scope) {
    case AIDailyMarketBriefScope.MARKET_OVERVIEW:
      return 'market_overview';
    case AIDailyMarketBriefScope.PORTFOLIO_AWARE:
    default:
      return 'portfolio_aware';
  }
}

function mapDeliveryChannelToView(
  channel: AIDailyMarketBriefDeliveryChannel,
): DailyMarketBriefPreferenceView['deliveryChannel'] {
  switch (channel) {
    case AIDailyMarketBriefDeliveryChannel.EMAIL_PLACEHOLDER:
      return 'email_placeholder';
    case AIDailyMarketBriefDeliveryChannel.IN_APP:
    default:
      return 'in_app';
  }
}

function mapCadenceToPrisma(
  cadence: DailyMarketBriefPreferenceView['cadence'],
): AIDailyMarketBriefCadence {
  switch (cadence) {
    case 'weekdays':
      return AIDailyMarketBriefCadence.WEEKDAYS;
    case 'weekly':
      return AIDailyMarketBriefCadence.WEEKLY;
    case 'daily':
    default:
      return AIDailyMarketBriefCadence.DAILY;
  }
}

function mapScopeToPrisma(
  scope: DailyMarketBriefPreferenceView['reportScope'],
): AIDailyMarketBriefScope {
  switch (scope) {
    case 'market_overview':
      return AIDailyMarketBriefScope.MARKET_OVERVIEW;
    case 'portfolio_aware':
    default:
      return AIDailyMarketBriefScope.PORTFOLIO_AWARE;
  }
}

function mapDeliveryChannelToPrisma(
  channel: DailyMarketBriefPreferenceView['deliveryChannel'],
): AIDailyMarketBriefDeliveryChannel {
  switch (channel) {
    case 'email_placeholder':
      return AIDailyMarketBriefDeliveryChannel.EMAIL_PLACEHOLDER;
    case 'in_app':
    default:
      return AIDailyMarketBriefDeliveryChannel.IN_APP;
  }
}

@Injectable()
export class DailyMarketBriefPreferencesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly portfolioSnapshotsService: PortfolioSnapshotsService,
  ) {}

  async getPreferences(
    userId: string,
  ): Promise<DailyMarketBriefPreferenceView> {
    const record =
      await this.prisma.aIDailyMarketBriefPreferenceRecord.findUnique({
        where: { userId },
      });

    if (!record) {
      return {
        enabled: false,
        cadence: 'daily',
        deliveryTimeLocal: '08:00',
        timezone: 'America/Los_Angeles',
        reportScope: 'portfolio_aware',
        deliveryChannel: 'in_app',
      };
    }

    return {
      enabled: record.enabled,
      cadence: mapCadenceToView(record.cadence),
      deliveryTimeLocal: record.deliveryTimeLocal,
      timezone: record.timezone,
      reportScope: mapScopeToView(record.reportScope),
      deliveryChannel: mapDeliveryChannelToView(record.deliveryChannel),
      sourceSnapshotId: record.sourceSnapshotId ?? undefined,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  async updatePreferences(
    userId: string,
    dto: UpdateDailyMarketBriefPreferencesDto,
  ): Promise<DailyMarketBriefPreferenceView> {
    const sourceSnapshotId = dto.sourceSnapshotId?.trim() || undefined;
    if (sourceSnapshotId) {
      const snapshot = await this.portfolioSnapshotsService.getSnapshotById(
        sourceSnapshotId,
        userId,
      );
      if (!snapshot) {
        throw new NotFoundException(
          `Portfolio snapshot not found: ${sourceSnapshotId}`,
        );
      }
    }

    await this.prisma.aIDailyMarketBriefPreferenceRecord.upsert({
      where: { userId },
      create: {
        userId,
        enabled: dto.enabled,
        cadence: mapCadenceToPrisma(dto.cadence),
        deliveryTimeLocal: dto.deliveryTimeLocal,
        timezone: dto.timezone.trim(),
        reportScope: mapScopeToPrisma(dto.reportScope),
        deliveryChannel: mapDeliveryChannelToPrisma(dto.deliveryChannel),
        sourceSnapshotId,
      },
      update: {
        enabled: dto.enabled,
        cadence: mapCadenceToPrisma(dto.cadence),
        deliveryTimeLocal: dto.deliveryTimeLocal,
        timezone: dto.timezone.trim(),
        reportScope: mapScopeToPrisma(dto.reportScope),
        deliveryChannel: mapDeliveryChannelToPrisma(dto.deliveryChannel),
        sourceSnapshotId,
      },
    });

    return this.getPreferences(userId);
  }
}
