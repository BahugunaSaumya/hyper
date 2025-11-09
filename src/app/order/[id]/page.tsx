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
  placedAt?: any;
  updatedAt?: any;
  customer?: { name?: string; email?: string; phone?: string; address?: any };
  shipping?: any;            // may be address object OR a number (shipping cost)
  shippingAddress?: any;     // legacy address container
  items?: Array<{ id?: string; title?: string; size?: string; qty?: number; unitPrice?: number; price?: number; image?: string }>;
  amounts?: { subtotal?: number; shipping?: number; discount?: number; tax?: number; total?: number; currency?: string };
  totals?: { subtotal?: number; shipping?: number; discount?: number; tax?: number; total?: number; currency?: string };
  hintTotals?: { subtotal?: number; shipping?: number; discount?: number; tax?: number; total?: number; currency?: string };
  paymentInfo?: any;         // may contain verifiedAt, notes.*, address.*, etc.
  payment?: any;             // sometimes present with amount (in paise)
};

// ---------- Timestamp helpers ----------
function toMillis(ts: any): number {
  try {
    if (!ts) return 0;
    if (typeof ts === "number") {
      if (ts > 0 && ts < 1e12) return ts * 1000; // seconds → ms
      return ts;
    }
    if (typeof ts === "string") {
      const ms = Date.parse(ts);
      return Number.isFinite(ms) ? ms : 0;
    }
    if (ts instanceof Date) return ts.getTime();

    // Firestore client Timestamp
    if (typeof ts?.toMillis === "function") return ts.toMillis();
    if (typeof ts?.toDate === "function") return ts.toDate().getTime();

    // Firestore Admin/serialized
    const seconds =
      (typeof ts.seconds === "number" ? ts.seconds : undefined) ??
      (typeof ts._seconds === "number" ? ts._seconds : undefined);
    const nanos =
      (typeof ts.nanoseconds === "number" ? ts.nanoseconds : undefined) ??
      (typeof ts._nanoseconds === "number" ? ts._nanoseconds : undefined);
    if (typeof seconds === "number") {
      return seconds * 1000 + (typeof nanos === "number" ? Math.floor(nanos / 1e6) : 0);
    }
  } catch {}
  return 0;
}

