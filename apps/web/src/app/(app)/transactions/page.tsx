'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/PageContainer';
import { Modal } from '@/components/Modal';
import { useToast } from '@/components/toast/ToastProvider';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Section } from '@/components/ui/layout';
import { clearTokens } from '@/lib/auth/tokens';
import {
  ApiError,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  createAccount,
  createCategory,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  getCategories,
  getSubcategories,
} from '@/lib/api';

type Tx = {
  id: string;
  occurredAt: string;
  merchant: string | null;
  amountCents: number;
  currency: string;
  note: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
  accountId: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  account?: { id: string; name: string; currency: string };
  category?: { id: string; name: string; parentId: string | null } | null;
  subcategory?: { id: string; categoryId: string; name: string } | null;
};

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
  categoryId?: string;
  subcategoryId?: string;
};

const LIMIT = 20;
const CREATE_NEW_OPTION = '__create_new__';
const LAST_FORM_DEFAULTS_KEY = 'aurum.lastTransactionFormDefaults';

type LastFormDefaults = {
  lastAccountId: string | null;
  lastCategoryId: string | null;
  lastSubcategoryId: string | null;
};

function formatMoneyForType(type: Tx['type'], cents: number, currency: string) {
  const dollars = (Math.abs(cents) / 100).toFixed(2);
  const prefix = type === 'EXPENSE' ? '-' : type === 'INCOME' ? '+' : '';
  return `${prefix}${currency} ${dollars}`;
}

