"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ContactPage from "@/app/contact/page";

// 1. Updated types to match MySQL API response
type OrderSnapshot = {
  id: number;
  orderNumber: string;
  placedAt: string;
  email: string;
  status: string;
  shippingAddress: {
    first_name: string;
    last_name: string;
    mobile: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: Array<{
    id: number;
    name: string;
    price: number;
    quantity: number;
    total: number;
    discount: number;
    slug: string;
    size?: string;
  }>;
  amounts: {
    subtotal: number;
    shipping: number;
    tax: number;
    discount: number;
    total: number;
    currency: string;
  };
  payment?: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    method?: string;
  };
};

const INR = (n: number) => "₹ " + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ThankYouContent />
    </Suspense>
  );
}

function ThankYouContent() {
  const qs = useSearchParams();
  const orderNoParam = qs.get("order") || "";

  const [snap, setSnap] = useState<OrderSnapshot | null>(null);
  const [loading, setLoading] = useState(!!orderNoParam);

  useEffect(() => {
    async function load() {
      if (orderNoParam) {
        try {
          setLoading(true);
          const r = await fetch(`/api/orders/${encodeURIComponent(orderNoParam)}`, { cache: "no-store" });
          if (r.ok) {
            const j = await r.json();
            if (j?.order) setSnap(j.order);
          }
        } catch (e) {
          console.error("Fetch failed", e);
        } finally {
          setLoading(false);
        }
      }
    }
    load();
  }, [orderNoParam]);

  const placedAtText = useMemo(() => {
    if (!snap?.placedAt) return "";
    try {
      return new Date(snap.placedAt).toLocaleString("en-IN", { 
        day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" 
      });
    } catch { return ""; }
  }, [snap?.placedAt]);
console.log(snap);
  if (loading && !snap) {
    return (
      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="h-6 w-48 bg-gray-200 animate-pulse rounded mb-4" />
        <div className="h-64 bg-gray-100 animate-pulse rounded-2xl" />
      </main>
    );
  }

  return (
    <main className="bg-white text-black min-h-screen">
      <section className="max-w-5xl mx-auto px-6 pt-10 pb-6 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-green-50">
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-green-600">
            <path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold">THANK YOU</h1>
        <p className="mt-1 text-lg font-bold">YOUR ORDER HAS BEEN PLACED</p>
        <div className="mt-4 text-sm text-gray-600">
          <div>Order <span className="font-semibold">#{snap?.orderNumber || orderNoParam}</span></div>
          {placedAtText && <div className="mt-1">{placedAtText}</div>}
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-4 md:px-6 pb-16 grid grid-cols-1 md:grid-cols-[1.2fr_.8fr] gap-6">
        {/* Items & Totals */}
        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <header className="px-5 py-3 border-b text-sm font-semibold bg-gray-50">Order Details</header>
          <div className="divide-y">
            {snap?.items.map((it, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-22 w-16 rounded bg-gray-100 flex-shrink-0">
                  {it.slug ? <img src={`/assets/models/products/${it.slug}/1.avif`} className="h-full w-full object-contain" /> : <div className="h-full w-full grid place-items-center text-[10px] text-gray-400">NO IMG</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold truncate uppercase">{it.name}</div>
                  <div className="text-xs text-gray-500">Qty: {it.quantity} {it.size ? `· Size: ${it.size}` : ""}</div>
                </div>
                <div className="text-sm font-bold">{INR(it.total)}</div>
              </div>
            ))}
          </div>

          <div className="px-5 py-4 border-t bg-gray-50/50">
            <dl className="space-y-2 text-sm">
              <Row label="Subtotal" value={INR(snap?.amounts.subtotal || 0)} />
              <Row label="Tax" value={INR(snap?.amounts.tax || 0)} />
              <Row label="Shipping" value={snap?.amounts.shipping === 0 ? "FREE" : INR(snap?.amounts.shipping || 0)} />
              {snap?.amounts.discount! > 0 && (
                <Row label="Discount" value={<span className="text-green-600">-{INR(snap?.amounts.discount || 0)}</span>} />
              )}
              <div className="border-t pt-2 mt-2">
                <Row label={<span className="font-bold">Total</span>} value={<span className="font-bold text-lg">{INR(snap?.amounts.total || 0)}</span>} />
              </div>
            </dl>
          </div>
        </div>

        {/* Info Cards */}
        <div className="space-y-6">
          <Card title="Customer Info">
            <div className="text-sm">
              <div className="font-bold uppercase">{snap?.shippingAddress.first_name} {snap?.shippingAddress.last_name}</div>
              <div className="text-gray-600">{snap?.email}</div>
              <div className="text-gray-600">{snap?.shippingAddress.mobile}</div>
            </div>
          </Card>

          <Card title="Shipping Address">
            <div className="text-sm leading-relaxed text-gray-600">
              <div>{snap?.shippingAddress.address1}</div>
              {snap?.shippingAddress.address2 && <div>{snap?.shippingAddress.address2}</div>}
              <div>{snap?.shippingAddress.city}, {snap?.shippingAddress.state} - {snap?.shippingAddress.pincode}</div>
            </div>
          </Card>

          <Card title="Payment Status">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 uppercase font-bold tracking-tight">{snap?.payment?.method || "Razorpay"}</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${snap?.status === 'Confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {snap?.status}
              </span>
            </div>
          </Card>
        </div>
      </section>

      <ContactPage />
    </main>
  );
}

// Helper Components
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <header className="px-5 py-3 border-b text-[11px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50">{title}</header>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}