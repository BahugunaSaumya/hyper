import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/auth";
import { getDb } from "@/lib/firebaseAdmin";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

const TTL_MS = 30_000;
const SWR_MS = 120_000;
const SUM_KEY = "admin:sum:dashboard";

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
        const a = d.data()?.amounts?.total;
        if (typeof a === "number") revenue += a;
      }

      return { ordersCount: ordersSnap.size, usersCount: usersSnap.size, revenue };
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
