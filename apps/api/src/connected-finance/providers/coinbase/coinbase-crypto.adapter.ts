import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type {
  ConnectedCryptoSourceAdapter,
  ConnectedCryptoSourceAdapterInput,
  ConnectedSourceAccount,
  NormalizedPortfolioPositionInput,
  PortfolioAssetCategory,
} from '@aurum/core';

function mapCoinbaseCategory(
  account: ConnectedSourceAccount,
): PortfolioAssetCategory {
  return account.assetType === 'cash' ? 'cash' : 'crypto';
}

@Injectable()
export class CoinbaseCryptoAdapter implements ConnectedCryptoSourceAdapter {
  readonly kind = 'CRYPTO' as const;
  readonly providerKey = 'COINBASE' as const;
  readonly normalizationVersion = 'coinbase-crypto-adapter@1.0.0';

  normalize(input: ConnectedCryptoSourceAdapterInput) {
    const balanceByExternalAccountId = new Map(
      input.balances.map((balance) => [balance.externalAccountId, balance]),
    );
    const accountInputByExternalAccountId = new Map(
      input.accountInputs.map((account) => [
        account.externalAccountId,
        account,
      ]),
    );

    const positions = input.accounts
      .map((account) =>
        this.buildPosition(
          account,
          accountInputByExternalAccountId.get(account.externalAccountId ?? ''),
          balanceByExternalAccountId.get(account.externalAccountId ?? ''),
        ),
      )
      .filter(
        (position): position is NormalizedPortfolioPositionInput =>
          position !== null,
      );

    if (positions.length === 0) {
      throw new InternalServerErrorException(
        'Coinbase crypto sync returned no balances that could be normalized.',
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
        input.balances[0]?.valuationCurrency ?? input.source.baseCurrency,
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
        isActive: account.isActive,
        metadata: account.metadata,
      })),
      metadata: {
        materializedFrom: 'coinbase_balance_sync',
        sourceId: input.source.id,
        providerKey: this.providerKey,
      },
    };
  }

  private buildPosition(
    account: ConnectedSourceAccount,
    providerAccount:
      | ConnectedCryptoSourceAdapterInput['accountInputs'][number]
      | undefined,
    balance: ConnectedCryptoSourceAdapterInput['balances'][number] | undefined,
  ): NormalizedPortfolioPositionInput | null {
    // v1 rule: ignore zero balances and skip positions when Coinbase cannot
    // provide or safely derive a fiat-native market value.
    if (
      !balance ||
      !balance.quantity ||
      balance.quantity <= 0 ||
      balance.marketValue === undefined
    ) {
      return null;
    }

    return {
      assetKey: `crypto:${account.id}:${balance.symbol ?? account.currency}`,
      symbol: balance.symbol,
      name:
        balance.assetName ??
        providerAccount?.assetName ??
        account.officialName ??
        account.displayName,
      quantity: balance.quantity,
      marketValue: balance.marketValue,
      category: mapCoinbaseCategory(account),
      sourceAccountRef: account.id,
      metadata: {
        externalAccountId: account.externalAccountId,
        assetId: balance.assetId,
        unitPrice: balance.unitPrice,
        valuationCurrency: balance.valuationCurrency,
        accountType: balance.accountType,
      },
    };
  }
}
