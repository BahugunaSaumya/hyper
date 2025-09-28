import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "../../_lib/auth";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;
const docKey = (id: string) => `admin:doc:products/${id}`;

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const k = docKey(params.id);
  const peek = cache.peek(k);
  let xcache = "MISS";

  try {
    const product = await cache.remember<Record<string, any> | null>(
      k,
      TTL_MS,
      SWR_MS,
      async () => {
        const db = getDb();
        const doc = await db.collection("products").doc(params.id).get();
        return doc.exists ? ({ id: doc.id, ...doc.data() }) : null;
      }
    );

    if (!product) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (peek.has && (peek.fresh || peek.stale)) xcache = peek.fresh ? "HIT" : "STALE";

    return NextResponse.json(product, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
        "X-Cache": xcache,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const patch = await req.json();
    const db = getDb();
    await db.collection("products").doc(params.id).set(
      { ...patch, updatedAt: new Date() },
      { merge: true }
    );

    // Invalidate doc + lists
    cache.del(docKey(params.id));
    cache.del("admin:qry:products");

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const db = getDb();
    await db.collection("products").doc(params.id).delete();

    // Invalidate doc + lists
    cache.del(docKey(params.id));
    cache.del("admin:qry:products");

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to delete" }, { status: 500 });
  }
}
