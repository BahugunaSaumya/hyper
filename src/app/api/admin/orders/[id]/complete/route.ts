export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "../../../_lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { error: "Order ID missing in route" },
        { status: 400 }
      );
    }

    const db = getDb();
    const ref = db.collection("orders").doc(id);
    const snap = await ref.get();

    if (!snap.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = snap.data()!;

    if (order.status !== "shipped") {
      return NextResponse.json(
        { error: "Only shipped orders can be completed" },
        { status: 400 }
      );
    }

    await ref.update({
      status: "complete",
      completedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[complete-order]", e);
    return NextResponse.json(
      { error: "Failed to complete order" },
      { status: 500 }
    );
  }
}
