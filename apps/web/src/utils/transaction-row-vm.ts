import { formatSignedAmount } from '@/utils/formatters';

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER';

export type TransactionItem = {
  id: string;
  occurredAt: string;
  merchant: string | null;
  amountCents: number;
  currency: string;
  note: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  accountId: string;
  type: TransactionType;
  account?: { id: string; name: string; currency: string };
  category?: { id: string; name: string; parentId: string | null } | null;
  subcategory?: { id: string; categoryId: string; name: string } | null;
};

export type TransactionRowVM = {
  id: string;
  date: string;
  type: TransactionType;
  signedAmount: string;
  accountName: string;
  categoryPath: string;
  merchant: string;
  note: string | null;
};

function toDateOnly(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.slice(0, 10);
  }
  return parsed.toISOString().slice(0, 10);
}

function toCategoryPath(item: TransactionItem): string {
  const categoryName = item.category?.name ?? null;
  const subcategoryName = item.subcategory?.name ?? null;

  if (categoryName && subcategoryName) return `${categoryName} > ${subcategoryName}`;
  if (categoryName) return categoryName;
  if (subcategoryName) return subcategoryName;
  return 'Uncategorized';
}

export function mapTransactionToRowVM(item: TransactionItem): TransactionRowVM {
  return {
    id: item.id,
    date: toDateOnly(item.occurredAt),
    type: item.type,
    signedAmount: formatSignedAmount(item.type, item.amountCents, item.currency),
    accountName: item.account?.name ?? item.accountId,
    categoryPath: toCategoryPath(item),
    merchant: item.merchant ?? '(no merchant)',
    note: item.note,
  };
}
