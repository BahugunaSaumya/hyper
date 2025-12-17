import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

// cache settings
const TTL_MS = 60_000;       // Firestore cache 60s
const SWR_MS = 5 * 60_000;   // Stale-while-revalidate 5m

export async function GET(req: NextRequest) {
  const headers = {
    "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
  };

  const cacheKey = 'admin:qry:newlaunch?limit=12';

  // 1️⃣ Firestore (primary, cached)
  try {
    const products = await cache.remember<Array<{ id: string; [k: string]: any }>>(
      cacheKey,
      TTL_MS,
      SWR_MS,
      async () => {
        const db = getDb();
        const snap = await db
          .collection("products")
          .where("new_launch", "==", true)
          .limit(12)
          .get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    );
    if (Array.isArray(products) && products.length > 0) {
      return NextResponse.json({ products }, { status: 200, headers });
    }
    return [];
  } catch (e) {
    console.warn("[/api/products/new-launch] Firestore unavailable; falling back to CSV.", e);
    return NextResponse.json({ error: "No new launch products available" }, { status: 404, headers });
  }
}
