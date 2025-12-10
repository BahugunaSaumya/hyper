import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { parseCSV, mapProducts } from "@/lib/csv";
import { promises as fs } from "fs";
import path from "path";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;
const CSV_TTL = 5 * 60_000;
const CSV_SWR = 30 * 60_000;

function keyFor(slug: string) {
  return `admin:qry:byCategory?slug=${slug}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "Missing category slug" }, { status: 400 });
  }

  const headers = {
    "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=300",
  };

  const cacheKey = keyFor(slug);

  // 1️⃣ Firestore (primary)
  try {
    const products = await cache.remember<Array<any>>(
      cacheKey,
      TTL_MS,
      SWR_MS,
      async () => {
        const db = getDb();
        const snap = await db
          .collection("products")
          .where("categories", "array-contains", slug)
          .get();

        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    );
    
    if (Array.isArray(products) && products.length > 0) {
      return NextResponse.json({ products }, { status: 200, headers });
    }
  } catch (e) {
    console.warn("[/api/products/by-category] Firestore unavailable; falling back to CSV.", e);
  }

  // 2️⃣ CSV fallback
  try {
    const csvKey = `csv:byCategory?slug=${slug}`;
    const products = await cache.remember<Array<any>>(
      csvKey,
      CSV_TTL,
      CSV_SWR,
      async () => {
        const file = path.join(process.cwd(), "public", "assets", "hyper-products-sample.csv");
        const csv = await fs.readFile(file, "utf8");
        const all = mapProducts(parseCSV(csv));

        const filtered = all.filter((p) => Array.isArray(p.categories) && p.categories.includes(slug));
        return filtered;
      }
    );

    return NextResponse.json({ products }, { status: 200, headers });
  } catch (e) {
    console.error("[/api/products/by-category] CSV fallback failed:", e);
    return NextResponse.json({ error: "No products found for this category" }, { status: 404, headers });
  }
}
