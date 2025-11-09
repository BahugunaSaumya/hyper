// src/app/api/razorpay-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/firebaseAdmin";
import { sendOrderEmails } from "@/lib/email";
import {
  normalizeShipping,
  computeTotal,
  inferCurrency,
  inferModeFromKey,
  bestPlacedAt,
} from "@/lib/order-normalize";

export const runtime = "nodejs";
const SIG = "x-razorpay-signature";

function isPaid(payment: any) {
  const s = String(payment?.status || "").toLowerCase();
  return s === "captured" || s === "authorized" || s === "paid";
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const got = req.headers.get(SIG) || "";
    const want = crypto.createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || "").update(raw).digest("hex");
    if (got !== want) return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 400 });

    const event = JSON.parse(raw);
    if (event?.event !== "payment.captured" && event?.event !== "payment.authorized") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const payment = event?.payload?.payment?.entity;
    if (!isPaid(payment)) return NextResponse.json({ ok: true, ignored: true });

    const orderId = String(payment?.order_id || "");
    const paymentId = String(payment?.id || "");
    if (!orderId || !paymentId) return NextResponse.json({ ok: true, ignored: true });

    const db = getDb();
    const ref = db.collection("orders").doc(orderId);

    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    const mode = inferModeFromKey(keyId);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existing = snap.exists ? (snap.data() || {}) : {};

      // Build consistent amounts/shipping; webhook has limited snapshot, so lean on existing
      const total = computeTotal({}, existing);
      const currency = inferCurrency({}, existing);
      const shipping = normalizeShipping(existing?.shipping || {});
      const placedAt = existing?.placedAt || bestPlacedAt(existing);

      const doc = {
        ...(existing || {}),
        status: "paid" as const,
        placedAt,
        updatedAt: new Date(),
        shipping,
        amounts: { ...(existing?.amounts || {}), total, currency },
        payment: {
          ...(existing?.payment || {}),
          status: "paid",
          mode,
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          amount: payment?.amount, // paise
          verifiedAt: new Date(),
        },
        source: "webhook",
      };

      tx.set(ref, doc, { merge: true });
    });

    // send emails once
    try {
      const after = await ref.get();
      const data: any = after.data() || {};
      const already = !!data?.email?.customerSentAt && !!data?.email?.adminSentAt;
      if (!already && data?.status === "paid") {
        await sendOrderEmails(orderId, data);
        await ref.set(
          { email: { ...(data.email || {}), customerSentAt: new Date(), adminSentAt: new Date() } },
          { merge: true }
        );
      }
    } catch (e) {
      console.error("[webhook] email error:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[webhook] error:", e);
    return NextResponse.json({ error: e?.message || "Webhook error" }, { status: 500 });
  }
}
