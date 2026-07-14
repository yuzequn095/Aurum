import type {
  PortfolioChangeExplanation,
  PortfolioDiagnostics,
  PortfolioHistoryScope,
  PortfolioHistorySummary,
  PortfolioSnapshot,
} from '@aurum/core';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PortfolioSnapshotsService } from './portfolio-snapshots.service';

export interface PortfolioAIContext {
  version: 'portfolio-ai-context-v1';
  snapshot: PortfolioSnapshot;
  diagnostics: PortfolioDiagnostics | null;
  changeExplanation: PortfolioChangeExplanation | null;
  historyScope: PortfolioHistoryScope;
  historySummary: PortfolioHistorySummary;
  baselineSnapshotId?: string;
  dataLimitations: string[];
}

@Injectable()
export class PortfolioAIContextService {
  constructor(
    private readonly portfolioSnapshotsService: PortfolioSnapshotsService,
  ) {}

  async getContext(
    userId: string,
    sourceSnapshotId?: string,
  ): Promise<PortfolioAIContext> {
    const explicitSnapshotId = sourceSnapshotId?.trim();
    const snapshot = explicitSnapshotId
      ? await this.portfolioSnapshotsService.getSnapshotById(
          explicitSnapshotId,
          userId,
        )
      : this.selectPreferredSnapshot(
          await this.portfolioSnapshotsService.listSnapshots(userId),
        );

    if (!snapshot) {
      throw new BadRequestException(
        explicitSnapshotId
          ? `Portfolio snapshot not found: ${explicitSnapshotId}`
          : 'A portfolio snapshot is required to assemble AI context.',
      );
    }

    return this.assembleForSnapshot(userId, snapshot);
  }

  async assembleForSnapshot(
    userId: string,
    snapshot: PortfolioSnapshot,
  ): Promise<PortfolioAIContext> {
    if (!snapshot.id?.trim()) {
      throw new BadRequestException(
        'A persisted portfolio snapshot is required to assemble AI context.',
      );
    }

    const historyScope: PortfolioHistoryScope = snapshot.metadata.sourceId
      ? 'source'
      : 'consolidated';
    const [diagnostics, changeExplanation, history] = await Promise.all([
      this.portfolioSnapshotsService.getSnapshotDiagnostics(
        snapshot.id,
        userId,
      ),
      this.portfolioSnapshotsService.getSnapshotChangeExplanation(
        snapshot.id,
        'previous',
        userId,
      ),
      this.portfolioSnapshotsService.getPortfolioHistory(
        snapshot.metadata.sourceId
          ? {
              scope: 'source',
              sourceId: snapshot.metadata.sourceId,
              limit: 24,
            }
          : { scope: 'consolidated', limit: 24 },
        userId,
      ),
    ]);
    const dataLimitations = new Set(changeExplanation?.dataLimitations ?? []);

    if (history.summary.pointCount < 2) {
      dataLimitations.add(
        'Fewer than two snapshots are available in this history scope.',
      );
    }
    if (diagnostics?.dataHealth.status === 'stale') {
      dataLimitations.add(
        'Portfolio diagnostics indicate that one or more sources are stale.',
      );
    }
    if (diagnostics?.dataHealth.status === 'incomplete') {
      dataLimitations.add(
        'Portfolio diagnostics indicate incomplete account lineage.',
      );
    }

    return {
      version: 'portfolio-ai-context-v1',
      snapshot,
      diagnostics,
      changeExplanation,
      historyScope,
      historySummary: history.summary,
      baselineSnapshotId: changeExplanation?.baselineSnapshotId,
      dataLimitations: [...dataLimitations],
    };
  }

  selectPreferredSnapshot(
    snapshots: PortfolioSnapshot[],
  ): PortfolioSnapshot | null {
    return (
      snapshots.find((snapshot) => !snapshot.metadata.sourceId) ??
      snapshots[0] ??
      null
    );
  }
}
