"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import ContactPage from "@/app/contact/page";

type OrderItemView = {
  id: string;
  title: string;
  size?: string;
  qty: number;
  unitPrice: number;
  image?: string;
};

type OrderSnapshot = {
  orderId?: string;                 // e.g. your Firestore doc id or friendly number
  placedAt?: string;                // ISO string
  customer?: { name: string; email: string; phone?: string };
  shipping?: {
    country: string;
    state: string;
    city: string;
    postal: string;
    addr1: string;
    addr2?: string;
  };
  items: OrderItemView[];
  amounts: {
    subtotal: number;
    shipping: number;
    discount?: number;
    tax?: number;
    total: number;
    currency: string;               // "INR"
  };
  paymentInfo?: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
    brand?: string;                 // optional
    last4?: string;                 // optional
  };
};

const INR = (n: number) =>
  "₹ " + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function ThankYouContent() {
  const qs = useSearchParams();
  const paymentId = qs.get("payment_id") || ""; // still shown as a fallback

  const [snap, setSnap] = useState<OrderSnapshot | null>(null);

  useEffect(() => {
    // Load the snapshot the checkout saved
    try {
      const raw = sessionStorage.getItem("lastOrderSnapshot");
      if (raw) setSnap(JSON.parse(raw));
    } catch {}
  }, []);

  // derived values (safe defaults)
  const orderNo = snap?.orderId || paymentId || "—";
  const placedAtText = useMemo(() => {
    const iso = snap?.placedAt;
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }, [snap?.placedAt]);

  return (
    <main className="bg-white text-black">
      {/* Top spacer to clear your fixed header if needed */}
      <div style={{ height: "calc(var(--nav-h, 88px))" }} />

      {/* Header */}
      <section className="max-w-5xl mx-auto px-6 pt-10 pb-6 text-center">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-green-50">
          <svg width="24" height="24" viewBox="0 0 24 24" className="text-green-600">
            <path
              fill="currentColor"
              d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"
            />
          </svg>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide">
          THANK YOU
        </h1>
        <p className="mt-1 text-lg sm:text-xl tracking-wide font-extrabold">
          YOUR ORDER HAS BEEN PLACED
        </p>

        <div className="mt-4 text-sm text-gray-600">
          <div>
            Order <span className="font-semibold">#{orderNo}</span>
          </div>
          {placedAtText && <div className="mt-1">{placedAtText}</div>}
        </div>
      </section>

      {/* Grid: Details (left) / Meta cards (right) */}
      <section className="max-w-5xl mx-auto px-4 md:px-6 pb-16 grid grid-cols-1 md:grid-cols-[1.25fr_.85fr] gap-6">
        {/* Left: Items + totals */}
        <div className="rounded-2xl border border-gray-200 overflow-hidden">
          <header className="px-5 py-3 border-b text-sm font-semibold">
            Details
          </header>

          {/* Items */}
          <div className="divide-y">
            {(snap?.items || []).map((it, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-12 w-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                  {it.image ? (
                    <img src={it.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full grid place-items-center text-xs text-gray-400">
                      IMG
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{it.title}</div>
                  <div className="text-xs text-gray-500">
                    {it.size ? `Size: ${it.size} · ` : ""}
                    Qty: {it.qty}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <div className="line-through opacity-0 select-none">0</div>
                  <div className="font-medium">
                    {INR((it.unitPrice || 0) * (it.qty || 0))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="px-5 py-4 border-t">
            <dl className="space-y-2 text-sm">
              <Row label="Subtotal" value={INR(snap?.amounts?.subtotal || 0)} />
              <Row label="Shipping" value={INR(snap?.amounts?.shipping || 0)} />
              {typeof snap?.amounts?.discount === "number" && (
                <Row
                  label="Discount"
                  value={`- ${INR(Math.abs(snap.amounts.discount))}`}
                />
              )}
              <Row label="Taxes" value={INR(snap?.amounts?.tax || 0)} />
              <Row
                label={<span className="font-semibold">Total</span>}
                value={<span className="font-semibold">{INR(snap?.amounts?.total || 0)}</span>}
              />
            </dl>
          </div>
        </div>

        {/* Right: Cards */}
        <div className="space-y-6">
          {/* Customer */}
          <Card title="Customer info">
            <div className="text-sm">
              <div className="font-semibold">{snap?.customer?.name || "—"}</div>
              <div className="text-gray-600 break-all">{snap?.customer?.email || "—"}</div>
              {snap?.customer?.phone && (
                <div className="text-gray-600">{snap.customer.phone}</div>
              )}
            </div>
          </Card>

          {/* Delivery */}
          <Card title="Delivery">
            <dl className="text-sm space-y-2">
              <Row label="Ship by" value="DHL" />
              <Row label="Speedy" value="Standard" />
              <Row
                label="Tracking No."
                value={
                  <span className="text-pink-600">
                    {(snap?.paymentInfo?.razorpay_order_id || "").slice(0, 12) || "—"}
                  </span>
                }
              />
            </dl>
          </Card>

          {/* Shipping */}
          <Card title="Shipping">
            <div className="text-sm text-gray-700 leading-relaxed">
              {snap?.shipping ? (
                <>
                  <div>{snap.shipping.addr1}</div>
                  {snap.shipping.addr2 && <div>{snap.shipping.addr2}</div>}
                  <div>
                    {snap.shipping.city}, {snap.shipping.state} {snap.shipping.postal}
                  </div>
                  <div>{snap.shipping.country}</div>
                </>
              ) : (
                "—"
              )}
            </div>
          </Card>

          {/* Payment */}
          <Card title="Payment">
            <div className="text-sm">
              <div className="text-gray-700">
                Razorpay
                {snap?.paymentInfo?.last4 ? ` • •••• ${snap.paymentInfo.last4}` : ""}
              </div>
              {snap?.paymentInfo?.razorpay_payment_id && (
                <div className="text-xs text-gray-500 mt-1 break-all">
                  {snap.paymentInfo.razorpay_payment_id}
                </div>
              )}
            </div>
          </Card>
        </div>
      </section>

   <ContactPage></ContactPage>
    </main>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden">
      <header className="px-5 py-3 border-b text-sm font-semibold">
        {title}
      </header>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-gray-600">{label}</dt>
      <dd className="ml-3">{value}</dd>
    </div>
  );
}
