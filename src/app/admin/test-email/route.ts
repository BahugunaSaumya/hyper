import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { sendOrderEmails } from "@/lib/email";
// import { requireAdmin } from "../_lib/auth"; // enable if you want to gate it

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // const unauthorized = await requireAdmin(req);
    // if (unauthorized) return unauthorized;

    const { searchParams } = new URL(req.url);
    const id = String(searchParams.get("orderId") || "").trim();
    if (!id) return NextResponse.json({ error: "pass ?orderId=" }, { status: 400 });

    const db = getDb();
    const snap = await db.collection("orders").doc(id).get();
    if (!snap.exists) return NextResponse.json({ error: "order not found" }, { status: 404 });

    const order = { id: snap.id, ...(snap.data() || {}) };
    const r = await sendOrderEmails(id, order);
    return NextResponse.json({ ok: true, results: r });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "failed" }, { status: 500 });
  }
}
