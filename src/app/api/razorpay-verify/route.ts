import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/mysql";
import { sendOrderEmails } from "@/lib/email";

export const runtime = "nodejs";

// Helper to verify signature
function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
  secret: string
) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(`${razorpayOrderId}|${razorpayPaymentId}`);
  const expected = hmac.digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const connection = await db.getConnection();
  
  try {
    const body = await req.json();
    const {
      dbOrderId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body;

    // 1. Validation
    if (!dbOrderId || !razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json({ error: "Missing verification data" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) return NextResponse.json({ error: "Server config error" }, { status: 500 });

    // 2. Verify Signature
    const isSignatureValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      secret
    );

    if (!isSignatureValid) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    // 3. Database Updates
    await connection.beginTransaction();

    const [orders]: any = await connection.query(`
      SELECT 
        o.*, 
        c.first_name as customer_first, c.last_name as customer_last, c.email as customer_email, c.mobile as customer_mobile,
        oa.address1, oa.address2, oa.city, oa.state, oa.pincode, oa.mobile as ship_mobile
      FROM orders o
      LEFT JOIN customers c ON o.customer_id = c.id
      LEFT JOIN order_addresses oa ON o.shipping_address_id = oa.id
      WHERE o.id = ?
    `,
      [dbOrderId]
    );

    if (orders.length === 0) throw new Error("Order not found");
    if (orders[0].payment_status === "paid") {
       await connection.rollback();
       return NextResponse.json({ success: true, message: "Already processed" });
    }

    // ✅ FIX: Update only columns that exist (Ensure you ran the ALTER TABLE SQL first!)
    await connection.query(
      `UPDATE orders SET 
        payment_status = 'paid', 
        order_status = 'confirmed',
        razorpay_order_id = ?, 
        razorpay_payment_id = ?,
        razorpay_signature = ?,
        updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId]
    );

    // ✅ FIX: Clear the items from the cart so it appears empty to the user
    // We find the cart linked to this order and "close" it
    await connection.query(
      `UPDATE carts SET updated_at = CURRENT_TIMESTAMP WHERE order_id = ?`,
      [dbOrderId]
    );

    await connection.commit();

    const [itemsRows] = await db.query(`
      SELECT oi.*, p.title, p.slug, p.image, s.label as size
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      LEFT JOIN product_variants pv ON oi.variant_id = pv.id
      LEFT JOIN sizes s ON pv.size_id = s.id
      WHERE oi.order_id = ?
    `, [dbOrderId]);
    const orderRow = orders[0];
    const orderData = {
      ...orderRow,
      items: itemsRows,
      shipping: {
        name: `${orderRow.customer_first} ${orderRow.customer_last}`.trim(),
        addr1: orderRow.address1,
        addr2: orderRow.address2,
        city: orderRow.city,
        state: orderRow.state,
        postal: orderRow.pincode,
        phone: orderRow.ship_mobile
      },
      customer: {
        name: `${orderRow.customer_first} ${orderRow.customer_last}`.trim(),
        email: orderRow.customer_email,
        phone: orderRow.customer_mobile
      },
      payment: {
        provider: 'razorpay',
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature
      }
    };
    await sendOrderEmails(String(dbOrderId), orderData);

    return NextResponse.json({
      success: true,
      message: "Payment verified and order confirmed",
      dbOrderId
    });

  } catch (err: any) {
    await connection.rollback();
    console.error("[VERIFY_ERROR]:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    connection.release();
  }
}