import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import { getServerUser } from "@/lib/firebaseAdmin";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const connection = await db.getConnection();
  try {
    // 1. Auth Check
    const user = await getServerUser();
    // Assuming your logic for isAdmin check exists here
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { courier, trackingId, items } = await req.json();
    const orderId = params.id;

    await connection.beginTransaction();

    // 2. Fetch Order Items & Previous Shipped Totals
    // Note: If you don't have a 'shipments' table yet, we calculate from order_items 
    // or a new 'order_shipments' table.
    const [orderItems] = await connection.query<RowDataPacket[]>(
      `SELECT id, product_id, quantity, (quantity_shipped) as shipped_so_far, total 
       FROM order_items WHERE order_id = ? FOR UPDATE`,
      [orderId]
    );

    if (orderItems.length === 0) {
      throw new Error("Order items not found");
    }

    // 3. Validate Quantities
    for (const shipItem of items) {
      const dbItem = orderItems.find(oi => oi.id === shipItem.itemId);
      
      if (!dbItem) {
        throw new Error(`Item ${shipItem.itemId} not found in this order`);
      }

      const remaining = dbItem.quantity - dbItem.shipped_so_far;
      if (shipItem.qty > remaining) {
        throw new Error(`Quantity ${shipItem.qty} exceeds remaining ${remaining} for item ${dbItem.id}`);
      }

      // 4. Update the quantity_shipped in order_items table
      await connection.query(
        "UPDATE order_items SET quantity_shipped = quantity_shipped + ? WHERE id = ?",
        [shipItem.qty, shipItem.itemId]
      );
    }

    // 5. Determine New Order Status
    // Check if all items in this order are now fully shipped
    const [updatedItems] = await connection.query<RowDataPacket[]>(
      "SELECT quantity, quantity_shipped FROM order_items WHERE order_id = ?",
      [orderId]
    );

    const fullyShipped = updatedItems.every(i => i.quantity_shipped >= i.quantity);
    const newStatus = fullyShipped ? "shipped" : "partially_shipped";

    // 6. Update Order Status
    await connection.query(
      "UPDATE orders SET order_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [newStatus, orderId]
    );

    // 7. (Optional) Log Shipment Details in a separate table
    // If you have a shipments table:
    /*
    await connection.query("INSERT INTO order_shipments SET ?", {
      order_id: orderId,
      courier,
      tracking_id: trackingId,
      items_json: JSON.stringify(items),
      created_by: user.uid
    });
    */

    await connection.commit();
    return NextResponse.json({ success: true, status: newStatus });

  } catch (err: any) {
    await connection.rollback();
    console.error("SHIPMENT_ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const orderId = params.id;
    const [order] = await db.query<RowDataPacket[]>(
      `SELECT * FROM orders WHERE id = ?`, [orderId]
    );

    if (!order.length) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order[0]);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}