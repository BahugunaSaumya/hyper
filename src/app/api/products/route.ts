import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

// cache settings
const TTL_MS = 60_000;       // fresh 60s
const SWR_MS = 5 * 60_000;   // serve stale up to 5m

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const limit =
    limitParam === "all"
      ? null
      : Math.max(1, Math.min(500, Number(limitParam || 50)));

  const headers = {
    "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
  };

  const cacheKey = `admin:qry:products?limit=${limitParam || "default"}`;
  let products: any[] = [];
  
  // --- 1️⃣ Try Firestore with cache ---
  try {
    products = await cache.remember<any[]>(
      cacheKey,
      TTL_MS,
      SWR_MS,
      async () => {
        const db = getDb();
        const snap = await db.collection("products").limit(limit ?? 500).get();
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        return list;
      }
    );

    // ✅ If Firestore returned products, stop here
    if (Array.isArray(products) && products.length > 0) {
      return NextResponse.json({ products }, { status: 200, headers });
    }
  } catch (e) {
    console.warn("[/api/products] Firestore unavailable:", e);
  }

  if (!products.length) {
    return NextResponse.json(
      { error: "No products available" },
      { status: 404, headers }
    );
  }

  return NextResponse.json({ products }, { status: 200, headers });
}
