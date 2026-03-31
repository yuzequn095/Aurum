'use client';

import { useEffect, useMemo, useState } from 'react';
import type { AIReportArtifact, FinancialHealthScoreArtifact, PortfolioSnapshot } from '@aurum/core';
import { listAIReports } from '@/lib/api/ai-reports';
import {
  getCurrentUserEntitlements,
  type CurrentUserEntitlementsView,
} from '@/lib/api/entitlements';
import { listFinancialHealthScores } from '@/lib/api/financial-health-scores';
import { listPortfolioSnapshots } from '@/lib/api/portfolio-snapshots';

type HomeOverviewState = {
  snapshots: PortfolioSnapshot[];
  reports: AIReportArtifact[];
  scores: FinancialHealthScoreArtifact[];
  entitlements: CurrentUserEntitlementsView | null;
  loading: boolean;
  errors: string[];
};

function sortByNewest<T>(items: T[], getTimestamp: (item: T) => number): T[] {
  return [...items].sort((left, right) => getTimestamp(right) - getTimestamp(left));
}

function toTimestamp(value: string | undefined | null): number {
  if (!value) {
    return 0;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

export function useHomeOverview() {
  const [state, setState] = useState<HomeOverviewState>({
    snapshots: [],
    reports: [],
    scores: [],
    entitlements: null,
    loading: true,
    errors: [],
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const [snapshotsResult, reportsResult, scoresResult, entitlementsResult] =
        await Promise.allSettled([
          listPortfolioSnapshots(),
          listAIReports(),
          listFinancialHealthScores(),
          getCurrentUserEntitlements(),
        ]);

      if (cancelled) {
        return;
      }

      const nextErrors = [
        snapshotsResult.status === 'rejected' ? snapshotsResult.reason : null,
        reportsResult.status === 'rejected' ? reportsResult.reason : null,
        scoresResult.status === 'rejected' ? scoresResult.reason : null,
        entitlementsResult.status === 'rejected' ? entitlementsResult.reason : null,
      ]
        .map((error) => (error instanceof Error ? error.message : null))
        .filter((message): message is string => Boolean(message));

      setState({
        snapshots: snapshotsResult.status === 'fulfilled' ? snapshotsResult.value : [],
        reports: reportsResult.status === 'fulfilled' ? reportsResult.value : [],
        scores: scoresResult.status === 'fulfilled' ? scoresResult.value : [],
        entitlements: entitlementsResult.status === 'fulfilled' ? entitlementsResult.value : null,
        loading: false,
        errors: nextErrors,
      });
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const snapshots = sortByNewest(
      state.snapshots,
      (snapshot) => toTimestamp(snapshot.metadata.snapshotDate) || toTimestamp(snapshot.createdAt),
    );
    const reports = sortByNewest(state.reports, (report) => toTimestamp(report.createdAt));
    const scores = sortByNewest(state.scores, (score) => toTimestamp(score.createdAt));

    return {
      ...state,
      snapshots,
      reports,
      scores,
      latestSnapshot: snapshots[0] ?? null,
      latestReport: reports[0] ?? null,
      latestScore: scores[0] ?? null,
    };
  }, [state]);
}
