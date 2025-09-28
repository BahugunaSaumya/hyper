import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "../_lib/auth";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

const TTL_MS = 60_000;      // serve fresh for 60s
const SWR_MS = 5 * 60_000;  // serve stale up to 5m while background-refreshing
const LIST_KEY = "admin:qry:products?all=1";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  // Peek BEFORE remember() so we can report X-Cache reliably
  const peek = cache.peek(LIST_KEY);
  let xcache = "MISS";

  try {
    const products = await cache.remember<Array<{ id: string; [k: string]: any }>>(
      LIST_KEY,
      TTL_MS,
      SWR_MS,
      async () => {
        const db = getDb();
        const snap = await db.collection("products").get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      }
    );

    // Calculate dynamic headers list (union of keys; always include id)
    const headersList = Array.from(
      products.reduce((set: Set<string>, p: any) => {
        Object.keys(p).forEach((k) => set.add(k));
        return set;
      }, new Set<string>(["id"]))
    );

    if (peek.has && (peek.fresh || peek.stale)) xcache = peek.fresh ? "HIT" : "STALE";

    return NextResponse.json(
      { products, headers: headersList },
      {
        status: 200,
        headers: {
          // private since it’s admin; adjust if you want CDN caching on an admin proxy
          "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
          "X-Cache": xcache,
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to load products" }, { status: 500 });
  }
}

/** POST → upsert a product: { id?: string, ...fields } */
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const payload = await req.json();
    const db = getDb();
    const { id, ...data } = payload || {};

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    // Clean empty strings
    for (const k of Object.keys(data)) {
      if (data[k] === "") delete data[k];
    }

    if (id) {
      await db.collection("products").doc(String(id)).set(
        { ...data, updatedAt: new Date() },
        { merge: true }
      );
      // Invalidate lists + the specific doc cache (if any was read elsewhere)
      cache.del("admin:qry:products");
      cache.del(`admin:doc:products/${String(id)}`);
      return NextResponse.json({ ok: true, id }, { status: 200 });
    } else {
      const doc = await db.collection("products").add({ ...data, createdAt: new Date() });
      // Invalidate lists
      cache.del("admin:qry:products");
      return NextResponse.json({ ok: true, id: doc.id }, { status: 201 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to save product" }, { status: 500 });
  }
}
