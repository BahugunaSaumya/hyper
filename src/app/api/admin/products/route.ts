// src/app/api/admin/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "../_lib/auth";

export const runtime = "nodejs";

/** GET → return all products (and dynamic headers) */
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    console.log("[/api/admin/products GET] start", { url: req.url });
    const db = getDb();
    const snap = await db.collection("products").get();
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Union of keys across all docs (always include id)
    const headers = Array.from(
      products.reduce((set: Set<string>, p: any) => {
        Object.keys(p).forEach((k) => set.add(k));
        return set;
      }, new Set<string>(["id"]))
    );

    console.log("[/api/admin/products GET] done", { count: products.length, headers: headers.length });
    return NextResponse.json({ products, headers }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/admin/products GET] error:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed to load products" }, { status: 500 });
  }
}

/** POST → upsert a product: { id?: string, ...fields } */
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const payload = await req.json();
    const db = getDb();
    const { id, ...data } = payload || {};

    console.log("[/api/admin/products POST] body", {
      hasId: !!id,
      keys: Object.keys(data || {}),
    });

    if (!data || typeof data !== "object") {
      console.warn("[/api/admin/products POST] invalid body");
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    // Clean empty strings
    for (const k of Object.keys(data)) {
      if (data[k] === "") delete data[k];
    }

    if (id) {
      await db.collection("products").doc(String(id)).set({ ...data, updatedAt: new Date() }, { merge: true });
      console.log("[/api/admin/products POST] updated", { id });
      return NextResponse.json({ ok: true, id }, { status: 200 });
    } else {
      const doc = await db.collection("products").add({ ...data, createdAt: new Date() });
      console.log("[/api/admin/products POST] created", { id: doc.id });
      return NextResponse.json({ ok: true, id: doc.id }, { status: 201 });
    }
  } catch (e: any) {
    console.error("[/api/admin/products POST] error:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed to save product" }, { status: 500 });
  }
}
