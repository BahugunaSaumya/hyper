// src/app/api/products/[id]/reviews/[uid]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export const runtime = "nodejs";

async function getUser(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return null;
    const tok = await getAuth().verifyIdToken(m[1]);
    return {
      uid: tok.uid || "",
      email: (tok.email || "").toLowerCase(),
      name: tok.name || tok.email || "User",
      isAdmin: !!(tok as any).admin || ((tok.email || "").toLowerCase() === (process.env.EMAIL_ADMIN || "").toLowerCase()),
    };
  } catch {
    return null;
  }
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; uid: string }> }
) {
  try {
    const me = await getUser(req);
    if (!me?.uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, uid } = await ctx.params;
    const productId = decodeURIComponent(id || "").trim();
    const targetUid = decodeURIComponent(uid || "").trim();
    if (!productId || !targetUid) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    // Only owner can delete own review; admin can delete any
    if (!(me.isAdmin || me.uid === targetUid)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    const productRef = db.collection("products").doc(productId);
    const reviewRef = productRef.collection("reviews").doc(targetUid);

    await db.runTransaction(async (tx) => {
      const prodSnap = await tx.get(productRef);
      const revSnap = await tx.get(reviewRef);
      if (!revSnap.exists) return;

      const old = revSnap.data() as any;
      const oldRating = Math.round(Number(old?.rating || 0)) || 0;

      tx.delete(reviewRef);

      const prod = (prodSnap.exists ? prodSnap.data() : {}) as any;
      const agg = prod?.rating || { count: 0, sum: 0, avg: 0 };

      const newCount = Math.max(0, Number(agg.count || 0) - 1);
      const newSum = Math.max(0, Number(agg.sum || 0) - oldRating);
      const newAvg = newCount > 0 ? +(newSum / newCount).toFixed(2) : 0;

      tx.set(
        productRef,
        { rating: { count: newCount, sum: newSum, avg: newAvg } },
        { merge: true }
      );
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[review DELETE]", e?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
