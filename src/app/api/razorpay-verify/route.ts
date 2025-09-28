// src/app/api/razorpay-verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { sendOrderEmails } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    console.log("[verify] incoming body:", body);

    let {
      orderId,                  // Firestore orders/<orderId> (optional in mock)
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      // optional passthroughs to create an order if orderId is missing
      customer,
      items,
      total,
      currency = "INR",
      shippingAddress,
      note,
    } = body || {};

    const db = getDb();

    // If orderId is missing, create a minimal order so emails can still be tested in dev
    if (!orderId) {
      const created = await db.collection("orders").add({
        status: "created",
        customer: customer || {},
        items: Array.isArray(items) ? items : [],
        total: typeof total === "number" ? total : 0, // paise
        currency,
        shippingAddress: shippingAddress || null,
        note: note || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        payment: { provider: "razorpay", status: "created", mode: "mock" },
        source: "mock-verify-no-orderId",
      });
      orderId = created.id;
      console.log("[verify] created order because orderId missing:", orderId);
    }

    // Fill mock Razorpay fields if missing
    const now = Date.now();
    razorpay_order_id = razorpay_order_id || `order_mock_${now}`;
    razorpay_payment_id = razorpay_payment_id || `pay_mock_${now}`;
    razorpay_signature = razorpay_signature || `sig_mock_${now}`;

    const ref = db.collection("orders").doc(String(orderId));

    // Transaction for idempotency and safe updates
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existing = snap.exists ? (snap.data() || {}) : {};

      const alreadyPaid = existing?.status === "paid";
      const alreadyEmailed =
        !!existing?.email?.customerSentAt && !!existing?.email?.adminSentAt;

      // Always ensure we have a base order if it didn't exist
      if (!snap.exists) {
        tx.set(ref, {
          status: "created",
          customer: customer || {},
          items: Array.isArray(items) ? items : [],
          total: typeof total === "number" ? total : 0,
          currency,
          shippingAddress: shippingAddress || null,
          note: note || null,
          createdAt: new Date(),
          source: "mock-verify-created",
        }, { merge: true });
      }

      // If already paid + emailed, do nothing (idempotent)
      if (alreadyPaid && alreadyEmailed) return;

      // Mark paid + record payment fields
      tx.set(ref, {
        status: "paid",
        payment: {
          ...(existing.payment || {}),
          provider: "razorpay",
          status: "paid",
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          verifiedAt: new Date(),
          mode: "mock",
        },
        updatedAt: new Date(),
        email: { ...(existing.email || {}), willSendNow: true },
      }, { merge: true });
    });

    // Send the two emails exactly once
    const snap = await ref.get();
    const order = { id: snap.id, ...(snap.data() || {}) };

    if (!order?.email?.customerSentAt || !order?.email?.adminSentAt) {
      try {
        await sendOrderEmails(String(orderId), order);
        await ref.set({
          email: {
            ...(order.email || {}),
            customerSentAt: order.email?.customerSentAt || new Date(),
            adminSentAt: order.email?.adminSentAt || new Date(),
            willSendNow: false,
          },
          updatedAt: new Date(),
        }, { merge: true });
      } catch (e) {
        console.error("[verify] email error:", e);
        await ref.set({
          email: { ...(order.email || {}), willSendNow: false, lastError: String((e as any)?.message || e) },
        }, { merge: true });
      }
    }

    return NextResponse.json({
      success: true,
      verified: true,
      mode: "mock",
      message: "Order marked paid; emails sent (idempotent).",
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      orderId,
    }, { status: 200 });

  } catch (err: any) {
    console.error("[verify] fatal:", err?.message || err);
    return NextResponse.json({ error: "Unable to verify payment" }, { status: 500 });
  }
}
