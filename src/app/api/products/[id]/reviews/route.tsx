// src/app/api/products/[id]/reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export const runtime = "nodejs";

// Basic auth helper: returns { uid, email, name } or null
async function getUserFromReq(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return null;
    const tok = await getAuth().verifyIdToken(m[1]);
    return {
      uid: tok.uid || "",
      email: (tok.email || "").toLowerCase(),
      name: tok.name || tok.email || "User",
    };
  } catch {
    return null;
  }
}

function clampRating(n: any) {
  const x = Math.round(Number(n) || 0);
  if (x < 1) return 1;
  if (x > 5) return 5;
  return x;
}

type CreateBody = {
  rating: number;          // 1..5
  title?: string;          // optional
  text?: string;           // optional
  visibility?: "public" | "hidden"; // user cannot set; ignored
};

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> } // Next 15 params are a Promise
) {
  try {
    const { id } = await ctx.params;
    const productId = decodeURIComponent(id || "").trim();
    if (!productId) {
      return NextResponse.json({ error: "Missing product id" }, { status: 400 });
    }

    const me = await getUserFromReq(req);
    const db = getDb();

    const limit = Math.max(1, Math.min(50, Number(new URL(req.url).searchParams.get("limit") || 20)));
    const snap = await db
      .collection("products").doc(productId)
      .collection("reviews")
      .orderBy("createdAt", "desc")
      .limit(limit)
      .get();

    const reviews = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Include aggregates from product doc if present
    const prodDoc = await db.collection("products").doc(productId).get();
    const ratingAgg = (prodDoc.data() as any)?.rating || null;

    // User’s own review (if any), fetched separately by uid to be accurate
    let userReview: any = null;
    if (me?.uid) {
      const mine = await db
        .collection("products").doc(productId)
        .collection("reviews").doc(me.uid)
        .get();
      if (mine.exists) userReview = { id: mine.id, ...mine.data() };
    }

    return NextResponse.json({ ok: true, reviews, userReview, rating: ratingAgg }, { status: 200 });
  } catch (e: any) {
    console.error("[reviews GET]", e?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getUserFromReq(req);
    if (!me?.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await ctx.params;
    const productId = decodeURIComponent(id || "").trim();
    if (!productId) {
      return NextResponse.json({ error: "Missing product id" }, { status: 400 });
    }

    let body: CreateBody;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const rating = clampRating(body.rating);
    const title = String(body.title || "").slice(0, 120);
    const text = String(body.text || "").slice(0, 4000);

    const db = getDb();
    const productRef = db.collection("products").doc(productId);
    const myReviewRef = productRef.collection("reviews").doc(me.uid);

    await db.runTransaction(async (tx) => {
      const prodSnap = await tx.get(productRef);
      const revSnap = await tx.get(myReviewRef);

      const now = new Date();
      const baseReview = {
        uid: me.uid,
        userName: me.name || me.email || "User",
        userEmailLower: me.email || null,
        rating,                   // 1..5
        title: title || null,
        text: text || null,
        visible: true,            // user-visible by default
        updatedAt: now,
      };

      // Current product agg
      const prod = (prodSnap.exists ? prodSnap.data() : {}) as any;
      const agg = prod?.rating || { count: 0, sum: 0, avg: 0 };

      if (!revSnap.exists) {
        // New review
        tx.set(myReviewRef, { ...baseReview, createdAt: now });

        const newCount = Number(agg.count || 0) + 1;
        const newSum = Number(agg.sum || 0) + rating;
        const newAvg = newCount > 0 ? +(newSum / newCount).toFixed(2) : 0;

        tx.set(
          productRef,
          { rating: { count: newCount, sum: newSum, avg: newAvg }, lastReviewAt: now },
          { merge: true }
        );
      } else {
        // Update existing review: adjust sum/avg
        const old = revSnap.data() as any;
        const oldRating = clampRating(old?.rating || rating);

        tx.set(myReviewRef, { ...baseReview, createdAt: old?.createdAt || now }, { merge: true });

        const newSum = Math.max(0, Number(agg.sum || 0) - oldRating + rating);
        const count = Number(agg.count || 1);
        const newAvg = count > 0 ? +(newSum / count).toFixed(2) : 0;

        tx.set(
          productRef,
          { rating: { count, sum: newSum, avg: newAvg }, lastReviewAt: now },
          { merge: true }
        );
      }
    });

    const saved = await myReviewRef.get();
    return NextResponse.json({ ok: true, review: { id: saved.id, ...saved.data() } }, { status: 200 });
  } catch (e: any) {
    console.error("[reviews POST]", e?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
