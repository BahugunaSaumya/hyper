// src/app/api/razorpay-verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/firebaseAdmin";
import { sendOrderEmails } from "@/lib/email";

export const runtime = "nodejs";
// --- helpers: drop into your order detail page file ---
function toDateSafe(ts: any): Date | null {
  if (!ts) return null;
  try {
    if (ts instanceof Date) return ts;
    if (typeof ts === "string" || typeof ts === "number") return new Date(ts);
    if (ts.toDate) return ts.toDate();                              // Firestore Timestamp
    if (typeof ts.seconds === "number") return new Date(ts.seconds * 1000);
  } catch { }
  return null;
}

function formatDateTime(d: Date | null) {
  return d ? d.toLocaleString("en-IN", { hour12: false }) : "—";
}

function getDisplayTotals(order: any) {
  // new flow: rupees live under 'amounts' OR 'totals'
  const b = order?.amounts || order?.totals || {};
  let subtotal = Number(b.subtotal || 0);
  let shipping = Number(b.shipping || 0);
  let total = Number(b.total || 0);
  let currency = b.currency || order?.currency || "INR";

  // legacy fallback: paise at top-level 'total'
  if (!total && typeof order?.total === "number") total = order.total / 100;

  return { subtotal, shipping, total, currency };
}

const inr = (n: number) => "₹ " + Number(n || 0).toLocaleString("en-IN");

type VerifyBody = {
  // Firestore order id created earlier in your flow
  orderId: string;

  // Razorpay fields returned to the handler on success
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;

  // optional passthroughs if you want to upsert any missing details
  // (we keep them but do not rely on them unless the order doc is missing fields)
  customer?: any;
  items?: any[];
  total?: number;       // in paise (server is source of truth ideally)
  currency?: string;    // default "INR"
  shippingAddress?: any;
  note?: string | null;
};

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${orderId}|${paymentId}`);
  const expected = hmac.digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VerifyBody;

    const {
      orderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customer,
      items,
      total,
      currency = "INR",
      shippingAddress,
      note,
    } = body || {};

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing Razorpay verification fields" }, { status: 400 });
    }
    if (!process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Razorpay secret not configured" }, { status: 500 });
    }

    // 1) Verify signature
    const ok = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      process.env.RAZORPAY_KEY_SECRET
    );

    if (!ok) {
      console.warn("[razorpay-verify] signature mismatch", {
        razorpay_order_id,
        razorpay_payment_id,
      });
      return NextResponse.json({ verified: false, error: "Invalid signature" }, { status: 400 });
    }

    const db = getDb();
    const ref = db.collection("orders").doc(String(orderId));

    // 2) Idempotent update (mark paid once, record payment details)
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existing = snap.exists ? (snap.data() || {}) : {};

      // Ensure a base document exists (won't overwrite existing values)
      if (!snap.exists) {
        tx.set(
          ref,
          {
            status: "created",
            customer: customer || {},
            items: Array.isArray(items) ? items : [],
            total: typeof total === "number" ? total : 0,
            currency,
            shippingAddress: shippingAddress || null,
            note: note ?? null,
            createdAt: new Date(),
            source: "razorpay-verify-upsert",
          },
          { merge: true }
        );
      }

      const alreadyPaid = existing?.status === "paid";
      const alreadyEmailed =
        !!existing?.email?.customerSentAt && !!existing?.email?.adminSentAt;

      // If fully processed earlier, no-op
      if (alreadyPaid && alreadyEmailed) return;

      tx.set(
        ref,
        {
          status: "paid",
          payment: {
            ...(existing.payment || {}),
            provider: "razorpay",
            status: "paid",
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            verifiedAt: new Date(),
            mode: "live",
          },
          updatedAt: new Date(),
          email: { ...(existing.email || {}), willSendNow: true },
        },
        { merge: true }
      );
    });

    // 3) Send emails exactly once
    const fresh = await ref.get();
    const order = { id: fresh.id, ...(fresh.data() || {}) };

    if (!order?.email?.customerSentAt || !order?.email?.adminSentAt) {
      try {
        await sendOrderEmails(String(orderId), order);
        await ref.set(
          {
            email: {
              ...(order.email || {}),
              customerSentAt: order.email?.customerSentAt || new Date(),
              adminSentAt: order.email?.adminSentAt || new Date(),
              willSendNow: false,
            },
            updatedAt: new Date(),
          },
          { merge: true }
        );
      } catch (e: any) {
        console.error("[razorpay-verify] email error:", e?.message || e);
        await ref.set(
          {
            email: {
              ...(order.email || {}),
              willSendNow: false,
              lastError: String(e?.message || e),
            },
          },
          { merge: true }
        );
      }
    }

    return NextResponse.json(
      {
        success: true,
        verified: true,
        mode: "live",
        message: "Payment verified; order marked paid (idempotent) and emails handled.",
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        orderId,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[razorpay-verify] fatal:", err?.message || err);
    return NextResponse.json({ error: "Unable to verify payment" }, { status: 500 });
  }
}
