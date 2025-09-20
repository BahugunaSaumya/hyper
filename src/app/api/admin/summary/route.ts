// src/app/api/admin/summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/auth";
import { getDb } from "@/lib/firebaseAdmin";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const db = getDb();

    // These are example counts; adjust to your collections/fields
    const ordersSnap = await db.collection("orders").get();
    const usersSnap  = await db.collection("users").get();

    let revenue = 0;
    ordersSnap.forEach((doc) => {
      const total = (doc.data() as any)?.amounts?.total;
      if (typeof total === "number") revenue += total;
    });

    return NextResponse.json({
      ordersCount: ordersSnap.size,
      usersCount: usersSnap.size,
      revenue,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ordersCount: 0, usersCount: 0, revenue: 0, error: e?.message || "Summary failed" },
      { status: 200 }
    );
  }
}
