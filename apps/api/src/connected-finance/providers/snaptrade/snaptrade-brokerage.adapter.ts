import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type {
  ConnectedBrokerageSourceAdapter,
  ConnectedBrokerageSourceAdapterInput,
  ConnectedSourceAccount,
  NormalizedPortfolioPositionInput,
  PortfolioAssetCategory,
} from '@aurum/core';

function mapSecurityTypeToCategory(
  securityType: string | undefined,
): PortfolioAssetCategory {
  const normalized = securityType?.trim().toLowerCase();

  if (normalized?.includes('cash')) {
    return 'cash';
  }

  if (normalized?.includes('etf')) {
    return 'etf';
  }

  if (
    normalized?.includes('stock') ||
    normalized?.includes('equity') ||
    normalized?.includes('common share')
  ) {
    return 'equity';
  }

  if (normalized?.includes('crypto')) {
    return 'crypto';
  }

  if (normalized?.includes('fund') || normalized?.includes('mutual')) {
    return 'fund';
  }

  return 'other';
}

@Injectable()
export class SnapTradeBrokerageAdapter implements ConnectedBrokerageSourceAdapter {
  readonly kind = 'BROKERAGE' as const;
  readonly providerKey = 'SNAPTRADE' as const;
  readonly normalizationVersion = 'snaptrade-brokerage-adapter@1.0.0';

  normalize(input: ConnectedBrokerageSourceAdapterInput) {
    const accountByExternalAccountId = new Map(
      input.accounts
        .filter((account) => account.externalAccountId)
        .map((account) => [account.externalAccountId as string, account]),
    );
    const accountInputByExternalAccountId = new Map(
      input.accountInputs.map((account) => [
        account.externalAccountId,
        account,
      ]),
    );

    const positions = input.positions
      .map((position) =>
        this.buildPosition(
          accountByExternalAccountId.get(position.externalAccountId),
          accountInputByExternalAccountId.get(position.externalAccountId),
          position,
        ),
      )
      .filter(
        (position): position is NormalizedPortfolioPositionInput =>
          position !== null,
      );

    // v1 rule: omit synthetic cash positions because some providers expose
    // money-market positions as cash-equivalent holdings, which would risk
    // double-counting against reported balances.
    if (positions.length === 0) {
      throw new InternalServerErrorException(
        'SnapTrade brokerage sync returned no holdings that could be normalized.',
      );
    }

    const totalValue = positions.reduce(
      (sum, position) => sum + position.marketValue,
      0,
    );
    const cashValue = positions
      .filter((position) => position.category === 'cash')
      .reduce((sum, position) => sum + position.marketValue, 0);

    return {
      portfolioName: input.source.displayName,
      sourceLabel: input.source.institutionName ?? input.source.displayName,
      snapshotDate: input.snapshotDate,
      valuationCurrency:
        input.positions[0]?.currency ??
        input.accounts[0]?.currency ??
        input.source.baseCurrency,
      totalValue,
      cashValue: cashValue > 0 ? cashValue : undefined,
      ingestionMode: 'CONNECTED_SYNC' as const,
      normalizationVersion: this.normalizationVersion,
      positions,
      accounts: input.accounts.map((account) => ({
        externalAccountId: account.externalAccountId,
        displayName: account.displayName,
        accountType: account.accountType,
        currency: account.currency,
        maskLast4: account.maskLast4,
        isActive: account.isActive,
        metadata: account.metadata,
      })),
      metadata: {
        materializedFrom: 'snaptrade_holdings_sync',
        sourceId: input.source.id,
        providerKey: this.providerKey,
        balanceCount: input.balances.length,
      },
    };
  }

  private buildPosition(
    account: ConnectedSourceAccount | undefined,
    accountInput:
      | ConnectedBrokerageSourceAdapterInput['accountInputs'][number]
      | undefined,
    position: ConnectedBrokerageSourceAdapterInput['positions'][number],
  ): NormalizedPortfolioPositionInput | null {
    if (!account || position.cashEquivalent || !position.marketValue) {
      return null;
    }

    return {
      assetKey: `brokerage:${account.id}:${
        position.providerInstrumentId ??
        position.symbol ??
        position.rawSymbol ??
        'unknown'
      }`,
      symbol: position.symbol,
      name:
        position.description ??
        position.symbol ??
        accountInput?.officialName ??
        account.displayName,
      quantity: position.quantity,
      marketValue: position.marketValue,
      category: mapSecurityTypeToCategory(position.securityType),
      sourceAccountRef: account.id,
      metadata: {
        externalAccountId: account.externalAccountId,
        providerInstrumentId: position.providerInstrumentId,
        rawSymbol: position.rawSymbol,
        exchange: position.exchange,
        securityType: position.securityType,
        currency: position.currency,
        unitPrice: position.unitPrice,
      },
    };
  }
}
