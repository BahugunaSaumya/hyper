// src/app/api/admin/products/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "../../_lib/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    console.log("[/api/admin/products/:id GET] start", { id: params.id });
    const db = getDb();
    const doc = await db.collection("products").doc(params.id).get();
    if (!doc.exists) {
      console.warn("[/api/admin/products/:id GET] not found", { id: params.id });
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    console.log("[/api/admin/products/:id GET] found", { id: doc.id });
    return NextResponse.json({ id: doc.id, ...doc.data() }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/admin/products/:id GET] error:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const patch = await req.json();
    console.log("[/api/admin/products/:id PUT] start", { id: params.id, keys: Object.keys(patch || {}) });
    const db = getDb();
    await db.collection("products").doc(params.id).set({ ...patch, updatedAt: new Date() }, { merge: true });
    console.log("[/api/admin/products/:id PUT] updated", { id: params.id });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/admin/products/:id PUT] error:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    console.log("[/api/admin/products/:id DELETE] start", { id: params.id });
    const db = getDb();
    await db.collection("products").doc(params.id).delete();
    console.log("[/api/admin/products/:id DELETE] deleted", { id: params.id });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/admin/products/:id DELETE] error:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed to delete" }, { status: 500 });
  }
}