function getTodayDateOnly(date: Date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
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

export default function TransactionsPage() {
  const router = useRouter();
  const toast = useToast();
  const [items, setItems] = useState<Tx[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [filterAccountId, setFilterAccountId] = useState<string>('');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const [accountId, setAccountId] = useState('');
  const [createType, setCreateType] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER'>('EXPENSE');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<string | null>(null);
  const [subcategorySearch, setSubcategorySearch] = useState('');
  const [amountDollars, setAmountDollars] = useState('1.00');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [occurredAtDate, setOccurredAtDate] = useState(getTodayDateOnly());

  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editSubcategoryId, setEditSubcategoryId] = useState<string | null>(null);
  const [editSubcategories, setEditSubcategories] = useState<Subcategory[]>([]);
  const [editSubcategorySearch, setEditSubcategorySearch] = useState('');
  const [editMerchant, setEditMerchant] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editAmountDollars, setEditAmountDollars] = useState('0.00');
  const [editOccurredAtDate, setEditOccurredAtDate] = useState(getTodayDateOnly());
  const [editErr, setEditErr] = useState<string | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const buildTransactionsPath = (nextOffset: number, filters: Filters) => {
    const qs = new URLSearchParams();
    qs.set('limit', String(LIMIT));
    qs.set('offset', String(nextOffset));
    qs.set('include', 'refs');
    if (filters.accountId) qs.set('accountId', filters.accountId);
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

  const refreshTransactions = async (filters: Filters = getCurrentFilters()) => {
    setRefreshing(true);
    try {
      setLoadErr(null);
      const list = await apiGet<Tx[]>(buildTransactionsPath(0, filters));
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
      const more = await apiGet<Tx[]>(buildTransactionsPath(nextOffset, getCurrentFilters()));
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

  const handleCreateAccount = async (): Promise<string | null> => {
    const raw = window.prompt('New account name');
    const name = raw?.trim();
    if (!name) return null;

    const created = await createAccount(name);
    setAccounts((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
    setAccountId(created.id);
    return created.id;
  };

  const onAccountChange = async (value: string) => {
    if (value === CREATE_NEW_OPTION) {
      try {
        await handleCreateAccount();
      } catch (e) {
        handleApiFailure(e, setSubmitErr);
      }
      return;
    }
    setAccountId(value);
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

  const handleDeleteCategory = async (
    id: string,
    setFieldError: (message: string | null) => void = setSubmitErr,
  ): Promise<void> => {
    const category = categories.find((item) => item.id === id);
    const confirmed = window.confirm(
      `Delete category "${category?.name ?? 'this category'}"?`,
    );
    if (!confirmed) return;

    try {
      await deleteCategory(id);
      setCategories((prev) => prev.filter((item) => item.id !== id));
      setSubcategories((prev) => prev.filter((item) => item.categoryId !== id));
      setEditSubcategories((prev) => prev.filter((item) => item.categoryId !== id));

      if (filterCategoryId === id) setFilterCategoryId('');
      if (categoryId === id) {
        setCategoryId(null);
        setSubcategoryId(null);
        setSubcategorySearch('');
      }
      if (editCategoryId === id) {
        setEditCategoryId(null);
        setEditSubcategoryId(null);
        setEditSubcategorySearch('');
      }

      toast.success('Category deleted.');
      await refreshTransactions();
    } catch (e) {
      handleApiFailure(e, setFieldError);
    }
  };

  const handleDeleteSubcategory = async (
    id: string,
    setFieldError: (message: string | null) => void = setSubmitErr,
  ): Promise<void> => {
    const subcategory =
      subcategories.find((item) => item.id === id) ??
      editSubcategories.find((item) => item.id === id);
    const confirmed = window.confirm(
      `Delete subcategory "${subcategory?.name ?? 'this subcategory'}"?`,
    );
    if (!confirmed) return;

    try {
      await deleteSubcategory(id);
      setSubcategories((prev) => prev.filter((item) => item.id !== id));
      setEditSubcategories((prev) => prev.filter((item) => item.id !== id));

      if (subcategoryId === id) setSubcategoryId(null);
      if (editSubcategoryId === id) setEditSubcategoryId(null);

      toast.success('Subcategory deleted.');
      await refreshTransactions();
    } catch (e) {
      handleApiFailure(e, setFieldError);
    }
  };

  const onEditCategoryChange = async (value: string) => {
    if (value === CREATE_NEW_OPTION) {
      try {
        const raw = window.prompt('New category name');
        const name = raw?.trim();
        if (!name) return;

        const created = await createCategory(name);
        setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        setEditCategoryId(created.id);
        setEditSubcategoryId(null);
        setEditSubcategorySearch('');
      } catch (e) {
        handleApiFailure(e, setEditErr);
      }
      return;
    }

    setEditCategoryId(value || null);
    setEditSubcategoryId(null);
    setEditSubcategorySearch('');
  };

  const onEditSubcategoryChange = async (value: string) => {
    if (value === CREATE_NEW_OPTION) {
      if (!editCategoryId) {
        setEditErr('Select a category first.');
        return;
      }

      try {
        const raw = window.prompt('New subcategory name');
        const name = raw?.trim();
        if (!name) return;

        const created = await createSubcategory(editCategoryId, name);
        setEditSubcategories((prev) =>
          [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setSubcategories((prev) =>
          [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        setEditSubcategoryId(created.id);
      } catch (e) {
        handleApiFailure(e, setEditErr);
      }
      return;
    }

    setEditSubcategoryId(value || null);
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

  const filteredEditSubcategories = editSubcategories.filter((sub) =>
    sub.name.toLowerCase().includes(editSubcategorySearch.trim().toLowerCase()),
  );

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

  useEffect(() => {
    const loadEditSubcategories = async () => {
      if (!editOpen || !editCategoryId) {
        setEditSubcategories([]);
        setEditSubcategoryId(null);
        return;
      }

      try {
        const subs = await getSubcategories(editCategoryId);
        const sorted = [...subs].sort((a, b) => a.name.localeCompare(b.name));
        setEditSubcategories(sorted);
        setEditSubcategoryId((current) =>
          current && sorted.some((sub) => sub.id === current) ? current : null,
        );
      } catch (e) {
        setEditErr(e instanceof Error ? e.message : String(e));
        setEditSubcategories([]);
        setEditSubcategoryId(null);
      }
    };

    void loadEditSubcategories();
  }, [editOpen, editCategoryId]);

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

    const parsedAmountDollars = Number(amountDollars);
    if (!accountId) {
      setSubmitErr('Please select an account.');
      return;
    }
    if (!Number.isFinite(parsedAmountDollars) || parsedAmountDollars <= 0) {
      setSubmitErr('Amount must be a positive number.');
      return;
    }
    const parsedAmountCents = Math.round(parsedAmountDollars * 100);
    if (parsedAmountCents < 1) {
      setSubmitErr('Amount is too small.');
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
        amountCents: parsedAmountCents,
        occurredAt: occurredAtDate,
        categoryId: categoryId || undefined,
        subcategoryId: subcategoryId || undefined,
        merchant,
        note: note || undefined,
      };

      await apiPost<Tx>('/v1/transactions', payload);
      writeLastFormDefaults({
        lastAccountId: accountId || null,
        lastCategoryId: categoryId,
        lastSubcategoryId: subcategoryId,
      });
      toast.success('Transaction created.');
      await refreshTransactions();
      setCreateOpen(false);
      setAmountDollars('1.00');
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

  const openEditModal = (tx: Tx) => {
    setSelectedTx(tx);
    setEditCategoryId(tx.categoryId);
    setEditSubcategoryId(tx.subcategoryId);
    setEditSubcategorySearch('');
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
    setEditCategoryId(null);
    setEditSubcategoryId(null);
    setEditSubcategories([]);
    setEditSubcategorySearch('');
    setEditErr(null);
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

    if (
      (selectedTx.type === 'INCOME' || selectedTx.type === 'EXPENSE') &&
      (!editCategoryId || !editSubcategoryId)
    ) {
      setEditErr('Category and subcategory are required for income/expense.');
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
        categoryId: editCategoryId || undefined,
        subcategoryId: editSubcategoryId || undefined,
      };

      await apiPatch<Tx>(`/v1/transactions/${selectedTx.id}`, payload);
      await refreshTransactions();
      closeEditModal();
    } catch (e) {
      handleApiFailure(e, setEditErr);
    } finally {
      setEditSubmitting(false);
    }
  };

  const onDeleteTx = async (tx: Tx) => {
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

  return (
    <PageContainer className="space-y-6 py-2 text-aurum-text">
      <main className="space-y-6">
        <section className="flex flex-col gap-4 rounded-aurum border border-aurum-border bg-white p-5 shadow-aurumSm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-aurum-text">Transactions</h1>
            <p className="mt-1 text-sm text-aurum-muted">
              Track, filter, and manage your transaction ledger.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => void refreshTransactions()}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button type="button" variant="primary" onClick={() => setCreateOpen(true)}>
              Add Transaction
            </Button>
          </div>
        </section>

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

        {loadErr && <p className="text-sm text-aurum-danger">Error: {loadErr}</p>}
        {!loadErr && refreshing && items.length === 0 && <p>Loading...</p>}

        <Section>
          <div>
            {items.map((tx) => (
              <Card key={tx.id} className="mb-4 transition-shadow hover:shadow-aurum">
                <CardContent className="pt-4">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        {tx.merchant ?? '(no merchant)'}{' '}
                        <span style={{ opacity: 0.6, fontWeight: 400 }}>- {tx.type}</span>
                      </div>
                      <div style={{ opacity: 0.75, marginTop: 4 }}>{tx.occurredAt}</div>
                      <div style={{ opacity: 0.75, marginTop: 4 }}>
                        Account: {tx.account?.name ?? tx.accountId}
                      </div>
                      <div style={{ opacity: 0.75, marginTop: 4 }}>
                        Category: {tx.category?.name ?? tx.categoryId ?? '-'}
                      </div>
                      <div style={{ opacity: 0.75, marginTop: 4 }}>
                        Subcategory: {tx.subcategory?.name ?? tx.subcategoryId ?? '-'}
                      </div>
                      {tx.note && <div style={{ marginTop: 6 }}>{tx.note}</div>}
                    </div>

                    <div style={{ display: 'grid', justifyItems: 'end', gap: 8 }}>
                      <div style={{ fontWeight: 600 }}>
                        {formatMoneyForType(tx.type, tx.amountCents, tx.currency)}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => openEditModal(tx)}
                          className="h-10 min-w-[84px] px-4"
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => onDeleteTx(tx)}
                          className="h-10 min-w-[84px] px-4"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
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
              Category
              <select
                value={editCategoryId ?? ''}
                onChange={(e) => void onEditCategoryChange(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
                required={selectedTx?.type === 'INCOME' || selectedTx?.type === 'EXPENSE'}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={CREATE_NEW_OPTION}>+ Create new...</option>
              </select>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!editCategoryId || editSubmitting}
                  onClick={() => {
                    if (!editCategoryId) return;
                    void handleDeleteCategory(editCategoryId, setEditErr);
                  }}
                >
                  Delete Category
                </Button>
              </div>
            </label>

            <label>
              Subcategory
              <input
                type="text"
                value={editSubcategorySearch}
                onChange={(e) => setEditSubcategorySearch(e.target.value)}
                style={{ width: '100%', marginTop: 4, marginBottom: 4 }}
                placeholder="Search subcategories..."
                disabled={!editCategoryId}
              />
              <select
                value={editSubcategoryId ?? ''}
                onChange={(e) => void onEditSubcategoryChange(e.target.value)}
                style={{ width: '100%', marginTop: 0 }}
                required={selectedTx?.type === 'INCOME' || selectedTx?.type === 'EXPENSE'}
                disabled={!editCategoryId}
              >
                <option value="">
                  {editCategoryId ? 'Select subcategory' : 'Select category first'}
                </option>
                {filteredEditSubcategories.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
                {editCategoryId ? <option value={CREATE_NEW_OPTION}>+ Create new...</option> : null}
              </select>
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!editSubcategoryId || editSubmitting}
                  onClick={() => {
                    if (!editSubcategoryId) return;
                    void handleDeleteSubcategory(editSubcategoryId, setEditErr);
                  }}
                >
                  Delete Subcategory
                </Button>
              </div>
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

        <Modal
          open={createOpen}
          onClose={() => {
            if (!submitting) {
              setCreateOpen(false);
              setSubmitErr(null);
            }
          }}
          title="Add Transaction"
        >
          <form onSubmit={onSubmit} className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <label>
              Account
              <select
                value={accountId}
                onChange={(e) => void onAccountChange(e.target.value)}
                style={{ width: '100%', marginTop: 4 }}
                required
              >
                <option value="">
                  {accounts.length === 0 ? 'No accounts, create one' : 'Select account'}
                </option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
                <option value={CREATE_NEW_OPTION}>+ Create new...</option>
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
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!categoryId || submitting}
                  onClick={() => {
                    if (!categoryId) return;
                    void handleDeleteCategory(categoryId);
                  }}
                >
                  Delete Category
                </Button>
              </div>
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
              <div className="mt-2 flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={!subcategoryId || submitting}
                  onClick={() => {
                    if (!subcategoryId) return;
                    void handleDeleteSubcategory(subcategoryId);
                  }}
                >
                  Delete Subcategory
                </Button>
              </div>
            </label>

            <label>
              Amount (USD)
              <input
                type="number"
                min={0.01}
                step={0.01}
                value={amountDollars}
                onChange={(e) => setAmountDollars(e.target.value)}
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
                type="button"
                variant="secondary"
                onClick={() => {
                  if (!submitting) {
                    setCreateOpen(false);
                    setSubmitErr(null);
                  }
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="w-[170px]"
              >
                {submitting ? 'Creating...' : 'Create Transaction'}
              </Button>
            </div>
          </form>
        </Modal>
      </main>
    </PageContainer>
  );
}
