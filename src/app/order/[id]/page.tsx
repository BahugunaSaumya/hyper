// src/app/order/[id]/page.tsx
"use client";

import React, { useEffect, useMemo, useState, use as usePromise } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type OrderDoc = {
  id: string;
  status?: string;
  createdAt?: any;
  placedAt?: string;
  customer?: { name?: string; email?: string; phone?: string };
  shipping?: { country?: string; state?: string; city?: string; postal?: string; addr1?: string; addr2?: string };
  items?: Array<{ id?: string; title?: string; size?: string; qty?: number; unitPrice?: number; image?: string }>;
  amounts?: { subtotal?: number; shipping?: number; discount?: number; tax?: number; total?: number; currency?: string };
  paymentInfo?: Record<string, any>;
};

function toISO(ts: any): string | null {
  try {
    if (!ts) return null;
    if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
    if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000).toISOString();
    const d = new Date(ts);
    return isNaN(+d) ? null : d.toISOString();
  } catch {
    return null;
  }
}
const formatINR = (n?: number) => "₹ " + Number(n || 0).toLocaleString("en-IN");

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
    // 1) explicit ?from=admin wins
    if (search.get("from") === "admin") {
      setBack({ href: "/admin", label: "Back to Admin" });
      return;
    }
    // 2) referrer contains /admin
    try {
      const ref = document.referrer;
      if (ref) {
        const u = new URL(ref);
        if (u.pathname.startsWith("/admin")) {
          setBack({ href: "/admin", label: "Back to Admin" });
          return;
        }
      }
    } catch { /* ignore */ }
    // default stays dashboard
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
          items: o.items,
          amounts: o.amounts,
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
        // Try public order endpoint first
        let res = await fetch(`/api/orders/${orderId}`);
        if (res.status === 404) {
          // Fallback: some projects only expose admin orders
          res = await fetch(`/api/admin/orders/${orderId}`);
        }
        const body = await getJson(res);
        if (!mounted) return;
        if (!res.ok) throw new Error(body?.error || "Failed to load order");
        setOrder(body);
      } catch (e: any) {
        setErr(e?.message || "Failed to load order");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [orderId]);

  const placedAt = useMemo(() => order?.placedAt || toISO(order?.createdAt) || null, [order]);

  if (loading && !order) {
    return (
      <main className="offset-header">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center text-gray-600">
          Loading order…
        </div>
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
                <div>{order.shipping?.addr1}</div>
                {order.shipping?.addr2 ? <div>{order.shipping.addr2}</div> : null}
                <div>{order.shipping?.city} {order.shipping?.postal}</div>
                <div>{order.shipping?.state}, {order.shipping?.country}</div>
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
              <Row label="Subtotal" value={formatINR(order.amounts?.subtotal)} />
              <Row label="Shipping" value={formatINR(order.amounts?.shipping)} />
              {order.amounts?.discount ? <Row label="Discount" value={`-${formatINR(order.amounts?.discount)}`} /> : null}
              {order.amounts?.tax ? <Row label="Tax" value={formatINR(order.amounts?.tax)} /> : null}
              <div className="flex justify-between font-semibold text-base mt-2">
                <span>Total</span><span>{formatINR(order.amounts?.total)}</span>
              </div>
            </div>

            {order.paymentInfo && (
              <div className="rounded-xl border p-4">
                <div className="text-sm text-gray-600 mb-2">Payment</div>
                <div className="text-xs break-words">
                  {Object.entries(order.paymentInfo).map(([k, v]) => (
                    <div key={k}><span className="text-gray-600">{k}:</span> {String(v)}</div>
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
