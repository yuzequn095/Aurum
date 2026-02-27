'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Modal } from '@/components/Modal';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';

type Tx = {
  id: string;
  occurredAt: string;
  merchant: string | null;
  amountCents: number;
  currency: string;
  note: string | null;
  categoryId: string | null;
  accountId: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  account?: { id: string; name: string; currency: string };
  category?: { id: string; name: string; parentId: string | null } | null;
};

type Account = { id: string; name: string; currency: string };
type Category = { id: string; name: string; parentId: string | null };

type CreateTxPayload = {
  accountId: string;
  type: 'EXPENSE';
  amountCents: number;
  occurredAt: string;
  categoryId?: string;
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

function formatMoneyForType(type: Tx['type'], cents: number, currency: string) {
  const dollars = (Math.abs(cents) / 100).toFixed(2);
  const prefix = type === 'EXPENSE' ? '-' : type === 'INCOME' ? '+' : '';
  return `${prefix}${currency} ${dollars}`;
}

function toLocalDatetimeInputValue(date: Date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function toLocalDatetimeInputFromIso(isoString: string) {
  const date = new Date(isoString);
  return toLocalDatetimeInputValue(date);
}

type Filters = {
  accountId: string;
  categoryId: string;
  from: string;
  to: string;
};

export default function TransactionsPage() {
  const [items, setItems] = useState<Tx[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
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
  const [categoryId, setCategoryId] = useState('');
  const [amountCents, setAmountCents] = useState('100');
  const [merchant, setMerchant] = useState('');
  const [note, setNote] = useState('');
  const [occurredAtLocal, setOccurredAtLocal] = useState(toLocalDatetimeInputValue());

  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [selectedTx, setSelectedTx] = useState<Tx | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editMerchant, setEditMerchant] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editAmountDollars, setEditAmountDollars] = useState('0.00');
  const [editOccurredAtLocal, setEditOccurredAtLocal] = useState(toLocalDatetimeInputValue());
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

  useEffect(() => {
    const loadInitial = async () => {
      try {
        setLoadErr(null);
        const [accs, cats] = await Promise.all([apiGet<Account[]>('/v1/accounts'), apiGet<Category[]>('/v1/categories')]);
        setAccounts(accs);
        setCategories(cats);
        if (accs.length > 0) {
          setAccountId((prev) => prev || accs[0].id);
        }
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

    try {
      setSubmitting(true);
      const payload: CreateTxPayload = {
        accountId,
        type: 'EXPENSE',
        amountCents: parsedAmount,
        occurredAt: new Date(occurredAtLocal).toISOString(),
        categoryId: categoryId || undefined,
        merchant,
        note: note || undefined,
      };

      await apiPost<Tx>('/v1/transactions', payload);
      await refreshTransactions();
      setAmountCents('100');
      setMerchant('');
      setNote('');
      setOccurredAtLocal(toLocalDatetimeInputValue());
      setCategoryId('');
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (tx: Tx) => {
    setSelectedTx(tx);
    setEditMerchant(tx.merchant ?? '');
    setEditNote(tx.note ?? '');
    setEditAmountDollars((tx.amountCents / 100).toFixed(2));
    setEditOccurredAtLocal(toLocalDatetimeInputFromIso(tx.occurredAt));
    setEditErr(null);
    setEditOpen(true);
  };

  const closeEditModal = () => {
    if (editSubmitting) return;
    setEditOpen(false);
    setSelectedTx(null);
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

    try {
      setEditSubmitting(true);
      setEditErr(null);

      const payload: UpdateTxPayload = {
        merchant: editMerchant || undefined,
        note: editNote || undefined,
        amountCents: newAmountCents,
        occurredAt: new Date(editOccurredAtLocal).toISOString(),
      };

      await apiPatch<Tx>(`/v1/transactions/${selectedTx.id}`, payload);
      await refreshTransactions();
      closeEditModal();
    } catch (e) {
      setEditErr(e instanceof Error ? e.message : String(e));
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
    <main style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Transactions</h1>

      <div
        style={{
          marginTop: 12,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 12,
          display: 'grid',
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 600 }}>Filters</div>

        <label>
          Account
          <select
            value={filterAccountId}
            onChange={(e) => setFilterAccountId(e.target.value)}
            style={{ width: '100%', marginTop: 4 }}
          >
            <option value=''>All accounts</option>
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
            <option value=''>All categories</option>
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
            type='date'
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{ width: '100%', marginTop: 4 }}
          />
        </label>

        <label>
          To
          <input
            type='date'
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{ width: '100%', marginTop: 4 }}
          />
        </label>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type='button' onClick={onApplyFilters} style={{ width: 120 }} disabled={refreshing}>
            {refreshing ? 'Applying...' : 'Apply'}
          </button>
          <button type='button' onClick={onResetFilters} style={{ width: 120 }} disabled={refreshing}>
            Reset
          </button>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        style={{
          marginTop: 16,
          border: '1px solid #e5e7eb',
          borderRadius: 12,
          padding: 12,
          display: 'grid',
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 600 }}>Create Expense</div>

        <label>
          Account
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            style={{ width: '100%', marginTop: 4 }}
            required
          >
            {accounts.length === 0 && <option value=''>No accounts</option>}
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </label>

        <label>
          Category
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{ width: '100%', marginTop: 4 }}
          >
            <option value=''>(none)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Amount (cents)
          <input
            type='number'
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
            type='datetime-local'
            value={occurredAtLocal}
            onChange={(e) => setOccurredAtLocal(e.target.value)}
            style={{ width: '100%', marginTop: 4 }}
            required
          />
        </label>

        <label>
          Merchant
          <input
            type='text'
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            style={{ width: '100%', marginTop: 4 }}
            placeholder='Starbucks'
          />
        </label>

        <label>
          Note
          <input
            type='text'
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: '100%', marginTop: 4 }}
            placeholder='optional'
          />
        </label>

        {submitErr && <p style={{ color: 'crimson', margin: 0 }}>Error: {submitErr}</p>}

        <button type='submit' disabled={submitting || accounts.length === 0} style={{ width: 160 }}>
          {submitting ? 'Creating...' : 'Create Transaction'}
        </button>
      </form>

      {loadErr && <p style={{ marginTop: 12, color: 'crimson' }}>Error: {loadErr}</p>}

      {!loadErr && refreshing && items.length === 0 && <p style={{ marginTop: 12 }}>Loading...</p>}

      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        {items.map((tx) => (
          <div
            key={tx.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 12,
              padding: 12,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 600 }}>
                  {tx.merchant ?? '(no merchant)'} <span style={{ opacity: 0.6, fontWeight: 400 }}>- {tx.type}</span>
                </div>
                <div style={{ opacity: 0.75, marginTop: 4 }}>{new Date(tx.occurredAt).toLocaleString()}</div>
                <div style={{ opacity: 0.75, marginTop: 4 }}>
                  Account: {tx.account?.name ?? tx.accountId}
                </div>
                <div style={{ opacity: 0.75, marginTop: 4 }}>
                  Category: {tx.category?.name ?? (tx.categoryId ?? '-')}
                </div>
                {tx.note && <div style={{ marginTop: 6 }}>{tx.note}</div>}
              </div>

              <div style={{ display: 'grid', justifyItems: 'end', gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{formatMoneyForType(tx.type, tx.amountCents, tx.currency)}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type='button'
                    onClick={() => openEditModal(tx)}
                    style={{ border: '1px solid #e5e7eb', background: '#fff', borderRadius: 8, padding: '4px 8px' }}
                  >
                    Edit
                  </button>
                  <button
                    type='button'
                    onClick={() => onDeleteTx(tx)}
                    style={{ border: '1px solid #fecaca', color: '#b91c1c', background: '#fff', borderRadius: 8, padding: '4px 8px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {items.length > 0 && hasMore && (
        <button type='button' onClick={loadMoreTransactions} disabled={loadingMore || refreshing} style={{ marginTop: 12 }}>
          {loadingMore ? 'Loading more...' : 'Load more'}
        </button>
      )}

      <Modal open={editOpen} onClose={closeEditModal} title='Edit Transaction'>
        <form onSubmit={onSaveEdit} style={{ display: 'grid', gap: 10 }}>
          <label>
            Merchant
            <input
              type='text'
              value={editMerchant}
              onChange={(e) => setEditMerchant(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
              placeholder='merchant'
            />
          </label>

          <label>
            Note
            <input
              type='text'
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
              placeholder='optional'
            />
          </label>

          <label>
            Amount (USD)
            <input
              type='number'
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
              type='datetime-local'
              value={editOccurredAtLocal}
              onChange={(e) => setEditOccurredAtLocal(e.target.value)}
              style={{ width: '100%', marginTop: 4 }}
              required
            />
          </label>

          {editErr && <p style={{ color: 'crimson', margin: 0 }}>Error: {editErr}</p>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type='button' onClick={closeEditModal} disabled={editSubmitting}>
              Cancel
            </button>
            <button type='submit' disabled={editSubmitting || !selectedTx}>
              {editSubmitting ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
