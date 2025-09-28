import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;
const docKey = (id: string) => `admin:doc:orders/${id}`;

export async function GET(_req: NextRequest, ctx: { params?: { id?: string } }) {
  const id = ctx?.params?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing order id" }, { status: 400 });
  }

  const k = docKey(id);
  const peek = cache.peek(k);
  let xcache = "MISS";

  try {
    const order = await cache.remember<Record<string, any> | null>(
      k,
      TTL_MS,
      SWR_MS,
      async () => {
        const db = getDb();
        const snap = await db.collection("orders").doc(id).get();
        return snap.exists ? ({ id: snap.id, ...snap.data() }) : null;
      }
    );

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (peek.has && (peek.fresh || peek.stale)) xcache = peek.fresh ? "HIT" : "STALE";

    return NextResponse.json(order, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        "X-Cache": xcache,
      },
    });
  } catch (e: any) {
    console.error("[/api/admin/orders/:id GET] error:", e?.stack || e?.message || e);
    return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
  }
}
