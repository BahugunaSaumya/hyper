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
    const body = await req.json();

    const { courier, trackingId, items } = body;

    if (!courier || !trackingId || !items?.length) {
      return NextResponse.json(
        { error: "Courier, Tracking ID & items required" },
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
    const orderItems = order.items || [];
    const previousShipments = Array.isArray(order.shipments) ? order.shipments : [];

    /* ---------- CALCULATE SHIPPED QTY ---------- */
    const shippedQty: Record<string, number> = {};

    // already shipped
    for (const s of previousShipments) {
      for (const i of s.items || []) {
        shippedQty[i.itemId] = (shippedQty[i.itemId] || 0) + i.qty;
      }
    }

    // newly shipped
    for (const i of items) {
      shippedQty[i.itemId] = (shippedQty[i.itemId] || 0) + i.qty;
    }

    /* ---------- CHECK IF FULLY SHIPPED ---------- */
    const fullyShipped = orderItems.every(
      (i: any) => (shippedQty[i.id] || 0) >= i.qty
    );

    const newStatus = fullyShipped ? "shipped" : "partially_shipped";

    /* ---------- UPDATE ---------- */
    await ref.update({
      status: newStatus,
      updatedAt: new Date(),
      shipments: [
        ...previousShipments,
        {
          status: "shipped",
          courier,
          trackingId,
          items,
          shippedAt: new Date(),
        }
      ],
    });

    return NextResponse.json({ ok: true, status: newStatus });
  } catch (e) {
    console.error("[shipment]", e);
    return NextResponse.json(
      { error: "Failed to update shipment" },
      { status: 500 }
    );
  }
}

