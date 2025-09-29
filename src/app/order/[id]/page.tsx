// src/app/order/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState, use as usePromise } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";

type OrderDoc = {
  id: string;
  status?: string;
  createdAt?: any;
  placedAt?: string;
  customer?: { name?: string; email?: string; phone?: string };
  shipping?: { country?: string; state?: string; city?: string; postal?: string; addr1?: string; addr2?: string };
  shippingAddress?: any;
  items?: Array<{ id?: string; title?: string; size?: string; qty?: number; unitPrice?: number; image?: string }>;
  amounts?: { subtotal?: number; shipping?: number; discount?: number; tax?: number; total?: number; currency?: string };
  totals?: { subtotal?: number; shipping?: number; discount?: number; tax?: number; total?: number; currency?: string };
  paymentInfo?: Record<string, any>;
};

// ---- time helpers ----
function toISO(ts: any): string | null {
  try {
    if (!ts) return null;
    if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
    if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000).toISOString();
    if (typeof ts?._seconds === "number") return new Date(ts._seconds * 1000).toISOString();
    const d = new Date(ts);
    return isNaN(+d) ? null : d.toISOString();
  } catch {
    return null;
  }
}

function toDateSafe(ts: any): Date | null {
  if (!ts) return null;
  try {
    if (ts instanceof Date) return isNaN(ts.getTime()) ? null : ts;
    if (typeof ts?.toDate === "function") {
      const d = ts.toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000);
    if (typeof ts?._seconds === "number") return new Date(ts._seconds * 1000);
    if (typeof ts === "number" || typeof ts === "string") {
      const d = new Date(ts);
      return isNaN(d.getTime()) ? null : d;
    }
  } catch { }
  return null;
}

function formatDateTime(d: Date | null) {
  if (!d || isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(d);
}

function timeAgo(d: Date | null) {
  if (!d || isNaN(d.getTime())) return "";
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

const formatINR = (n?: number) => "₹ " + Number(n || 0).toLocaleString("en-IN");

// ---- display normalization ----
function getDisplayTotals(order: OrderDoc) {
  const b = (order?.amounts as any) || (order?.totals as any) || {};

  // Try declared amounts first
  let subtotal = Number(b?.subtotal);
  let shipping = Number(b?.shipping);
  let discount = Number(b?.discount);
  let tax = Number(b?.tax);
  let total = Number(b?.total);
  const currency = b?.currency || (order as any)?.currency || "INR";

  // Fallback: derive subtotal from items (supports unitPrice in ₹ or price in paise)
  const items = Array.isArray(order?.items) ? order.items : [];
  const derivedSubtotal = items.reduce((sum, it: any) => {
    const qty = Number(it?.qty ?? 1) || 1;
    const unit =
      typeof it?.unitPrice === "number"
        ? it.unitPrice // rupees
        : typeof it?.price === "number"
          ? it.price / 100 // paise -> rupees
          : 0;
    return sum + unit * qty;
  }, 0);

  if (!(subtotal > 0)) subtotal = derivedSubtotal;
  if (!(shipping >= 0)) shipping = 0;
  if (!(discount >= 0)) discount = 0;
  if (!(tax >= 0)) tax = 0;

  // If total missing/zero, compose it from parts
  if (!(total > 0)) {
    total = Math.max(0, subtotal + shipping + tax - discount);
  }

  // Legacy: some really old docs store top-level total in paise
  if (!(total > 0) && typeof (order as any)?.total === "number") {
    total = (order as any).total / 100;
    if (!(subtotal > 0)) subtotal = derivedSubtotal; // keep a sane subtotal
  }

  return { subtotal, shipping, discount, tax, total, currency };
}


function getShipping(order: OrderDoc) {
  const a: any = order?.shipping || order?.shippingAddress || {};
  return {
    addr1: a.addr1 || a.line1 || "",
    addr2: a.addr2 || a.line2 || "",
    city: a.city || "",
    state: a.state || "",
    postal: a.postal || a.postalCode || "",
    country: a.country || "",
  };
}

// Pretty-print values inside the Payment box
function prettyValue(v: any): string {
  const d = toDateSafe(v);
  if (d) return `${formatDateTime(d)} (${timeAgo(d)})`;
  if (v == null) return "—";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  }
  return String(v);
}

async function getJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}

