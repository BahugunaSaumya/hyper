// src/app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "../_lib/auth";

export const runtime = "nodejs";

// GET /api/admin/orders?limit=200
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(500, Number(searchParams.get("limit") || 200)));

    const db = getDb();
    const snap = await db.collection("orders").orderBy("createdAt", "desc").limit(limit).get();

    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ orders }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/admin/orders GET] error:", e);
    return NextResponse.json({ error: e?.message || "Failed to load orders" }, { status: 500 });
  }
}
