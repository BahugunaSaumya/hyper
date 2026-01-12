import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { getServerUser } from "@/lib/serverAuth";
import { Timestamp } from "firebase-admin/firestore";

type OrderItem = {
  id: string;
  qty: number;
  title: string;
  [key: string]: any;
};

type ShipmentItem = {
  itemId: string;
  qty: number;
};

type Shipment = {
  id: string;
  courier: string;
  trackingId: string;
  items: ShipmentItem[];
  shippedAt: Timestamp;
  createdBy: string;
};

export async function POST(req: Request, { params }: any) {
  const user = await getServerUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courier, trackingId, items } = await req.json() as { courier: string; trackingId: string; items: ShipmentItem[] };

  if (!courier || !trackingId || !items?.length) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const db = getDb();
  const ref = db.collection("orders").doc(params.id);
  const snap = await ref.get();

  if (!snap.exists) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const order = snap.data()!;
  const prevShipments: Shipment[] = order.shipments || [];

  // ---- calculate total shipped quantities so far ----
  const shippedQty: Record<string, number> = {};
  prevShipments.forEach((s: Shipment) =>
    s.items.forEach((i: ShipmentItem) => {
      shippedQty[i.itemId] = (shippedQty[i.itemId] || 0) + i.qty;
    })
  );

  // ---- validate new shipment quantities ----
  for (const i of items) {
    const orderItem = (order.items as OrderItem[]).find(x => x.id === i.itemId);
    if (!orderItem) {
      return NextResponse.json({ error: `Invalid item: ${i.itemId}` }, { status: 400 });
    }
    const remaining = orderItem.qty - (shippedQty[i.itemId] || 0);
    if (i.qty > remaining) {
      return NextResponse.json(
        { error: `Qty exceeds remaining for ${orderItem.title}` },
        { status: 400 }
      );
    }
  }

  // ---- create shipment object ----
  const shipment: Shipment = {
    id: `shp_${Date.now()}`,
    courier,
    trackingId,
    items,
    shippedAt: Timestamp.now(),
    createdBy: user.uid
  };

  // ---- update shipped quantities to include new shipment ----
  const finalQty = { ...shippedQty };
  items.forEach((i: ShipmentItem) => {
    finalQty[i.itemId] = (finalQty[i.itemId] || 0) + i.qty;
  });

  // ---- determine new order status ----
  const fullyShipped = (order.items as OrderItem[]).every(i => finalQty[i.id] >= i.qty);
  const status = fullyShipped ? "shipped" : "partially_shipped";

  // ---- update order in Firestore ----
  await ref.update({
    shipments: [...prevShipments, shipment],
    status,
    updatedAt: Timestamp.now()
  });

  return NextResponse.json({ ok: true, status, shipment });
}
