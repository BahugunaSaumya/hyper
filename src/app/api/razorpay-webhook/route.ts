// src/app/api/razorpay-webhook/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/firebaseAdmin";
import { sendOrderEmails } from "@/lib/email";

export const runtime = "nodejs";

// Razorpay sends the webhook signature in this header
const SIGNATURE_HEADER = "x-razorpay-signature";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text(); // must read raw text for HMAC
    const signature = req.headers.get(SIGNATURE_HEADER);

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }
    if (!signature) {
      return NextResponse.json({ error: "Missing signature header" }, { status: 400 });
    }

    // Verify signature
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      console.warn("[webhook] Signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(rawBody);

    if (payload.event === "payment.captured") {
      const { order_id, id: payment_id } = payload.payload.payment.entity;
      const db = getDb();

      // Find Firestore order by receipt/order_id
      const match = await db
        .collection("orders")
        .where("payment.razorpay_order_id", "==", order_id)
        .limit(1)
        .get();

      if (match.empty) {
        console.error("[webhook] No Firestore order found for:", order_id);
        return NextResponse.json({ ok: true });
      }

      const doc = match.docs[0].ref;
      const data = match.docs[0].data();

      // Update order if not already marked paid
      if (data.status !== "paid") {
        await doc.set(
          {
            status: "paid",
            updatedAt: new Date(),
            payment: {
              ...(data.payment || {}),
              status: "paid",
              razorpay_order_id: order_id,
              razorpay_payment_id: payment_id,
              verifiedAt: new Date(),
              mode: "webhook",
            },
            email: { ...(data.email || {}), willSendNow: true },
          },
          { merge: true }
        );

        // Send emails (idempotent, same logic as verify route)
        try {
          await sendOrderEmails(doc.id, { id: doc.id, ...data });
          await doc.set(
            {
              email: {
                ...(data.email || {}),
                customerSentAt: new Date(),
                adminSentAt: new Date(),
                willSendNow: false,
              },
            },
            { merge: true }
          );
        } catch (e) {
          console.error("[webhook] email error:", e);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[webhook] error:", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
