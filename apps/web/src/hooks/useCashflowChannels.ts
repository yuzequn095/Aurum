import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/api';

export type CashflowChannel = {
  label: string;
  amountCents: number;
  transactionCount: number;
};

type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

type TransactionRef = {
  id: string;
  amountCents: number;
  type: TransactionType;
  merchant: string | null;
  account?: { id: string; name: string; currency: string } | null;
  category?: { id: string; name: string; parentId: string | null } | null;
  subcategory?: { id: string; categoryId: string; name: string } | null;
};

type CashflowChannelsState = {
  incomeChannels: CashflowChannel[];
  expenseChannels: CashflowChannel[];
  loading: boolean;
  error: string | null;
};

const initialState: CashflowChannelsState = {
  incomeChannels: [],
  expenseChannels: [],
  loading: false,
  error: null,
};

function getChannelLabel(transaction: TransactionRef): string {
  if (transaction.category?.name) return transaction.category.name;
  if (transaction.merchant) return transaction.merchant;
  if (transaction.account?.name) return transaction.account.name;
  return transaction.type === 'INCOME' ? 'Uncategorized income' : 'Uncategorized spending';
}

function aggregateChannels(
  transactions: TransactionRef[],
  type: Extract<TransactionType, 'INCOME' | 'EXPENSE'>,
): CashflowChannel[] {
  const grouped = new Map<string, CashflowChannel>();

  transactions
    .filter((transaction) => transaction.type === type && transaction.amountCents > 0)
    .forEach((transaction) => {
      const label = getChannelLabel(transaction);
      const current = grouped.get(label) ?? {
        label,
        amountCents: 0,
        transactionCount: 0,
      };
      grouped.set(label, {
        ...current,
        amountCents: current.amountCents + transaction.amountCents,
        transactionCount: current.transactionCount + 1,
      });
    });

  return [...grouped.values()].sort((a, b) => b.amountCents - a.amountCents);
}

export function useCashflowChannels(year: number, month: number): CashflowChannelsState {
  const [state, setState] = useState<CashflowChannelsState>(initialState);

  useEffect(() => {
    let cancelled = false;

    async function loadChannels() {
      setState((current) => ({ ...current, loading: true, error: null }));
      try {
        const qs = new URLSearchParams({
          year: String(year),
          month: String(month),
          include: 'refs',
          limit: '200',
        });
        const transactions = await apiGet<TransactionRef[]>(`/v1/transactions?${qs.toString()}`);
        if (cancelled) return;
        setState({
          incomeChannels: aggregateChannels(transactions, 'INCOME'),
          expenseChannels: aggregateChannels(transactions, 'EXPENSE'),
          loading: false,
          error: null,
        });
      } catch (error) {
        if (cancelled) return;
        setState({
          incomeChannels: [],
          expenseChannels: [],
          loading: false,
          error: error instanceof Error ? error.message : 'Unable to load cashflow channels.',
        });
      }
    }

    void loadChannels();

    return () => {
      cancelled = true;
    };
  }, [year, month]);

  return state;
}
