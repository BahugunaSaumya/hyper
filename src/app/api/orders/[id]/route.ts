// src/app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = decodeURIComponent(params.id || "").trim();
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const db = getDb();
    const snap = await db.collection("orders").doc(id).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const o = snap.data() || {};
    // Normalize a compact snapshot for the client
    const payload = {
      orderId: snap.id,
      placedAt: (o.createdAt || o.placedAt || o.updatedAt)?.toDate?.()?.toISOString?.() ?? null,
      customer: o.customer || null,
      shipping: o.shipping || null,
      items: o.items || [],
      amounts: o.amounts || {
        subtotal: o.subtotal ?? 0,
        shipping: o.shipping ?? 0,
        tax: o.tax ?? 0,
        total: o.total ?? 0,
        currency: o.currency ?? "INR",
      },
      paymentInfo: o.paymentInfo || o.payment || null,
      status: o.status || "paid",
    };

    return NextResponse.json({ ok: true, order: payload });
  } catch (e: any) {
    console.error("[orders/:id] fatal", e?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