export default function OrderDetailPage(props: { params: Promise<{ id: string }> }) {
  // Unwrap the params Promise (Next.js 15 change)
  const { id: orderId } = usePromise(props.params);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderDoc | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // ---- Back link logic ----
  const search = useSearchParams();
  const [back, setBack] = useState<{ href: string; label: string }>({
    href: "/dashboard",
    label: "Back to Dashboard",
  });

  useEffect(() => {
    if (search.get("from") === "admin") {
      setBack({ href: "/admin", label: "Back to Admin" });
      return;
    }
    try {
      const ref = document.referrer;
      if (ref) {
        const u = new URL(ref);
        if (u.pathname.startsWith("/admin")) {
          setBack({ href: "/admin", label: "Back to Admin" });
          return;
        }
      }
    } catch { }
  }, [search]);

  // Use checkout snapshot quickly if present
  useEffect(() => {
    const snap = sessionStorage.getItem("lastOrderSnapshot");
    if (!snap) return;
    try {
      const o = JSON.parse(snap);
      if (o?.orderId === orderId) {
        setOrder({
          id: o.orderId,
          placedAt: o.placedAt,
          customer: o.customer,
          shipping: o.shipping,
          shippingAddress: o.shippingAddress,
          items: o.items,
          amounts: o.amounts,
          totals: o.totals,
          paymentInfo: o.paymentInfo,
          status: o.status || "paid",
        });
      }
    } catch { }
  }, [orderId]);

  // Load from API
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        let res = await fetch(`/api/orders/${orderId}`);
        if (res.status === 404) {
          res = await fetch(`/api/admin/orders/${orderId}`);
        }
        const body = await getJson(res);
        if (!mounted) return;
        if (!res.ok) throw new Error(body?.error || "Failed to load order");

        let o = body?.order ?? body;
        if (o && !o.id && o.orderId) o = { id: o.orderId, ...o };

        setOrder(o as OrderDoc);
      } catch (e: any) {
        setErr(e?.message || "Failed to load order");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [orderId]);

  const placedAt = useMemo(() => order?.placedAt || toISO(order?.createdAt) || null, [order]);
  const totals = useMemo(() => (order ? getDisplayTotals(order) : null), [order]);
  const ship = useMemo(() => (order ? getShipping(order) : null), [order]);

  if (loading && !order) {
    return (
      <main className="offset-header">
        <LoadingScreen />
      </main>
    );
  }

  if (err || !order) {
    return (
      <main className="offset-header">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <p className="text-red-600">{err || "Order not found."}</p>
          <p className="mt-4">
            <Link href="/" className="underline">Go home</Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="offset-header">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">Order Details</h1>
          <Link href={back.href} className="text-sm underline">{back.label}</Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <section className="md:col-span-2 space-y-4">
            <div className="rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-gray-600">Order ID</div>
                <div className="font-mono text-sm">{order.id}</div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-600">Status:</span> <b>{order.status || "created"}</b></div>
                <div><span className="text-gray-600">Placed:</span> {placedAt ? new Date(placedAt).toLocaleString() : "—"}</div>
                <div><span className="text-gray-600">Customer:</span> {order.customer?.name || "—"}</div>
                <div><span className="text-gray-600">Email:</span> {order.customer?.email || "—"}</div>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-sm text-gray-600 mb-2">Shipping Address</div>
              <div className="text-sm">
                <div>{ship?.addr1 || "—"}</div>
                {ship?.addr2 ? <div>{ship.addr2}</div> : null}
                <div>{[ship?.city, ship?.postal].filter(Boolean).join(" ")}</div>
                <div>{[ship?.state, ship?.country].filter(Boolean).join(", ")}</div>
              </div>
            </div>

            <div className="rounded-xl border overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <Th>Item</Th><Th>Size</Th><Th>Qty</Th><Th>Unit</Th><Th>Total</Th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(order.items || []).map((it, i) => (
                    <tr key={i}>
                      <Td>{it.title || it.id || "—"}</Td>
                      <Td>{(it as any).size || "—"}</Td>
                      <Td>{it.qty ?? "—"}</Td>
                      <Td>{formatINR(it.unitPrice)}</Td>
                      <Td>{formatINR((it.unitPrice || 0) * (it.qty || 0))}</Td>
                    </tr>
                  ))}
                  {(!order.items || !order.items.length) && (
                    <tr><Td colSpan={5} className="text-gray-500">No items.</Td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border p-4">
              <div className="text-sm text-gray-600 mb-2">Summary</div>
              <Row label="Subtotal" value={formatINR(totals?.subtotal)} />
              <Row label="Shipping" value={formatINR(totals?.shipping)} />
              {totals?.discount ? <Row label="Discount" value={`-${formatINR(totals?.discount)}`} /> : null}
              {totals?.tax ? <Row label="Tax" value={formatINR(totals?.tax)} /> : null}
              <div className="flex justify-between font-semibold text-base mt-2">
                <span>Total</span><span>{formatINR(totals?.total)}</span>
              </div>
            </div>

            {order.paymentInfo && (
              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-600 mb-2">Payment</div>
                <div className="text-xs whitespace-pre-wrap break-words">
                  {Object.entries(order.paymentInfo).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-gray-600">{k}:</span> {prettyValue(v)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex justify-between text-sm mb-1"><span>{label}</span><span>{value}</span></div>;
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-3 py-2 font-semibold whitespace-nowrap">{children}</th>;
}
function Td({ children, className = "", colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}
