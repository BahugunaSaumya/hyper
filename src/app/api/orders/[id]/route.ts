import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> } // 1. Define params as a Promise
) {
  const connection = await db.getConnection();
  console.log('in here');
  
  try {
    // 2. Await the params to unwrap them (Next.js 15 requirement)
    const { id } = await context.params; 
    const orderNumber = id; 

    if (!orderNumber) {
      return NextResponse.json({ error: "Order number is required" }, { status: 400 });
    }

    // 3. Fetch Order and Address Details
    // We pass [orderNumber] to the array to safely bind the string to the '?'
    const [orderRows] = await connection.query<RowDataPacket[]>(
      `SELECT o.*, 
              a.first_name, a.last_name, a.mobile, a.address1, a.address2, a.city, a.state, a.pincode
       FROM orders o
       LEFT JOIN order_addresses a ON o.shipping_address_id = a.id
       WHERE o.id = ? OR o.order_number = ? 
       LIMIT 1`,
      [orderNumber, orderNumber]
    );

    if (orderRows.length === 0) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const o = orderRows[0];

    // 4. Fetch Order Items and JOIN with products to get names/slugs
    const [itemRows] = await connection.query<RowDataPacket[]>(
      `SELECT oi.*, p.title as product_name, p.slug as product_slug 
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [o.id]
    );

    // 5. Build response payload
    const payload = {
      id: o.id,
      orderNumber: o.order_number,
      placedAt: o.created_at,
      email: o.email,
      paymentStatus: o.payment_status,
      orderStatus: o.order_status,
      status: o.payment_status === 'paid' ? 'Confirmed' : 'Awaiting Approval',
      shippingAddress: {
        first_name: o.first_name,
        last_name: o.last_name,
        mobile: o.mobile,
        address1: o.address1,
        address2: o.address2,
        city: o.city,
        state: o.state,
        pincode: o.pincode,
      },
      items: itemRows.map(item => ({
        id: item.id,
        productId: item.product_id,
        name: item.product_name || "Product",
        slug: item.product_slug,
        price: Number(item.price),
        quantity: item.quantity,
        total: Number(item.total),
        discount: Number(item.discount),
        tax: Number(item.tax)
      })),
      amounts: {
        subtotal: Number(o.subtotal),
        shipping: Number(o.shipping_charges),
        tax: Number(o.tax),
        discount: Number(o.discount),
        total: Number(o.total),
        currency: "INR",
      }
    };

    return NextResponse.json({ ok: true, order: payload }, { status: 200 });

  } catch (err: any) {
    console.error("[GET_ORDER_ERROR]:", err.message);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    connection.release();
  }
}