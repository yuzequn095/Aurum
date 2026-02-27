"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

type Tx = {
  id: string;
  occurredAt: string;
  merchant: string | null;
  amountCents: number;
  currency: string;
  note: string | null;
  categoryId: string | null;
  accountId: string;
  type: "INCOME" | "EXPENSE" | "TRANSFER";
};

type Account = { id: string; name: string; currency: string };
type Category = { id: string; name: string; parentId: string | null };

type CreateTxPayload = {
  accountId: string;
  type: "EXPENSE";
  amountCents: number;
  occurredAt: string;
  categoryId?: string;
  merchant: string;
  note?: string;
};

function formatMoney(cents: number, currency: string) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toFixed(2);
  return `${sign}${currency} ${dollars}`;
}

function toLocalDatetimeInputValue(date: Date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Tx[] | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amountCents, setAmountCents] = useState("100");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");
  const [occurredAtLocal, setOccurredAtLocal] = useState(toLocalDatetimeInputValue());

  const [submitErr, setSubmitErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadTransactions = async () => {
    const list = await apiGet<Tx[]>("/v1/transactions?limit=50&offset=0");
    setTransactions(list);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoadErr(null);
        const [txs, accs, cats] = await Promise.all([
          apiGet<Tx[]>("/v1/transactions?limit=50&offset=0"),
          apiGet<Account[]>("/v1/accounts"),
          apiGet<Category[]>("/v1/categories"),
        ]);
        setTransactions(txs);
        setAccounts(accs);
        setCategories(cats);
        if (accs.length > 0) {
          setAccountId((prev) => prev || accs[0].id);
        }
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : String(e));
      }
    };

    void load();
  }, []);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitErr(null);

    const parsedAmount = Number(amountCents);
    if (!accountId) {
      setSubmitErr("Please select an account.");
      return;
    }
    if (!Number.isInteger(parsedAmount) || parsedAmount < 1) {
      setSubmitErr("amountCents must be an integer >= 1.");
      return;
    }

    try {
      setSubmitting(true);
      const payload: CreateTxPayload = {
        accountId,
        type: "EXPENSE",
        amountCents: parsedAmount,
        occurredAt: new Date(occurredAtLocal).toISOString(),
        categoryId: categoryId || undefined,
        merchant,
        note: note || undefined,
      };

      await apiPost<Tx>("/v1/transactions", payload);
      await loadTransactions();
      setAmountCents("100");
      setMerchant("");
      setNote("");
      setOccurredAtLocal(toLocalDatetimeInputValue());
      setCategoryId("");
    } catch (e) {
      setSubmitErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Transactions</h1>

      <form
        onSubmit={onSubmit}
        style={{
          marginTop: 16,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          padding: 12,
          display: "grid",
          gap: 10,
        }}
      >
        <div style={{ fontWeight: 600 }}>Create Expense</div>

        <label>
          Account
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            style={{ width: "100%", marginTop: 4 }}
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
          Category
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            style={{ width: "100%", marginTop: 4 }}
          >
            <option value="">(none)</option>
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
            type="number"
            min={1}
            step={1}
            value={amountCents}
            onChange={(e) => setAmountCents(e.target.value)}
            style={{ width: "100%", marginTop: 4 }}
            required
          />
        </label>

        <label>
          Occurred At
          <input
            type="datetime-local"
            value={occurredAtLocal}
            onChange={(e) => setOccurredAtLocal(e.target.value)}
            style={{ width: "100%", marginTop: 4 }}
            required
          />
        </label>

        <label>
          Merchant
          <input
            type="text"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            style={{ width: "100%", marginTop: 4 }}
            placeholder="Starbucks"
          />
        </label>

        <label>
          Note
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: "100%", marginTop: 4 }}
            placeholder="optional"
          />
        </label>

        {submitErr && <p style={{ color: "crimson", margin: 0 }}>Error: {submitErr}</p>}

        <button type="submit" disabled={submitting || accounts.length === 0} style={{ width: 160 }}>
          {submitting ? "Creating..." : "Create Transaction"}
        </button>
      </form>

      {loadErr && <p style={{ marginTop: 12, color: "crimson" }}>Error: {loadErr}</p>}

      {!loadErr && transactions === null && <p style={{ marginTop: 12 }}>Loading...</p>}

      {transactions && (
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {transactions.map((tx) => (
            <div
              key={tx.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 12,
                padding: 12,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {tx.merchant ?? "(no merchant)"} <span style={{ opacity: 0.6, fontWeight: 400 }}>- {tx.type}</span>
                  </div>
                  <div style={{ opacity: 0.75, marginTop: 4 }}>{new Date(tx.occurredAt).toLocaleString()}</div>
                  {tx.note && <div style={{ marginTop: 6 }}>{tx.note}</div>}
                </div>

                <div style={{ fontWeight: 600 }}>{formatMoney(tx.amountCents, tx.currency)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
