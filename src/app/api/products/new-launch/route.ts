import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { parseCSV, mapProducts } from "@/lib/csv";
import { promises as fs } from "fs";
import path from "path";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

// cache settings
const TTL_MS = 60_000;       // Firestore cache 60s
const SWR_MS = 5 * 60_000;   // Stale-while-revalidate 5m
const CSV_TTL = 5 * 60_000;  // CSV cache 5m
const CSV_SWR = 30 * 60_000; // CSV stale 30m

function keyFor(limit: number) {
  return `admin:qry:newlaunch?limit=${limit}`;
}

export async function GET(req: NextRequest) {
  // await cache.clear(); 
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit") || 12)));

  const headers = {
    "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
  };

  const cacheKey = keyFor(limit);

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
          .where("new_launch", "==", 1)
          .limit(limit)
          .get();

        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    );

    if (Array.isArray(products) && products.length > 0) {
      return NextResponse.json({ products }, { status: 200, headers });
    }
  } catch (e) {
    console.warn("[/api/products/new-launch] Firestore unavailable; falling back to CSV.", e);
  }

  // 2️⃣ CSV fallback (cached)
  try {
    const csvKey = `csv:newlaunch?limit=${limit}`;
    const products = await cache.remember<Array<{ id: string; [k: string]: any }>>(
      csvKey,
      CSV_TTL,
      CSV_SWR,
      async () => {
        const file = path.join(process.cwd(), "public", "assets", "hyper-products-sample.csv");
        const csv = await fs.readFile(file, "utf8");

        const all = mapProducts(parseCSV(csv));

        // ✅ Normalize & filter robustly
        const filtered = all.filter((p: any) => {
          const val = String(p.new_launch ?? "")
            .trim()
            .replace(/['"]/g, "")
            .toLowerCase();
          return val === "1" || val === "true";
        });

        return filtered.slice(0, limit).map((p: any, i: number) => ({
          id: p.id ?? p.slug ?? String(i),
          ...p,
        }));
      }
    );

    return NextResponse.json({ products }, { status: 200, headers });
  } catch (e) {
    console.error("[/api/products/new-launch] CSV fallback failed:", e);
    return NextResponse.json({ error: "No new launch products available" }, { status: 404, headers });
  }
}
