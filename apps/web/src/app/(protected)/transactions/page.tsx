'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/toast/ToastProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Container, Section } from '@/components/ui/layout';
import { clearTokens, getAccessToken } from '@/lib/auth/tokens';
import { mapTransactionToRowVM, type TransactionItem } from '@/utils/transaction-row-vm';
import {
  API_BASE,
  ApiError,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  createCategory,
  createSubcategory,
  getCategories,
  getSubcategories,
} from '@/lib/api';

type Account = { id: string; name: string; currency: string };
type Category = { id: string; name: string; parentId: string | null };
type Subcategory = { id: string; categoryId: string; name: string };

type CreateTxPayload = {
  accountId: string;
  type: 'EXPENSE' | 'INCOME' | 'TRANSFER';
  amountCents: number;
  occurredAt: string;
  categoryId?: string;
  subcategoryId?: string;
  merchant: string;
  note?: string;
};

type UpdateTxPayload = {
  merchant?: string;
  note?: string;
  amountCents?: number;
  occurredAt?: string;
};

const LIMIT = 20;
const CREATE_NEW_OPTION = '__create_new__';
const LAST_FORM_DEFAULTS_KEY = 'aurum.lastTransactionFormDefaults';

type LastFormDefaults = {
  lastAccountId: string | null;
  lastCategoryId: string | null;
  lastSubcategoryId: string | null;
};

function getTodayDateOnly(date: Date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
}

function getCurrentYearMonth(date: Date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  return `${year}-${month}`;
}

function readLastFormDefaults(): LastFormDefaults {
  if (typeof window === 'undefined') {
    return {
      lastAccountId: null,
      lastCategoryId: null,
      lastSubcategoryId: null,
    };
  }

  try {
    const raw = window.localStorage.getItem(LAST_FORM_DEFAULTS_KEY);
    if (!raw) {
      return {
        lastAccountId: null,
        lastCategoryId: null,
        lastSubcategoryId: null,
      };
    }

    const parsed = JSON.parse(raw) as Partial<LastFormDefaults>;
    return {
      lastAccountId: typeof parsed.lastAccountId === 'string' ? parsed.lastAccountId : null,
      lastCategoryId: typeof parsed.lastCategoryId === 'string' ? parsed.lastCategoryId : null,
      lastSubcategoryId:
        typeof parsed.lastSubcategoryId === 'string' ? parsed.lastSubcategoryId : null,
    };
  } catch {
    return {
      lastAccountId: null,
      lastCategoryId: null,
      lastSubcategoryId: null,
    };
  }
}

function writeLastFormDefaults(defaults: LastFormDefaults): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LAST_FORM_DEFAULTS_KEY, JSON.stringify(defaults));
}

type Filters = {
  accountId: string;
  categoryId: string;
  from: string;
  to: string;
};

type ListFilters = {
  yearMonth: string;
  accountId: string;
  searchText: string;
};

