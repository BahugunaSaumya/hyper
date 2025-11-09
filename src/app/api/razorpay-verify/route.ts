// src/app/api/razorpay-verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getDb } from "@/lib/firebaseAdmin";
import { sendOrderEmails } from "@/lib/email";

export const runtime = "nodejs";

function validateSig(orderId: string, paymentId: string, signature: string, secret: string) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${orderId}|${paymentId}`);
  const expected = hmac.digest("hex");
  return expected === signature;
}

// ---- normalizers (kept local to avoid cross-file regressions)
function toNumber(n: any, d = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : d;
}

function normalizeAddress(src: any = {}) {
  const a = (src && typeof src === "object") ? (src.address || src.addr || src) : {};
  if (typeof a === "string") {
    const s = a.trim(); return { addr1: s, addr2: "", city: "", state: "", postal: "", country: "" };
  }
  const addr1   = a.addr1   ?? a.address1 ?? a.address_line1 ?? a.line1 ?? a.address ?? a.street ?? "";
  const addr2   = a.addr2   ?? a.address2 ?? a.address_line2 ?? a.line2 ?? a.apartment ?? a.flat ?? a.street2 ?? "";
  const city    = a.city    ?? a.town ?? a.locality ?? a.district ?? "";
  const state   = a.state   ?? a.province ?? a.region ?? a.state_code ?? "";
  const postal  = a.postal  ?? a.postalCode ?? a.postcode ?? a.zip ?? a.zipcode ?? a.pincode ?? "";
  const country = (a.country ?? a.countryCode ?? a.country_code ?? "IN") as string;
  return { addr1, addr2, city, state, postal, country };
}

function pickPlacedAt(o: any) {
  const v = o?.placedAt || o?.createdAt || o?.payment?.verifiedAt || o?.updatedAt;
  try {
    if (v?.toDate) return v.toDate();
    if (typeof v?.seconds === "number") return new Date(v.seconds * 1000);
    if (typeof v?._seconds === "number") return new Date(v._seconds * 1000);
    if (v instanceof Date) return v;
    if (typeof v === "string" || typeof v === "number") {
      const d = new Date(v); return isNaN(+d) ? new Date() : d;
    }
  } catch {}
  return new Date();
}

export async function POST(req: NextRequest) {
  try {
    const body: any = await req.json();
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature, snapshot } = body || {};

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing Razorpay fields" }, { status: 400 });
    }
    const secret = process.env.RAZORPAY_KEY_SECRET || "";
    if (!validateSig(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret)) {
      return NextResponse.json({ verified: false, error: "Invalid signature" }, { status: 400 });
    }

    const db = getDb();
    const id = String(orderId || razorpay_order_id);
    const ref = db.collection("orders").doc(id);

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existing = snap.exists ? (snap.data() || {}) : {};

      if (existing?.status === "paid") return; // idempotent

      // derive parts from snapshot (client hint) but keep server in charge
      const amounts = snapshot?.amounts || {};
      const subtotal = toNumber(amounts.subtotal);
      const shipping = toNumber(amounts.shipping);
      const tax = toNumber(amounts.tax); // GST we computed client + server at 5%
      let total = toNumber(amounts.total);

      // If total is missing, compose it
      if (!(total > 0)) {
        total = Math.max(0, subtotal + shipping + tax - toNumber(amounts.discount));
      }

      const currency = (amounts.currency || existing?.amounts?.currency || "INR").toUpperCase();

      const shippingAddr =
        existing?.shipping && typeof existing.shipping === "object"
          ? normalizeAddress(existing.shipping)
          : normalizeAddress(snapshot?.shipping || snapshot?.shippingAddress || existing?.shippingAddress);

      const placedAt = existing?.placedAt || pickPlacedAt({ ...existing, ...snapshot });

      const items =
        Array.isArray(existing?.items) && existing.items.length
          ? existing.items
          : Array.isArray(snapshot?.items)
            ? snapshot.items
            : [];

      const doc = {
        ...(existing || {}),
        status: "paid" as const,
        placedAt,
        updatedAt: new Date(),
        customer: existing?.customer ?? snapshot?.customer ?? {},
        shipping: shippingAddr,
        items,
        amounts: {
          subtotal,
          shipping,
          tax,
          // keep discount if it ever exists
          discount: toNumber(existing?.amounts?.discount ?? amounts.discount ?? 0),
          total,
          currency,
        },
        payment: {
          ...(existing?.payment || {}),
          status: "paid",
          mode: "live",
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          verifiedAt: new Date(),
          amount: Math.round(total * 100), // paise
        },
        source: existing?.source || "verify-endpoint",
      };

      tx.set(ref, doc, { merge: true });
    });

    // send emails (best-effort, idempotent)
    try {
      const after = await ref.get();
      const data: any = after.data() || {};
      const already = !!data?.email?.customerSentAt && !!data?.email?.adminSentAt;
      if (!already && data?.status === "paid") {
        await sendOrderEmails(id, data);
        await ref.set(
          { email: { ...(data.email || {}), customerSentAt: new Date(), adminSentAt: new Date() } },
          { merge: true }
        );
      }
    } catch (e) {
      console.error("[verify] email error:", e);
    }

    return NextResponse.json({
      verified: true,
      mode: "live",
      message: "Payment verified and order saved as paid.",
      orderId: id,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
    });
  } catch (e: any) {
    console.error("[verify] fatal:", e);
    return NextResponse.json({ error: e?.message || "Unable to verify" }, { status: 500 });
  }
}
