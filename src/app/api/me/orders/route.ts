
// src/app/api/me/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import admin from "firebase-admin";

export const runtime = "nodejs";

/**
 * GET /api/me/orders?limit=50&cursor=<lastDocId>
 * - Authenticated users only (ID token in Authorization: Bearer <token>)
 * - Fetches orders for the current user (by uid; falls back to email)
 * - Cursor is a document ID (so we can avoid composite indexes)
 * - Results are client-sorted by createdAt
 */
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

    // --- Query by uid (no composite index): where == uid + orderBy __name__ ---
    // We order by document ID purely to use startAfter without composite index.
    // We'll sort by createdAt on the client.
    let q = db
      .collection("orders")
      .where("userId", "==", uid)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(limit + 1); // +1 to detect next page

    if (cursor) q = q.startAfter(cursor);
    let snap = await q.get();

    // If nothing by uid, try email (still no orderBy createdAt -> no composite index)
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

    // Try to get an accurate count (optional)
    let count = undefined as number | undefined;
    try {
      const byUid = await db.collection("orders").where("userId", "==", uid).count().get();
      count = byUid.data().count;
      if (!count && email) {
        const byEmail = await db.collection("orders").where("customer.email", "==", email).count().get();
        count = byEmail.data().count;
      }
    } catch {
      // older SDKs may not support count(); ignore
    }

    return NextResponse.json(
      {
        orders,
        nextCursor: hasMore ? docs[limit].id : null,
        count,
      },
      { status: 200 }
    );
  } catch (e: any) {
    console.error("[/api/me/orders GET] error:", e?.stack || e?.message || e);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v);
  if (!isFinite(n)) return def;
  return Math.max(min, Math.min(max, Math.floor(n)));
}
