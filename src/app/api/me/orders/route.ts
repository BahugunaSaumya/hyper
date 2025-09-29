// src/app/api/me/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { getDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// ---- date helpers ----
function toDate(v: any): Date | null {
  try {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    if (typeof v?.toDate === "function") {
      const d = v.toDate();
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof v?.seconds === "number") return new Date(v.seconds * 1000);
    if (typeof v?._seconds === "number") return new Date(v._seconds * 1000);
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}
function tsMs(v: any): number {
  const d = toDate(v);
  return d ? d.getTime() : 0;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const m = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const tok = await getAuth().verifyIdToken(m[1]);
    const uid = tok.uid;
    const emailLower = (tok.email || "").toLowerCase();

    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") || 50)));
    const cursorMs = url.searchParams.get("cursor");
    const cursorDate = cursorMs ? new Date(Number(cursorMs)) : null;

    const db = getDb();
    const col = db.collection("orders");

    const normalize = (snap: FirebaseFirestore.QueryDocumentSnapshot) => {
      const d = snap.data() || {};
      return { id: snap.id, ...d };
    };

    // ----- 1) Indexed path: ownerUid + createdAt desc -----
    try {
      let q: FirebaseFirestore.Query = col.where("ownerUid", "==", uid).orderBy("createdAt", "desc");
      if (cursorDate) q = q.startAfter(cursorDate);
      q = q.limit(limit);
      const snap = await q.get();
      if (!snap.empty) {
        return NextResponse.json({
          orders: snap.docs.map(normalize),
          nextCursor:
            snap.size === limit
              ? String(tsMs(snap.docs[snap.docs.length - 1].get("createdAt")))
              : null,
        });
      }
    } catch (e: any) {
      const msg = String(e?.message || e);
      const code = e?.code || e?.status || "";
      const isIndexErr = /FAILED_PRECONDITION/i.test(msg) || /indexes/i.test(msg) || code === 9;
      if (!isIndexErr) throw e;
    }

    // ----- 2) Indexed path: ownerEmailLower + createdAt desc -----
    try {
      if (emailLower) {
        let q: FirebaseFirestore.Query = col.where("ownerEmailLower", "==", emailLower).orderBy("createdAt", "desc");
        if (cursorDate) q = q.startAfter(cursorDate);
        q = q.limit(limit);
        const snap = await q.get();
        if (!snap.empty) {
          return NextResponse.json({
            orders: snap.docs.map(normalize),
            nextCursor:
              snap.size === limit
                ? String(tsMs(snap.docs[snap.docs.length - 1].get("createdAt")))
                : null,
          });
        }
      }
    } catch (e: any) {
      const msg = String(e?.message || e);
      const code = e?.code || e?.status || "";
      const isIndexErr = /FAILED_PRECONDITION/i.test(msg) || /indexes/i.test(msg) || code === 9;
      if (!isIndexErr) throw e;
    }

    // ----- 3) Indexed path (legacy): userId + createdAt desc -----
    try {
      let q: FirebaseFirestore.Query = col.where("userId", "==", uid).orderBy("createdAt", "desc");
      if (cursorDate) q = q.startAfter(cursorDate);
      q = q.limit(limit);
      const snap = await q.get();
      if (!snap.empty) {
        return NextResponse.json({
          orders: snap.docs.map(normalize),
          nextCursor:
            snap.size === limit
              ? String(tsMs(snap.docs[snap.docs.length - 1].get("createdAt")))
              : null,
        });
      }
    } catch (e: any) {
      const msg = String(e?.message || e);
      const code = e?.code || e?.status || "";
      const isIndexErr = /FAILED_PRECONDITION/i.test(msg) || /indexes/i.test(msg) || code === 9;
      if (!isIndexErr) throw e;
    }

    // ----- 4) FINAL FALLBACK (no composite index):
    //       fetch equality-only buckets, merge, sort in-memory, paginate in-memory
    const buckets: FirebaseFirestore.QuerySnapshot[] = [];
    const eqQueries: Array<{ field: string; value: string }> = [];

    if (uid) {
      eqQueries.push({ field: "ownerUid", value: uid });
      eqQueries.push({ field: "userId", value: uid }); // legacy
    }
    if (emailLower) {
      eqQueries.push({ field: "ownerEmailLower", value: emailLower });
      // some very old docs were only searchable by customer.email
      eqQueries.push({ field: "customer.email", value: emailLower });
    }

    // De-dup fields
    const seenKey = new Set<string>();
    for (const qd of eqQueries) {
      const key = `${qd.field}:${qd.value}`;
      if (seenKey.has(key)) continue;
      seenKey.add(key);
      const s = await col.where(qd.field as any, "==", qd.value).limit(500).get();
      if (!s.empty) buckets.push(s);
    }

    const all = buckets.flatMap((s) => s.docs.map(normalize));
    // de-dupe by id
    const uniqMap = new Map<string, any>();
    for (const o of all) uniqMap.set(o.id, o);
    const uniq = Array.from(uniqMap.values());

    // sort + in-memory cursor window
    uniq.sort((a: any, b: any) => tsMs(b.createdAt) - tsMs(a.createdAt));
    const startIdx = cursorDate ? uniq.findIndex((d: any) => tsMs(d.createdAt) < cursorDate.getTime()) : 0;
    const base = startIdx < 0 ? 0 : startIdx;
    const slice = uniq.slice(base, base + limit);
    const next = base + limit < uniq.length ? String(tsMs(uniq[base + limit - 1]?.createdAt)) : null;

    return NextResponse.json({ orders: slice, nextCursor: next });
  } catch (err: any) {
    console.error("[/api/me/orders] error:", err?.message || err);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
