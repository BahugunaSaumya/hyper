import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "../_lib/auth";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;
const keyFor = (limit: number) => `admin:qry:orders?limit=${limit}`;

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(500, Number(searchParams.get("limit") || 200)));

    const k = keyFor(limit);
    const peek = cache.peek(k);
    let xcache = "MISS";

    const orders = await cache.remember<Array<{ id: string; [k: string]: any }>>(
      k,
      TTL_MS,
      SWR_MS,
      async () => {
        const db = getDb();
        const snap = await db.collection("orders").orderBy("createdAt", "desc").limit(limit).get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    );

    if (peek.has && (peek.fresh || peek.stale)) xcache = peek.fresh ? "HIT" : "STALE";

    return NextResponse.json(
      { orders },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
          "X-Cache": xcache,
        },
      }
    );
  } catch (e: any) {
    console.error("[/api/admin/orders GET] error:", e);
    return NextResponse.json({ error: e?.message || "Failed to load orders" }, { status: 500 });
  }
}
