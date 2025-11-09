// src/app/api/admin/orders/purge/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "../../_lib/auth";

export const runtime = "nodejs";

/**
 * Deletes anything that is NOT both:
 *   - status === "paid"
 *   - payment.mode === "live"
 */
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const db = getDb();
    const col = db.collection("orders");
    const qs = await col.get();

    let toDelete = 0;
    const batch = db.batch();

    qs.forEach((doc) => {
      const d: any = doc.data() || {};
      const status = String(d?.status || "").toLowerCase();
      const mode = String(d?.payment?.mode || "").toLowerCase();
      const isPaid = status === "paid";
      const isLive = mode === "live";
      if (!(isPaid && isLive)) {
        batch.delete(doc.ref);
        toDelete++;
      }
    });

    if (toDelete > 0) await batch.commit();
    return NextResponse.json({ deleted: toDelete }, { status: 200 });
  } catch (e: any) {
    console.error("[admin/purge] error:", e);
    return NextResponse.json({ error: e?.message || "Failed to purge" }, { status: 500 });
  }
}
