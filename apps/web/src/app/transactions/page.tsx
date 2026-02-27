"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

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

function formatMoney(cents: number, currency: string) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = (abs / 100).toFixed(2);
  return `${sign}${currency} ${dollars}`;
}

export default function TransactionsPage() {
  const [data, setData] = useState<Tx[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Tx[]>("/v1/transactions?limit=50&offset=0")
      .then(setData)
      .catch((e) => setErr(e?.message ?? String(e)));
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>Transactions</h1>

      {err && <p style={{ marginTop: 12, color: "crimson" }}>Error: {err}</p>}

      {!err && data === null && <p style={{ marginTop: 12 }}>Loading...</p>}

      {data && (
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {data.map((tx) => (
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
                    {tx.merchant ?? "(no merchant)"}{" "}
                    <span style={{ opacity: 0.6, fontWeight: 400 }}>• {tx.type}</span>
                  </div>
                  <div style={{ opacity: 0.75, marginTop: 4 }}>
                    {new Date(tx.occurredAt).toLocaleString()}
                  </div>
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
