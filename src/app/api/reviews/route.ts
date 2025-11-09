// src/app/api/reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export const runtime = "nodejs";

type ReviewDoc = {
  id?: string;
  productId: string;
  userId: string;
  user?: string;
  rating: number;
  body: string;
  images?: string[];
  createdAt: FirebaseFirestore.Timestamp | Date;
  updatedAt?: FirebaseFirestore.Timestamp | Date;
  status?: "approved" | "pending" | "rejected";
};

function mapDoc(d: FirebaseFirestore.QueryDocumentSnapshot): any {
  const data = d.data() || {};
  const toISO = (v: any) =>
    typeof v?.toDate === "function"
      ? v.toDate().toISOString()
      : v instanceof Date
      ? v.toISOString()
      : null;

  return {
    id: d.id,
    productId: data.productId || "",
    userId: data.userId || "",
    user: data.user || null,
    rating: Number(data.rating || 0),
    body: data.body || "",
    images: Array.isArray(data.images) ? data.images : [],
    createdAt: toISO(data.createdAt),
    updatedAt: toISO(data.updatedAt),
    status: (data.status as any) || "approved",
  };
}

function isIndexError(e: any) {
  return (
    e?.code === 9 ||
    /FAILED_PRECONDITION/i.test(e?.message || "") ||
    /requires an index/i.test(e?.message || "")
  );
}

/**
 * GET /api/reviews?productId=...&limit=50
 * Lists reviews for a product. Uses indexed query; falls back to non-ordered + in-memory sort
 * if the composite index hasn't been created yet.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const productId = (url.searchParams.get("productId") || "").trim();
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 50), 1), 200);

    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }

    const db = getDb();
    const col = db.collection("reviews");

    try {
      // Preferred path: requires composite index (productId ASC, createdAt DESC)
      const snap = await col
        .where("productId", "==", productId)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      const reviews = snap.docs.map(mapDoc).filter((r) => r.status !== "rejected");
      const count = reviews.length;
      const average =
        count > 0 ? Math.round((reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count) * 10) / 10 : 0;

      return NextResponse.json({ reviews, average, count }, { status: 200 });
    } catch (e: any) {
      if (!isIndexError(e)) throw e;

      // Fallback: no orderBy, then sort in memory (temporary until you create the index)
      const snap = await col.where("productId", "==", productId).limit(200).get();
      const raw = snap.docs.map(mapDoc).filter((r) => r.status !== "rejected");

      raw.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

      const reviews = raw.slice(0, limit);
      const count = reviews.length;
      const average =
        count > 0 ? Math.round((reviews.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count) * 10) / 10 : 0;

      return NextResponse.json(
        {
          reviews,
          average,
          count,
          _warning:
            "Composite index missing for (productId ASC, createdAt DESC). Falling back to non-indexed query; create the index to optimize.",
        },
        { status: 200 }
      );
    }
  } catch (e: any) {
    console.error("[reviews GET] fatal:", e?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST /api/reviews
 * Body: { productId, rating (1-5), body, images?: string[] }
 * Upserts a single review per (productId, userId) using deterministic doc id.
 */
export async function POST(req: NextRequest) {
  try {
    const db = getDb();

    const authHeader = req.headers.get("authorization") || "";
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tok = await getAuth().verifyIdToken(m[1]);
    const userId = tok.uid;
    const userDisplay = tok.name || tok.email || "User";

    const body = await req.json().catch(() => ({}));
    const productId = (body.productId || "").trim();
    const rating = Math.max(1, Math.min(5, Number(body.rating || 0)));
    const text = (body.body || "").toString().slice(0, 5000);
    const images: string[] = Array.isArray(body.images) ? body.images.slice(0, 6) : [];

    if (!productId) return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    if (!rating) return NextResponse.json({ error: "Missing rating" }, { status: 400 });
    if (!text) return NextResponse.json({ error: "Missing review body" }, { status: 400 });

    // Deterministic document id ensures one review per user per product.
    const rid = `${productId}__${userId}`;
    const ref = db.collection("reviews").doc(rid);

    await ref.set(
      {
        productId,
        userId,
        user: userDisplay,
        rating,
        body: text,
        images,
        status: "approved", // change to "pending" if you want manual moderation
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    return NextResponse.json({ ok: true, id: rid }, { status: 200 });
  } catch (e: any) {
    console.error("[reviews POST] fatal:", e?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/reviews
 * Admin moderation helper:
 * Body: { id, status: "approved" | "rejected" }
 */
export async function PATCH(req: NextRequest) {
  try {
    const db = getDb();

    const authHeader = req.headers.get("authorization") || "";
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tok = await getAuth().verifyIdToken(m[1]);
    const isAdmin = !!(tok as any).admin || !!(tok as any).isAdmin;
    if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const id = (body.id || "").trim();
    const status = (body.status || "").trim();

    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    if (!["approved", "rejected", "pending"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const ref = db.collection("reviews").doc(id);
    await ref.set({ status, updatedAt: new Date() }, { merge: true });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[reviews PATCH] fatal:", e?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
