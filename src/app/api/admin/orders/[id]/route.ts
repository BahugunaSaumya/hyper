// src/app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

/** GET /api/orders/:id */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getDb();
    const doc = await db.collection("orders").doc(params.id).get();
    if (!doc.exists) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    return NextResponse.json({ id: doc.id, ...doc.data() }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/orders/:id GET] error:", e?.stack || e?.message || e);
    return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
  }
}
