import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

// Cache config for per-user lists
const TTL_MS = 30_000;      // fresh for 30s
const SWR_MS = 2 * 60_000;  // serve stale up to 2m

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v);
  if (!isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.floor(n)));
}
const keyFor = (uid: string, limit: number, cursor: string | null) =>
  `me:qry:orders?uid=${uid}&limit=${limit}&cursor=${cursor ?? ""}`;

export async function GET(req: NextRequest) {
  try {
    // --- Auth ---
    const authz = req.headers.get("authorization") || "";
    const token = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Initialize Admin (via getDb) then verify token
    const db = getDb();
    const { uid, email = "" } = await admin.auth().verifyIdToken(token);

    // --- Params ---
    const { searchParams } = new URL(req.url);
    const limit = clampInt(searchParams.get("limit"), 50, 1, 100);
    const cursor = (searchParams.get("cursor") || "").trim() || null;

    const k = keyFor(uid, limit, cursor);
    const peek = cache.peek(k);
    let xcache = "MISS";

    const { orders, hasMore, docs } = await cache.remember(
      k,
      TTL_MS,
      SWR_MS,
      async () => {
        // Query by uid (no composite index): where == uid + orderBy __name__
        let q = db
          .collection("orders")
          .where("userId", "==", uid)
          .orderBy(admin.firestore.FieldPath.documentId())
          .limit(limit + 1); // +1 to detect next page
        if (cursor) q = q.startAfter(cursor);
        let snap = await q.get();

        // If nothing by uid, try email (still avoids composite index)
        if (snap.empty && email) {
          let q2 = db
            .collection("orders")
            .where("customer.email", "==", email)
            .orderBy(admin.firestore.FieldPath.documentId())
            .limit(limit + 1);
          if (cursor) q2 = q2.startAfter(cursor);
          snap = await q2.get();
        }

        const docs = snap.docs;
        const hasMore = docs.length > limit;
        const page = hasMore ? docs.slice(0, limit) : docs;
        const orders = page.map((d) => ({ id: d.id, ...d.data() }));

        return { orders, hasMore, docs };
      }
    );

    if (peek.has && (peek.fresh || peek.stale)) xcache = peek.fresh ? "HIT" : "STALE";

    // Optional count (kept uncached to avoid staleness complaints; cheap enough)
    let count: number | undefined = undefined;
    try {
      const byUid = await db.collection("orders").where("userId", "==", uid).count().get();
      count = byUid.data().count;
      if (!count && (await db.collection("orders").where("customer.email", "==", email).count().get())) {
        const byEmail = await db.collection("orders").where("customer.email", "==", email).count().get();
        count = byEmail.data().count;
      }
    } catch {
      // ignore if count() not supported
    }

    return NextResponse.json(
      {
        orders,
        nextCursor: hasMore ? docs[limit].id : null,
        count,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
          "X-Cache": xcache,
        },
      }
    );
  } catch (e: any) {
    console.error("[/api/me/orders GET] error:", e?.stack || e?.message || e);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
