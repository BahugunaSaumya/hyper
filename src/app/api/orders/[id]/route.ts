import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }   // 👈 params is a Promise
) {
  try {
    const { id } = await ctx.params;         // 👈 await it
    const orderId = decodeURIComponent(id || "").trim();
    if (!orderId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const db = getDb();
    const snap = await db.collection("orders").doc(orderId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const o = snap.data() || {};
    const placedAtISO =
      (o.createdAt || o.placedAt || o.updatedAt)?.toDate?.()?.toISOString?.() ?? null;

    // Normalize: always include `id`
    const payload = {
      id: snap.id,
      orderId: snap.id, // keep this too if elsewhere referenced
      placedAt: placedAtISO,
      customer: o.customer || null,
      shipping: o.shipping || null,
      items: o.items || [],
      amounts:
        o.amounts || {
          subtotal: o.subtotal ?? 0,
          shipping: o.shipping ?? 0,
          tax: o.tax ?? 0,
          total: o.total ?? 0,
          currency: o.currency ?? "INR",
        },
      paymentInfo: o.paymentInfo || o.payment || null,
      status: o.status || "paid",
    };

    return NextResponse.json({ ok: true, order: payload }, { status: 200 });
  } catch (e: any) {
    console.error("[orders/:id] fatal", e?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
