import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/auth";
import { getDb } from "@/lib/firebaseAdmin";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

const TTL_MS = 30_000;
const SWR_MS = 120_000;
const SUM_KEY = "admin:sum:dashboard";

function isPaid(doc: any): boolean {
  const s = String(doc?.status || "").toLowerCase();
  const ps = String(doc?.payment?.status || "").toLowerCase();
  // Treat captured/authorized as paid for Razorpay (captured is the main one)
  return s === "paid" || ps === "paid" || ps === "captured" || ps === "authorized";
}

function isTest(doc: any): boolean {
  const mode = String(doc?.payment?.mode || "").toLowerCase();
  return mode === "test";
}

function itemsSubtotalRu(items: any[]): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, it) => {
    const qty = Number(it?.qty ?? 1) || 1;
    const unit =
      typeof it?.unitPrice === "number"
        ? it.unitPrice // rupees
        : typeof it?.price === "number"
          ? it.price / 100 // paise → rupees
          : 0;
    return sum + unit * qty;
  }, 0);
}

/**
 * Get order total in Rupees, robust to your schema variants.
 * Prefers amounts -> totals -> hintTotals -> composed -> payment.amount (paise).
 */
function getOrderTotalRu(order: any): number {
  const b =
    (order?.amounts && Object.keys(order.amounts).length ? order.amounts : null) ??
    (order?.totals && Object.keys(order.totals).length ? order.totals : null) ??
    (order?.hintTotals && Object.keys(order.hintTotals).length ? order.hintTotals : null) ??
    {};

  const direct = Number(b?.total);
  if (!Number.isNaN(direct) && direct > 0) return direct;

  const subtotal = itemsSubtotalRu(order?.items);
  const shipping = Number(b?.shipping) || 0;
  const discount = Number(b?.discount) || 0;
  const tax = Number(b?.tax) || 0;
  const composed = Math.max(0, subtotal + shipping + tax - discount);

  // Fallback to payment amount (paise) if present
  const paise = Number(order?.payment?.amount ?? order?.paymentInfo?.amount);
  const payRu = !Number.isNaN(paise) && paise > 0 ? paise / 100 : 0;

  return Math.max(direct || 0, composed, payRu);
}

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const peek = cache.peek(SUM_KEY);
  let xcache = "MISS";

  const payload = await cache.remember<{ ordersCount: number; usersCount: number; revenue: number }>(
    SUM_KEY,
    TTL_MS,
    SWR_MS,
    async () => {
      const db = getDb();
      const [ordersSnap, usersSnap] = await Promise.all([
        db.collection("orders").get(),
        db.collection("users").get(),
      ]);

      let revenue = 0;

      for (const d of ordersSnap.docs) {
        const data = d.data();

        // Count only paid, skip test/demo
        if (!isPaid(data)) continue;
        if (isTest(data)) continue;

        revenue += getOrderTotalRu(data);
      }

      return {
        ordersCount: ordersSnap.size, // keep the same definition you had
        usersCount: usersSnap.size,
        revenue,
      };
    }
  );

  if (peek.has && (peek.fresh || peek.stale)) xcache = peek.fresh ? "HIT" : "STALE";
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      "X-Cache": xcache,
    },
  });
}
