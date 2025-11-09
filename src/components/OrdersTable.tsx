// src/components/OrdersTable.tsx
"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";

type Order = any;
type SortKey = "id" | "customer" | "email" | "total" | "status" | "mode" | "placed";
type Dir = "asc" | "desc";

const ts = (v: any): number => {
  try {
    if (!v) return 0;

    // already millis
    if (typeof v === "number") {
      // If it's clearly seconds (10-digit), convert to ms
      if (v > 0 && v < 1e12) return v * 1000;
      return v;
    }

    // ISO string or date-like string
    if (typeof v === "string") {
      const ms = new Date(v).getTime();
      return Number.isFinite(ms) ? ms : 0;
    }

    // JS Date
    if (v instanceof Date) return v.getTime();

    // Firestore Timestamp (client SDK)
    if (v && typeof v.toDate === "function") {
      const ms = v.toDate().getTime();
      return Number.isFinite(ms) ? ms : 0;
    }
    if (v && typeof v.toMillis === "function") {
      const ms = v.toMillis();
      return Number.isFinite(ms) ? ms : 0;
    }

    // Firestore Admin / serialized Timestamp:
    // supports both {seconds, nanoseconds} and {_seconds, _nanoseconds}
    const seconds =
      (typeof v.seconds === "number" ? v.seconds : undefined) ??
      (typeof v._seconds === "number" ? v._seconds : undefined);
    const nanos =
      (typeof v.nanoseconds === "number" ? v.nanoseconds : undefined) ??
      (typeof v._nanoseconds === "number" ? v._nanoseconds : undefined);

    if (typeof seconds === "number") {
      const extraMs = typeof nanos === "number" ? Math.floor(nanos / 1e6) : 0;
      return seconds * 1000 + extraMs;
    }
  } catch {
    // fall through
  }
  return 0;
};

// Prefer placedAt, then createdAt, then verifiedAt, then updatedAt
const placedMs = (o: any) =>
  ts(o?.placedAt) ||
  ts(o?.createdAt) ||
  ts(o?.payment?.verifiedAt) ||
  ts(o?.updatedAt) ||
  0;

// Pretty print
const formatDateTime = (ms: number) => (ms ? new Date(ms).toLocaleString() : "—");


const computeTotal = (o: any): number => {
  const explicit = Number(o?.amounts?.total);
  if (!Number.isNaN(explicit) && explicit > 0) return explicit;
  const rpAmountPaise = Number(o?.payment?.amount);
  if (!Number.isNaN(rpAmountPaise) && rpAmountPaise > 0) return rpAmountPaise / 100;
  if (Array.isArray(o?.items)) {
    return o.items.reduce((sum: number, it: any) => {
      const price = Number(it?.unitPrice ?? it?.price ?? 0);
      const qty = Number(it?.qty ?? 1);
      return sum + price * qty;
    }, 0);
  }
  return 0;
};
const currencyOf = (o: any) => (o?.amounts?.currency || "INR").toUpperCase();
const formatMoney = (n: number, c: string) => (c === "INR"
  ? `₹ ${Number(n || 0).toLocaleString("en-IN")}`
  : `${c} ${Number(n || 0).toLocaleString()}`);

export default function OrdersTable({ orders }: { orders: Order[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("placed");
  const [dir, setDir] = useState<Dir>("desc");

  const toggle = (k: SortKey) => {
    if (k === sortKey) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setDir("desc"); }
  };

  const sorted = useMemo(() => {
    const copy = [...orders];
    const get = (o: any) => {
      switch (sortKey) {
        case "id": return String(o?.id || "").toLowerCase();
        case "customer": return String(o?.customer?.name || "").toLowerCase();
        case "email": return String(o?.customer?.email || "").toLowerCase();
        case "status": return String(o?.status || "").toLowerCase();
        case "mode": return String(o?.payment?.mode || "").toLowerCase();
        case "total": return computeTotal(o);
        case "placed": return placedMs(o);
      }
    };
    copy.sort((a, b) => {
      const av = get(a), bv = get(b);
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
    return copy;
  }, [orders, sortKey, dir]);

  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => toggle(k)}
      className={clsx(
        "px-5 py-3 text-left select-none cursor-pointer whitespace-nowrap",
        sortKey === k && "underline underline-offset-4"
      )}
      title="Click to sort"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === k ? <span>{dir === "asc" ? "▲" : "▼"}</span> : null}
      </span>
    </th>
  );
  const Td = (p: any) => <td className={clsx("px-5 py-3 align-top", p.className)}>{p.children}</td>;

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden mt-4">
      <header className="px-5 py-3 border-b text-sm font-semibold">Orders</header>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th k="id" label="Order ID" />
              <Th k="customer" label="Customer" />
              <Th k="email" label="Email" />
              <Th k="total" label="Total" />
              <Th k="status" label="Status" />
              <Th k="mode" label="Mode" />
              <Th k="placed" label="Placed" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {sorted.map((o: any) => {
              const total = computeTotal(o);
              const ccy = currencyOf(o);
              const mode = (o?.payment?.mode || "—").toLowerCase();
              const placed = placedMs(o);
              return (
                <tr key={o.id} className="hover:bg-gray-50">
                  <Td className="font-mono">
                    <a href={`/order/${o.id}`} className="underline decoration-dotted hover:decoration-solid">
                      {o.id}
                    </a>
                  </Td>
                  <Td>{o.customer?.name || "—"}</Td>
                  <Td className="break-all">{o.customer?.email || "—"}</Td>
                  <Td className={clsx(total > 0 ? "" : "text-gray-500")}>
                    {total > 0 ? formatMoney(total, ccy) : "—"}
                  </Td>
                  <Td className={clsx(o.status === "paid" ? "text-green-700" : "text-gray-700")}>
                    {o.status || "—"}
                  </Td>
                  <Td className={clsx(mode === "live" ? "text-emerald-700" : mode === "test" ? "text-amber-700" : "text-gray-600")}>
                    {mode || "—"}
                  </Td>
                  <Td>{placed ? new Date(placed).toLocaleString() : "—"}</Td>
                </tr>
              );
            })}
            {!sorted.length && <tr><Td className="text-gray-500">No orders.</Td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
