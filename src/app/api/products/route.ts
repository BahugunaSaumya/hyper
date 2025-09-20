// src/app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";                 // you already use this in admin APIs
import { parseCSV, mapProducts } from "@/lib/csv";           // reuse your existing CSV helpers
import { promises as fs } from "fs";
import path from "path";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(50, Number(searchParams.get("limit") || 12)));

  // Try Firestore first
  try {
    const db = getDb();
    // Your collection may be named differently; "products" is the common one.
    const snap = await db.collection("products").limit(limit).get();
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (products.length) {
      return NextResponse.json({ products }, { status: 200 });
    }
  } catch (e) {
    // Fall through to CSV
    console.warn("[/api/products] Firestore unavailable, falling back to CSV.", e);
  }

  // Fallback: CSV from /public/assets/hyper-products-sample.csv
  try {
    const file = path.join(process.cwd(), "public", "assets", "hyper-products-sample.csv");
    const csv = await fs.readFile(file, "utf8");
    const products = mapProducts(parseCSV(csv)).slice(0, limit);
    return NextResponse.json({ products }, { status: 200 });
  } catch (e) {
    console.error("[/api/products] CSV fallback failed:", e);
    return NextResponse.json({ error: "No products available" }, { status: 404 });
  }
}
