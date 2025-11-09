// src/app/api/reviews/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb, getAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

function isAdminFromToken(tok: any): boolean {
  // Custom claims come through on the decoded token; support a few common shapes.
  return !!(tok?.admin || tok?.isAdmin || tok?.claims?.admin);
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // ⬅️ params is a Promise in Next 14/15
) {
  try {
    // ⬅️ await params
    const { id: raw } = await ctx.params;
    const id = decodeURIComponent(raw || "").trim(); // expected: productId__userId
    if (!id || !id.includes("__")) {
      return NextResponse.json({ error: "Bad id" }, { status: 400 });
    }

    const [productId, ownerUid] = id.split("__");
    const db = getDb();

    // ----- Auth (owner or admin) -----
    const authHeader = req.headers.get("authorization") || "";
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tok = await getAuth().verifyIdToken(m[1]).catch(() => null);
    if (!tok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const isOwner = tok.uid === ownerUid;
    const isAdmin = isAdminFromToken(tok);
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const reviewRef = db.collection("reviews").doc(id);
    const productRef = db.collection("products").doc(productId);

    await db.runTransaction(async (tx) => {
      // ✅ READS FIRST
      const [reviewSnap, productSnap] = await Promise.all([
        tx.get(reviewRef),
        tx.get(productRef),
      ]);

      if (!reviewSnap.exists) {
        // Nothing to delete; no-op
        return;
      }

      const r = reviewSnap.data() || {};
      const wasApproved = (r.status || "approved") === "approved";
      const rRating = Number(r.rating || 0);

      const p = productSnap.exists ? (productSnap.data() as any) : {};
      let ratingSum = Number(p.ratingSum || 0);
      let ratingCount = Number(p.ratingCount || 0);

      if (wasApproved) {
        ratingSum -= rRating;
        ratingCount = Math.max(0, ratingCount - 1);
      }

      const ratingAvg = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : 0;

      // ✅ WRITES AFTER all reads
      tx.delete(reviewRef);
      tx.set(
        productRef,
        {
          ratingSum,
          ratingCount,
          ratingAvg,
          // mirrors your UI fields so PDP sees it immediately
          rating: ratingAvg,
          reviewCount: ratingCount,
        },
        { merge: true }
      );
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[reviews DELETE] error:", e?.message || e);
    // Return 500 for unexpected errors
    return NextResponse.json({ error: "Failed to delete review" }, { status: 500 });
  }
}
