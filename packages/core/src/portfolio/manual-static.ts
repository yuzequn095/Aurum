import type {
  ConnectedSource,
  ConnectedSourceAccount,
  ConnectedSourceAdapter,
  ConnectedSyncRun,
  NormalizedPortfolioSnapshotInput,
} from './connected-finance';
import type { PortfolioAssetCategory, PortfolioSnapshot } from './types';

export interface ManualStaticValuationInput {
  userId: string;
  sourceId: string;
  sourceAccountId: string;
  valuationDate: string;
  currency: string;
  marketValue: number;
  quantity?: number;
  unitPrice?: number;
  symbol?: string;
  assetName?: string;
  note?: string;
  metadata?: Record<string, unknown>;
}

export interface ManualStaticValuation extends ManualStaticValuationInput {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface ManualStaticSourceAdapterInput {
  source: ConnectedSource;
  accounts: ConnectedSourceAccount[];
  latestValuations: ManualStaticValuation[];
  snapshotDate: string;
}

export interface ManualStaticSnapshotMaterializationResult {
  snapshot: PortfolioSnapshot;
  syncRun: ConnectedSyncRun;
  latestValuationCount: number;
  materializedAccountCount: number;
  snapshotDate: string;
}

function mapAssetTypeToCategory(
  assetType: ConnectedSourceAccount['assetType'],
): PortfolioAssetCategory | undefined {
  switch (assetType) {
    case 'cash':
      return 'cash';
    case 'equity':
      return 'equity';
    case 'etf':
      return 'etf';
    case 'crypto':
      return 'crypto';
    case 'fund':
      return 'fund';
    case 'other':
      return 'other';
    default:
      return undefined;
  }
}

export class ManualStaticSourceAdapter implements ConnectedSourceAdapter<ManualStaticSourceAdapterInput> {
  readonly kind = 'MANUAL_STATIC' as const;
  readonly normalizationVersion = 'manual-static-source-adapter@1.0.0';

  normalize(input: ManualStaticSourceAdapterInput): NormalizedPortfolioSnapshotInput {
    const valuationByAccountId = new Map(
      input.latestValuations.map((valuation) => [valuation.sourceAccountId, valuation]),
    );

    const positions = input.accounts
      .map((account) => {
        const valuation = valuationByAccountId.get(account.id);
        if (!valuation) {
          return null;
        }

        return {
          assetKey: `manual-static:${account.id}`,
          symbol: valuation.symbol,
          name: valuation.assetName ?? account.displayName,
          quantity: valuation.quantity,
          marketValue: valuation.marketValue,
          category: mapAssetTypeToCategory(account.assetType),
          sourceAccountRef: account.id,
          notes: valuation.note,
          metadata: {
            valuationId: valuation.id,
            valuationDate: valuation.valuationDate,
            unitPrice: valuation.unitPrice,
            assetSubType: account.assetSubType,
            institutionOrIssuer: account.institutionOrIssuer,
          },
        };
      })
      .filter((position): position is NonNullable<typeof position> => position !== null);

    const totalValue = positions.reduce((sum, position) => sum + position.marketValue, 0);
    const cashValue = positions
      .filter((position) => position.category === 'cash')
      .reduce((sum, position) => sum + position.marketValue, 0);

    return {
      portfolioName: input.source.displayName,
      sourceLabel: input.source.displayName,
      snapshotDate: input.snapshotDate,
      valuationCurrency:
        input.latestValuations[0]?.currency ??
        input.accounts[0]?.currency ??
        input.source.baseCurrency,
      totalValue,
      cashValue: cashValue > 0 ? cashValue : undefined,
      ingestionMode: 'MANUAL_STATIC',
      normalizationVersion: this.normalizationVersion,
      sourceFingerprint: undefined,
      accounts: input.accounts.map((account) => ({
        externalAccountId: account.externalAccountId,
        displayName: account.displayName,
        accountType: account.accountType,
        currency: account.currency,
        isActive: account.isActive,
        metadata: account.metadata,
      })),
      positions,
      metadata: {
        materializedFrom: 'manual_static_latest_valuations',
        sourceId: input.source.id,
      },
    };
  }
}
