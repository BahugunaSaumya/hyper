import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { parseCSV, mapProducts } from "@/lib/csv";
import { promises as fs } from "fs";
import path from "path";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

// cache settings
const TTL_MS = 60_000;       // fresh 60s
const SWR_MS = 5 * 60_000;   // serve stale up to 5m
const CSV_TTL = 5 * 60_000;  // CSV fresh 5m
const CSV_SWR = 30 * 60_000; // CSV stale 30m

function keyFor(limit: number) {
  return `admin:qry:products?limit=${limit}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit") || 12)));

  const headers = {
    "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
  };

  const cacheKey = keyFor(limit);

  // 1) Firestore (cached)
  try {
    const products = await cache.remember<Array<{ id: string; [k: string]: any }>>(
      cacheKey,
      TTL_MS,
      SWR_MS,
      async () => {
        const db = getDb();
        const snap = await db.collection("products").limit(limit).get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    );

    if (Array.isArray(products) && products.length) {
      return NextResponse.json({ products }, { status: 200, headers });
    }
  } catch (e) {
    console.warn("[/api/products] Firestore unavailable; using CSV fallback.", e);
  }

  // 2) CSV fallback (also cached)
  try {
    const csvKey = `csv:products?limit=${limit}`;
    const products = await cache.remember<Array<{ id: string; [k: string]: any }>>(
      csvKey,
      CSV_TTL,
      CSV_SWR,
      async () => {
        const file = path.join(process.cwd(), "public", "assets", "hyper-products-sample.csv");
        const csv = await fs.readFile(file, "utf8");
        // Ensure items include an id field
        return mapProducts(parseCSV(csv))
          .slice(0, limit)
          .map((p: any, i: number) => ({ id: p.id ?? p.slug ?? String(i), ...p }));
      }
    );

    return NextResponse.json({ products }, { status: 200, headers });
  } catch (e) {
    console.error("[/api/products] CSV fallback failed:", e);
    return NextResponse.json({ error: "No products available" }, { status: 404, headers });
  }
}