export default function TransactionsPage() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [listYearMonth, setListYearMonth] = useState(getCurrentYearMonth());
  const [listAccountId, setListAccountId] = useState('');
  const [listSearchText, setListSearchText] = useState('');

  const [filterAccountId, setFilterAccountId] = useState<string>('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const [accountId, setAccountId] = useState('');
  const [createType, setCreateType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [subcategorySearch, setSubcategorySearch] = useState('');
  const [amountCents, setAmountCents] = useState('100');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [occurredAtDate, setOccurredAtDate] = useState(getTodayDateOnly());

  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editMerchant, setEditMerchant] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editAmountDollars, setEditAmountDollars] = useState('0.00');
  const [editOccurredAtDate, setEditOccurredAtDate] = useState(getTodayDateOnly());
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const buildTransactionsPath = (
    nextOffset: number,
    filters: Filters,
    listFilters: ListFilters,
  ) => {
    const qs = new URLSearchParams();
    qs.set('limit', String(LIMIT));
    qs.set('offset', String(nextOffset));
    qs.set('include', 'refs');
    if (listFilters.yearMonth) {
      const [year, month] = listFilters.yearMonth.split('-');
      if (year && month) {
        qs.set('year', year);
        qs.set('month', String(Number(month)));
      }
    }
    if (listFilters.accountId || filters.accountId) {
      qs.set('accountId', listFilters.accountId || filters.accountId);
    }
    if (listFilters.searchText.trim()) qs.set('q', listFilters.searchText.trim());
    if (filters.categoryId) qs.set('categoryId', filters.categoryId);
    if (filters.from) qs.set('from', new Date(filters.from).toISOString());
    if (filters.to) qs.set('to', new Date(filters.to).toISOString());
    return `/v1/transactions?${qs.toString()}`;
  };

  const getCurrentFilters = (): Filters => ({
    accountId: filterAccountId,
    categoryId: filterCategoryId,
    from,
    to,
  });

  const getCurrentListFilters = (): ListFilters => ({
    yearMonth: listYearMonth,
    accountId: listAccountId,
    searchText: listSearchText,
  });

  const refreshTransactions = async (
    filters: Filters = getCurrentFilters(),
    listFilters: ListFilters = getCurrentListFilters(),
  ) => {
    setRefreshing(true);
    try {
      setLoadErr(null);
      const list = await apiGet<TransactionItem[]>(buildTransactionsPath(0, filters, listFilters));
      setItems(list);
      setOffset(0);
      setHasMore(list.length === LIMIT);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e));
      setItems([]);
      setOffset(0);
      setHasMore(false);
    } finally {
      setRefreshing(false);
    }
  };

  const loadMoreTransactions = async () => {
    if (refreshing || loadingMore || !hasMore) return;

    const nextOffset = offset + LIMIT;
    setLoadingMore(true);
    try {
      setLoadErr(null);
      const more = await apiGet<TransactionItem[]>(
        buildTransactionsPath(nextOffset, getCurrentFilters(), getCurrentListFilters()),
      );
      setItems((prev) => [...prev, ...more]);
      setOffset(nextOffset);
      setHasMore(more.length === LIMIT);
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoadingMore(false);
    }
  };

  const handleCreateCategory = async (): Promise<string | null> => {
    const raw = window.prompt('New category name');
    const name = raw?.trim();
    if (!name) return null;

    const created = await createCategory(name);
    setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setCategoryId(created.id);
    setSubcategoryId(null);
    setSubcategorySearch('');
    return created.id;
  };

  const handleCreateSubcategory = async (selectedCategoryId: string): Promise<string | null> => {
    const raw = window.prompt('New subcategory name');
    const name = raw?.trim();
    if (!name) return null;

    const created = await createSubcategory(selectedCategoryId, name);
    setSubcategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setSubcategoryId(created.id);
    return created.id;
  };

  const onCategoryChange = async (value: string) => {
    if (value === CREATE_NEW_OPTION) {
      await handleCreateCategory();
      return;
    }

    setCategoryId(value || null);
    setSubcategoryId(null);
    setSubcategorySearch('');
  };

  const onSubcategoryChange = async (value: string) => {
    if (value === CREATE_NEW_OPTION) {
      if (!categoryId) {
        setSubmitErr('Select a category first.');
        return;
      }
      await handleCreateSubcategory(categoryId);
      return;
    }
    setSubcategoryId(value || null);
  };

  useEffect(() => {
    const loadSubcategories = async () => {
      if (!categoryId) {
        setSubcategories([]);
        setSubcategoryId(null);
        return;
      }

      try {
        const subs = await getSubcategories(categoryId);
        const sorted = [...subs].sort((a, b) => a.name.localeCompare(b.name));
        setSubcategories(sorted);
        setSubcategoryId((current) =>
          current && sorted.some((sub) => sub.id === current) ? current : null,
        );
      } catch (e) {
        setSubmitErr(e instanceof Error ? e.message : String(e));
        setSubcategories([]);
        setSubcategoryId(null);
      }
    };

    void loadSubcategories();
  }, [categoryId]);

  const filteredSubcategories = subcategories.filter((sub) =>
    sub.name.toLowerCase().includes(subcategorySearch.trim().toLowerCase()),
  );

  const filteredRows = useMemo(() => {
    return items.map((item) => ({ item, row: mapTransactionToRowVM(item) }));
  }, [items]);

  const applyListFilters = (next: Partial<ListFilters>) => {
    const nextFilters: ListFilters = {
      yearMonth: next.yearMonth ?? listYearMonth,
      accountId: next.accountId ?? listAccountId,
      searchText: next.searchText ?? listSearchText,
    };
    void refreshTransactions(getCurrentFilters(), nextFilters);
  };

  const handleApiFailure = (
    error: unknown,
    setFieldError: (message: string | null) => void,
  ): void => {
    if (error instanceof ApiError) {
      setFieldError(error.message);
      toast.error(error.message);
      if (error.status === 401) {
        clearTokens();
        router.replace('/login');
      }
      return;
    }

    setFieldError('Unexpected error');
    toast.error('Unexpected error');
  };

  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoadErr(null);
        const remembered = readLastFormDefaults();
        const [accs, cats] = await Promise.all([
          apiGet<Account[]>('/v1/accounts'),
          getCategories(),
        ]);
        setAccounts(accs);
        setCategories(cats);
        const nextAccountId =
          remembered.lastAccountId && accs.some((acc) => acc.id === remembered.lastAccountId)
            ? remembered.lastAccountId
            : (accs[0]?.id ?? '');
        const nextCategoryId =
          remembered.lastCategoryId && cats.some((cat) => cat.id === remembered.lastCategoryId)
            ? remembered.lastCategoryId
            : null;
        setAccountId(nextAccountId);
        setCategoryId(nextCategoryId);
        setSubcategoryId(nextCategoryId ? remembered.lastSubcategoryId : null);
        setCreateType('EXPENSE');
        setOccurredAtDate(getTodayDateOnly());
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : String(e));
      }

      await refreshTransactions();
    };

    void loadInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onApplyFilters = async () => {
    await refreshTransactions();
  };

  const onResetFilters = async () => {
    setFilterAccountId('');
    setFilterCategoryId('');
    setFrom('');
    setTo('');
    await refreshTransactions({
      accountId: '',
      categoryId: '',
      from: '',
      to: '',
    });
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitErr(null);

    const parsedAmount = Number(amountCents);
    if (!accountId) {
      setSubmitErr('Please select an account.');
      return;
    }
    if (!Number.isInteger(parsedAmount) || parsedAmount < 1) {
      setSubmitErr('amountCents must be an integer >= 1.');
      return;
    }
    if ((createType === 'INCOME' || createType === 'EXPENSE') && (!categoryId || !subcategoryId)) {
      setSubmitErr('Category and subcategory are required for income/expense.');
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateTxPayload = {
        accountId,
        type: createType,
        amountCents: parsedAmount,
        occurredAt: occurredAtDate,
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        merchant,
        note: note || undefined,
      };

      await apiPost<TransactionItem>('/v1/transactions', payload);
      writeLastFormDefaults({
        lastAccountId: accountId || null,
        lastCategoryId: categoryId,
        lastSubcategoryId: subcategoryId,
      });
      toast.success('Transaction created.');
      await refreshTransactions();
      setAmountCents('100');
      setCreateType('EXPENSE');
      setMerchant('');
      setNote('');
      setOccurredAtDate(getTodayDateOnly());
      setSubcategorySearch('');
    } catch (e) {
      handleApiFailure(e, setSubmitErr);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (tx: TransactionItem) => {
    setSelectedTx(tx);
    setEditMerchant(tx.merchant ?? '');
    setEditNote(tx.note ?? '');
    setEditAmountDollars((tx.amountCents / 100).toFixed(2));
    setEditOccurredAtDate(tx.occurredAt);
    setEditErr(null);
    setEditOpen(true);
  };

  const closeEditModal = () => {
    if (editSubmitting) return;
    setEditOpen(false);
    setSelectedTx(null);
    setEditErr(null);
  };

  const onRowClick = async (txId: string) => {
    try {
      const fetched = await apiGet<TransactionItem>(`/v1/transactions/${txId}`);
      const cached = items.find((item) => item.id === txId);
      openEditModal(cached ? { ...cached, ...fetched } : fetched);
    } catch (e) {
      handleApiFailure(e, setLoadErr);
    }
  };

  const onSaveEdit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTx) return;

    const amountNum = Number(editAmountDollars);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setEditErr('Amount must be a positive number.');
      return;
    }

    const newAmountCents = Math.round(amountNum * 100);
    if (newAmountCents < 1) {
      setEditErr('Amount is too small.');
      return;
    }

    try {
      setEditSubmitting(true);
      setEditErr(null);

      const payload: UpdateTxPayload = {
        merchant: editMerchant || undefined,
        note: editNote || undefined,
        amountCents: newAmountCents,
        occurredAt: editOccurredAtDate,
      };

      const updated = await apiPatch<TransactionItem>(`/v1/transactions/${selectedTx.id}`, payload);
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      toast.success('Transaction updated.');
      closeEditModal();
    } catch (e) {
      handleApiFailure(e, setEditErr);
    } finally {
      setEditSubmitting(false);
    }
  };

  const onDeleteTx = async (tx: TransactionItem) => {
    const confirmed = window.confirm('Delete this transaction?');
    if (!confirmed) return;

    try {
      await apiDelete<{ ok: boolean }>(`/v1/transactions/${tx.id}`);
      await refreshTransactions();
      if (selectedTx?.id === tx.id) {
        setEditOpen(false);
        setSelectedTx(null);
      }
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : String(e));
    }
  };

  const onLogout = () => {
    clearTokens();
    router.push('/login');
  };

  const onExportCsv = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (listYearMonth) {
        const [year, month] = listYearMonth.split('-');
        if (year && month) {
          params.set('year', year);
          params.set('month', String(Number(month)));
        }
      }
      if (listAccountId) params.set('accountId', listAccountId);
      if (listSearchText.trim()) params.set('q', listSearchText.trim());

      const token = getAccessToken();
      const response = await fetch(`${API_BASE}/v1/export/transactions.csv?${params.toString()}`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearTokens();
          router.replace('/login');
          return;
        }
        throw new Error('Failed to export CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${listYearMonth || 'all'}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('CSV export started.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export CSV';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Container className="min-h-screen bg-aurum-bg text-aurum-text py-8 space-y-10">
      <main className="space-y-10">
        <div className="flex items-center justify-between gap-4">
          <h1 style={{ fontSize: 24, fontWeight: 600 }}>Transactions</h1>
          <Button type="button" variant="secondary" onClick={onLogout}>
            Logout
          </Button>
        </div>

        <Section title="Filters">
          <Card>
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <label>
                  Account
                  <select
                    value={filterAccountId}
                    onChange={(e) => setFilterAccountId(e.target.value)}
                    style={{ width: '100%', marginTop: 4 }}
                  >
                    <option value="">All accounts</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Category
                  <select
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                    style={{ width: '100%', marginTop: 4 }}
                  >
                    <option value="">All categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  From
                  <input
                    type="date"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </label>

                <label>
                  To
                  <input
                    type="date"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </label>

                <div className="flex justify-end gap-3 pt-4 md:col-span-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={onApplyFilters}
                    className="w-[120px]"
                    disabled={refreshing}
                  >
                    {refreshing ? 'Applying...' : 'Apply'}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={onResetFilters}
                    className="w-[120px]"
                    disabled={refreshing}
                  >
                    Reset
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </Section>

        <Section title="Create Transaction">
          <Card>
            <CardContent className="pt-4">
              <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <label>
                  Account
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    style={{ width: '100%', marginTop: 4 }}
                    required
                  >
                    {accounts.length === 0 && <option value="">No accounts</option>}
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.currency})
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Type
                  <select
                    value={createType}
                    onChange={(e) =>
                      setCreateType(e.target.value as 'EXPENSE' | 'INCOME' | 'TRANSFER')
                    }
                    style={{ width: '100%', marginTop: 4 }}
                    required
                  >
                    <option value="EXPENSE">Expense</option>
                    <option value="INCOME">Income</option>
                    <option value="TRANSFER">Transfer</option>
                  </select>
                </label>

                <label>
                  Category
                  <select
                    value={categoryId ?? ''}
                    onChange={(e) => void onCategoryChange(e.target.value)}
                    style={{ width: '100%', marginTop: 4 }}
                    required={createType === 'INCOME' || createType === 'EXPENSE'}
                  >
                    <option value="">Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                    <option value={CREATE_NEW_OPTION}>+ Create new...</option>
                  </select>
                </label>

                <label>
                  Subcategory
                  <input
                    type="text"
                    value={subcategorySearch}
                    onChange={(e) => setSubcategorySearch(e.target.value)}
                    style={{ width: '100%', marginTop: 4, marginBottom: 4 }}
                    placeholder="Search subcategories..."
                    disabled={!categoryId}
                  />
                  <select
                    value={subcategoryId ?? ''}
                    onChange={(e) => void onSubcategoryChange(e.target.value)}
                    style={{ width: '100%', marginTop: 0 }}
                    required={createType === 'INCOME' || createType === 'EXPENSE'}
                    disabled={!categoryId}
                  >
                    <option value="">
                      {categoryId ? 'Select subcategory' : 'Select category first'}
                    </option>
                    {filteredSubcategories.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                    {categoryId ? <option value={CREATE_NEW_OPTION}>+ Create new...</option> : null}
                  </select>
                </label>

                <label>
                  Amount (cents)
                  <input
                    type="number"
                    min={1}
                    step={1}
                    value={amountCents}
                    onChange={(e) => setAmountCents(e.target.value)}
                    style={{ width: '100%', marginTop: 4 }}
                    required
                  />
                </label>

                <label>
                  Occurred At
                  <input
                    type="date"
                    value={occurredAtDate}
                    onChange={(e) => setOccurredAtDate(e.target.value)}
                    style={{ width: '100%', marginTop: 4 }}
                    required
                  />
                </label>

                <label>
                  Merchant
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    style={{ width: '100%', marginTop: 4 }}
                    placeholder="Starbucks"
                  />
                </label>

                <label>
                  Note
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    style={{ width: '100%', marginTop: 4 }}
                    placeholder="optional"
                  />
                </label>

                {submitErr && <p className="m-0 text-red-600 md:col-span-2">Error: {submitErr}</p>}

                <div className="flex justify-end gap-3 pt-4 md:col-span-2">
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting || accounts.length === 0}
                    className="w-[160px]"
                  >
                    {submitting ? 'Creating...' : 'Create Transaction'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </Section>

        {loadErr && <p style={{ color: 'crimson' }}>Error: {loadErr}</p>}
        {!loadErr && refreshing && items.length === 0 && <p>Loading...</p>}

        <Section>
          <Card className="mb-4">
            <CardContent className="pt-4">
              <div className="mb-4 flex justify-end">
                <Button type="button" onClick={() => void onExportCsv()} disabled={exporting}>
                  {exporting ? 'Exporting...' : 'Export CSV'}
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label>
                  Month
                  <input
                    type="month"
                    value={listYearMonth}
                    onChange={(e) => {
                      const value = e.target.value;
                      setListYearMonth(value);
                      applyListFilters({ yearMonth: value });
                    }}
                    style={{ width: '100%', marginTop: 4 }}
                  />
                </label>

                <label>
                  Account
                  <select
                    value={listAccountId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setListAccountId(value);
                      applyListFilters({ accountId: value });
                    }}
                    style={{ width: '100%', marginTop: 4 }}
                  >
                    <option value="">All accounts</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Search
                  <input
                    type="text"
                    value={listSearchText}
                    onChange={(e) => {
                      const value = e.target.value;
                      setListSearchText(value);
                      applyListFilters({ searchText: value });
                    }}
                    style={{ width: '100%', marginTop: 4 }}
                    placeholder="Merchant or note"
                  />
                </label>
              </div>
            </CardContent>
          </Card>

          <div>
            {filteredRows.map(({ item: tx, row }) => {
              return (
                <Card key={row.id} className="mb-4 transition-shadow hover:shadow-aurum">
                  <CardContent
                    className="pt-4 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    onClick={() => void onRowClick(row.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        void onRowClick(row.id);
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {row.merchant}{' '}
                          <span style={{ opacity: 0.6, fontWeight: 400 }}>- {row.type}</span>
                        </div>
                        <div style={{ opacity: 0.75, marginTop: 4 }}>{row.date}</div>
                        <div style={{ opacity: 0.75, marginTop: 4 }}>Account: {row.accountName}</div>
                        <div style={{ opacity: 0.75, marginTop: 4 }}>Category: {row.categoryPath}</div>
                        {row.note && <div style={{ marginTop: 6 }}>{row.note}</div>}
                      </div>

                      <div style={{ display: 'grid', justifyItems: 'end', gap: 8 }}>
                        <div style={{ fontWeight: 600 }}>{row.signedAmount}</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              void onRowClick(row.id);
                            }}
                            className="h-10 min-w-[84px] px-4"
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              void onDeleteTx(tx);
                            }}
                            className="h-10 min-w-[84px] px-4"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {items.length > 0 && hasMore && (
            <Button
              type="button"
              onClick={loadMoreTransactions}
              disabled={loadingMore || refreshing}
            >
              {loadingMore ? 'Loading more...' : 'Load more'}
            </Button>
          )}
        </Section>

        <Modal open={editOpen} onClose={closeEditModal} title="Edit Transaction">
          <form onSubmit={onSaveEdit} style={{ display: 'grid', gap: 10 }}>
            <label>
              Merchant
              <input
                type="text"
                value={editMerchant}
                onChange={(e) => setEditMerchant(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
                placeholder="merchant"
              />
            </label>

            <label>
              Note
              <input
                type="text"
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
                placeholder="optional"
              />
            </label>

            <label>
              Amount (USD)
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={editAmountDollars}
                onChange={(e) => setEditAmountDollars(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
                required
              />
            </label>

            <label>
              Occurred At
              <input
                type="date"
                value={editOccurredAtDate}
                onChange={(e) => setEditOccurredAtDate(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
                required
              />
            </label>

            {editErr && <p style={{ color: 'crimson', margin: 0 }}>Error: {editErr}</p>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={closeEditModal}
                disabled={editSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={editSubmitting || !selectedTx}>
                {editSubmitting ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </Container>
  );
}
