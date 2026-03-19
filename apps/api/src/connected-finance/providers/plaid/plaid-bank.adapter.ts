import { Injectable, InternalServerErrorException } from '@nestjs/common';
import type {
  BankBalanceSelectionStrategy,
  ConnectedBankSourceAdapter,
  ConnectedBankSourceAdapterInput,
  ConnectedSourceAccount,
  NormalizedPortfolioPositionInput,
  PortfolioAssetCategory,
} from '@aurum/core';

function mapBankAccountCategory(
  account: ConnectedSourceAccount,
): PortfolioAssetCategory {
  const normalizedType = account.accountType.trim().toLowerCase();
  if (normalizedType === 'depository') {
    return 'cash';
  }

  return 'other';
}

@Injectable()
export class PlaidBankAdapter implements ConnectedBankSourceAdapter {
  readonly kind = 'BANK' as const;
  readonly providerKey = 'PLAID' as const;
  readonly normalizationVersion = 'plaid-bank-adapter@1.0.0';
  readonly balanceSelectionStrategy: BankBalanceSelectionStrategy =
    'AVAILABLE_THEN_CURRENT';

  normalize(input: ConnectedBankSourceAdapterInput) {
    const balanceByExternalAccountId = new Map(
      input.balances.map((balance) => [balance.externalAccountId, balance]),
    );

    const providerAccountByExternalAccountId = new Map(
      input.accountInputs.map((account) => [
        account.externalAccountId,
        account,
      ]),
    );

    const positions = input.accounts
      .map((account) =>
        this.buildPosition(
          account,
          providerAccountByExternalAccountId.get(
            account.externalAccountId ?? '',
          ),
          balanceByExternalAccountId.get(account.externalAccountId ?? ''),
        ),
      )
      .filter(
        (position): position is NormalizedPortfolioPositionInput =>
          position !== null,
      );

    if (positions.length === 0) {
      throw new InternalServerErrorException(
        'Plaid bank sync returned no balances that could be normalized.',
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
        input.balances[0]?.currency ??
        input.accounts[0]?.currency ??
        input.source.baseCurrency,
      totalValue,
      cashValue,
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
        materializedFrom: 'plaid_balance_sync',
        sourceId: input.source.id,
        providerKey: this.providerKey,
        balanceSelectionStrategy: this.balanceSelectionStrategy,
      },
    };
  }

  private buildPosition(
    account: ConnectedSourceAccount,
    providerAccount:
      | ConnectedBankSourceAdapterInput['accountInputs'][number]
      | undefined,
    balance: ConnectedBankSourceAdapterInput['balances'][number] | undefined,
  ): NormalizedPortfolioPositionInput | null {
    const selectedBalance =
      balance?.availableBalance ?? balance?.currentBalance ?? null;

    // v1 valuation rule: prefer available balance when Plaid provides it,
    // otherwise fall back to current balance.
    if (selectedBalance === null) {
      return null;
    }

    return {
      assetKey: `bank:${account.id}`,
      name:
        providerAccount?.officialName ??
        providerAccount?.displayName ??
        account.officialName ??
        account.displayName,
      marketValue: selectedBalance,
      category: mapBankAccountCategory(account),
      sourceAccountRef: account.id,
      metadata: {
        externalAccountId: account.externalAccountId,
        officialName:
          providerAccount?.officialName ?? account.officialName ?? undefined,
        currentBalance: balance?.currentBalance,
        availableBalance: balance?.availableBalance,
        balanceAsOf: balance?.asOf,
      },
    };
  }
}