function toDateSafe(ts: any): Date | null {
  const ms = toMillis(ts);
  if (!ms) return null;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d;
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

// ---------- Totals (prefers amounts → totals → hintTotals; derives as needed) ----------
function getDisplayTotals(order: OrderDoc) {
  const b: any =
    (order?.amounts && Object.keys(order.amounts).length ? order.amounts : null) ??
    (order?.totals && Object.keys(order.totals).length ? order.totals : null) ??
    (order?.hintTotals && Object.keys(order.hintTotals).length ? order.hintTotals : null) ??
    {};

  let subtotal = Number(b?.subtotal);
  let shipping = Number(b?.shipping);
  let discount = Number(b?.discount);
  let tax = Number(b?.tax); // <- GST will be here
  let total = Number(b?.total);
  const currency = (b?.currency || (order as any)?.currency || "INR") as string;

  // derive subtotal from items if needed
  const items = Array.isArray(order?.items) ? order.items : [];
  const derivedSubtotal = items.reduce((sum, it: any) => {
    const qty = Number(it?.qty ?? 1) || 1;
    const unit =
      typeof it?.unitPrice === "number"
        ? it.unitPrice              // rupees
        : typeof it?.price === "number"
          ? it.price / 100         // paise → rupees
          : 0;
    return sum + unit * qty;
  }, 0);

  if (!(subtotal > 0)) subtotal = derivedSubtotal;
  if (!(shipping >= 0)) shipping = 0;
  if (!(discount >= 0)) discount = 0;
  if (!(tax >= 0)) tax = 0;

  // if no explicit total, compose it OR fallback to payment amount
  if (!(total > 0)) {
    const composed = Math.max(0, subtotal + shipping + tax - discount);
    const payPaise = Number((order as any)?.payment?.amount ?? (order as any)?.paymentInfo?.amount);
    const payRupees = !Number.isNaN(payPaise) && payPaise > 0 ? payPaise / 100 : 0;
    total = Math.max(composed, payRupees);
  }

  // ultra-legacy: top-level total in paise
  if (!(total > 0) && typeof (order as any)?.total === "number") {
    total = (order as any).total / 100;
    if (!(subtotal > 0)) subtotal = derivedSubtotal;
  }

  return { subtotal, shipping, discount, tax, total, currency };
}

// ---------- Shipping normalization (robust) ----------
const isNonEmpty = (v: any) => typeof v === "string" && v.trim().length > 0;

type ShipOut = { addr1?: string; addr2?: string; city?: string; state?: string; postal?: string; country?: string };

function normalizeDirectShape(a: any): ShipOut {
  if (!a || typeof a !== "object") return {};
  const addr1   = a.addr1   ?? a.address1 ?? a.address_line1 ?? a.line1 ?? a.address ?? a.street ?? "";
  const addr2   = a.addr2   ?? a.address2 ?? a.address_line2 ?? a.line2 ?? a.apartment ?? a.flat ?? a.street2 ?? "";
  const city    = a.city    ?? a.town ?? a.locality ?? a.district ?? "";
  const state   = a.state   ?? a.province ?? a.region ?? a.state_code ?? "";
  const postal  = a.postal  ?? a.postalCode ?? a.postcode ?? a.zip ?? a.zipcode ?? a.pincode ?? "";
  const country = (a.country ?? a.countryCode ?? a.country_code ?? "") as string; // keep original casing
  return { addr1, addr2, city, state, postal, country };
}

function hasMeaningfulAddress(x: ShipOut | null | undefined) {
  if (!x) return false;
  const { addr1, addr2, city, state, postal, country } = x;
  return [addr1, addr2, city, state, postal, country].some(isNonEmpty);
}

function getShipping(order: any): ShipOut | null {
  if (!order) return null;

  // 1) Current schema: shippingAddress object
  if (order.shippingAddress && typeof order.shippingAddress === "object") {
    const n = normalizeDirectShape(order.shippingAddress);
    if (hasMeaningfulAddress(n)) return n;
  }

  // 2) Treat order.shipping as address only if it's an object (ignore numeric shipping cost)
  if (order.shipping && typeof order.shipping === "object") {
    const n = normalizeDirectShape(order.shipping.address || order.shipping);
    if (hasMeaningfulAddress(n)) return n;
  }

  // 3) Other legacy/common locations
  const candidates = [
    order.address,
    order.customer?.address,
    order.customer?.shipping,
    order.deliveryAddress,
    order.fulfillment?.shippingAddress,
    order.paymentInfo?.shipping,
    order.paymentInfo?.address,
    order.paymentInfo?.notes,
    order.payment?.shipping,
    order.payment?.address,
    order.payment?.notes,
    {
      addr1: order.address1, addr2: order.address2,
      city: order.city, state: order.state,
      postal: order.postal || order.zipcode || order.pincode,
      country: order.country,
    },
  ];

  for (const c of candidates) {
    if (!c) continue;
    const n = normalizeDirectShape(c);
    if (hasMeaningfulAddress(n)) return n;
  }

  // 4) Rare: address lines array fallback
  if (Array.isArray(order.addressLines) && order.addressLines.length) {
    return {
      addr1: order.addressLines[0],
      addr2: order.addressLines.slice(1).join(", "),
      city: "", state: "", postal: "", country: "",
    };
  }

  return null;
}

// Pretty-print values inside the Payment box
function prettyValue(v: any): string {
  const d = toDateSafe(v);
  if (d) return `${formatDateTime(d)} (${timeAgo(d)})`;
  if (v == null) return "—";
  if (typeof v === "object") {
    try { return JSON.stringify(v, null, 2); } catch { return String(v); }
  }
  return String(v);
}

async function getJson(res: Response) {
  try { return await res.json(); } catch { return null; }
}

export default function OrderDetailPage(props: { params: Promise<{ id: string }> }) {
  // Unwrap Next 15 params promise
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
        }
      }
    } catch {}
  }, [search]);

  // Use checkout snapshot quickly if present (and matching)
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
    } catch {}
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

  // Placed date: prefer placedAt → createdAt → paymentInfo.verifiedAt → updatedAt
  const placedDate = useMemo<Date | null>(() => {
    if (!order) return null;
    return (
      toDateSafe(order.placedAt) ||
      toDateSafe(order.createdAt) ||
      toDateSafe(order?.paymentInfo?.verifiedAt) ||
      toDateSafe(order.updatedAt) ||
      null
    );
  }, [order]);

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
                <div><span className="text-gray-600">Placed:</span> {formatDateTime(placedDate)}</div>
                <div><span className="text-gray-600">Customer:</span> {order.customer?.name || "—"}</div>
                <div><span className="text-gray-600">Email:</span> {order.customer?.email || "—"}</div>
              </div>
            </div>

            <div className="rounded-xl border p-4">
              <div className="text-sm text-gray-600 mb-2">Shipping Address</div>
              <div className="text-sm">
                {ship ? (
                  <>
                    <div>{ship.addr1 || "—"}</div>
                    {ship.addr2 ? <div>{ship.addr2}</div> : null}
                    <div>{[ship.city, ship.postal].filter(Boolean).join(" ")}</div>
                    <div>{[ship.state, ship.country].filter(Boolean).join(", ")}</div>
                  </>
                ) : (
                  <div className="text-gray-500">No shipping address on file.</div>
                )}
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
                  {(order.items || []).map((it, i) => {
                    const qty = Number(it.qty ?? 0);
                    const unit = typeof it.unitPrice === "number" ? it.unitPrice : (typeof (it as any).price === "number" ? (it as any).price / 100 : 0);
                    return (
                      <tr key={i}>
                        <Td>{it.title || it.id || "—"}</Td>
                        <Td>{(it as any).size || "—"}</Td>
                        <Td>{qty || "—"}</Td>
                        <Td>{formatINR(unit)}</Td>
                        <Td>{formatINR(unit * qty)}</Td>
                      </tr>
                    );
                  })}
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
              {/* 👇 label changed to GST (5%) */}
              {totals?.tax ? <Row label="GST (5%)" value={formatINR(totals?.tax)} /> : null}
              {totals?.discount ? <Row label="Discount" value={`-${formatINR(totals?.discount)}`} /> : null}
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
