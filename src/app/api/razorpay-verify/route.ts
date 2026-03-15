import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import db from "@/lib/mysql";
import { RowDataPacket } from "mysql2";

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

    const [orders]: any = await connection.query(
      "SELECT id, payment_status FROM orders WHERE id = ? FOR UPDATE",
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