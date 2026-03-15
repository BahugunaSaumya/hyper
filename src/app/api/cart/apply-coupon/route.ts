import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import { RowDataPacket } from "mysql2";
import { getServerUser } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  const { cartId, couponId, discountAmount } = await req.json();

  if (!cartId || !couponId) return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Get Customer and Coupon Code
    const [cartRows] = await connection.query<RowDataPacket[]>(
      `SELECT c.customer_id, cp.code, cp.amount as couponValue, cp.type as couponType 
       FROM carts c 
       LEFT JOIN coupons cp ON cp.id = ? 
       WHERE c.id = ? FOR UPDATE`, [couponId, cartId]
    );
    
    const { customer_id: customerId, code: couponCode, couponValue, couponType } = cartRows[0];

    // 2. Fetch all current items to calculate "Gross" in memory
    const [items] = await connection.query<RowDataPacket[]>(
      `SELECT id, product_id, price, quantity, shipping_total FROM cart_items WHERE cart_id = ?`, 
      [cartId]
    );

    const grossTotal = items.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);

    // 3. Calculate Manual Coupon Discount
    let manualDiscount = 0;
    let targetItemId: number | null = null;

    if (couponCode === "TryNew") {
      // Find one eligible item for TryNew
      for (const item of items) {
        const [used] = await connection.query<RowDataPacket[]>(
          `SELECT oi.id FROM order_items oi JOIN orders o ON oi.order_id = o.id 
           WHERE o.customer_id = ? AND oi.product_id = ? AND o.coupon_id = ? LIMIT 1`,
          [customerId, item.product_id, couponId]
        );
        if (used.length === 0) {
          targetItemId = item.id;
          manualDiscount = Number(couponValue);
          break;
        }
      }
      if (!targetItemId) {
        await connection.rollback();
        return NextResponse.json({ error: "Coupon already used for these products." }, { status: 400 });
      }
    } else {
      // Standard coupon
      manualDiscount = couponType === 'percent' ? (grossTotal * (Number(couponValue) / 100)) : Number(discountAmount);
    }

    // 4. Calculate Auto-Discount based on (Gross - Manual)
    const afterManualGross = grossTotal - manualDiscount;
    const autoDiscount = afterManualGross > 2500 ? (afterManualGross * 0.05) : 0;
    
    const totalCombinedDiscount = manualDiscount + autoDiscount;

    // 5. PERFORM A SINGLE UPDATE TO CART_ITEMS
    // We reset the discount field entirely here to avoid the "cascading" error.
    for (const item of items) {
      const itemGross = Number(item.price) * item.quantity;
      
      // Calculate this item's share of the manual discount
      let itemManualShare = 0;
      if (couponCode === "TryNew") {
        itemManualShare = (item.id === targetItemId) ? manualDiscount : 0;
      } else {
        itemManualShare = (itemGross / grossTotal) * manualDiscount;
      }

      // Calculate this item's share of the 10% auto discount
      // Note: We use the ratio of (itemGross - itemManualShare) / afterManualGross 
      // to ensure the 10% is perfectly proportional to the remaining value.
      const itemRemaining = itemGross - itemManualShare;
      const itemAutoShare = (itemRemaining / afterManualGross) * autoDiscount;

      const finalItemDiscount = itemManualShare + itemAutoShare;
      const finalItemTotal = itemGross - finalItemDiscount + Number(item.shipping_total);

      await connection.query(
        `UPDATE cart_items 
         SET discount = ?, 
             total = ?, 
             tax = ? - (? / 1.05),
             subtotal = (? / 1.05)
         WHERE id = ?`,
        [finalItemDiscount, finalItemTotal, itemGross, itemGross, itemGross, item.id]
      );
    }

    // 6. SYNC PARENT CART
    await connection.query(
      `UPDATE carts SET
         coupon_id = ?,
         discount = (SELECT SUM(discount) FROM cart_items WHERE cart_id = ?),
         total = (SELECT SUM(total) FROM cart_items WHERE cart_id = ?),
         tax = (SELECT SUM(tax) FROM cart_items WHERE cart_id = ?),
         subtotal = (SELECT SUM(subtotal) FROM cart_items WHERE cart_id = ?),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [couponId, cartId, cartId, cartId, cartId, cartId]
    );

    await connection.commit();
    return NextResponse.json({ success: true });

  } catch (err: any) {
    await connection.rollback();
    console.error("COUPON ERROR:", err);
    return NextResponse.json({ error: "Apply failed" }, { status: 500 });
  } finally {
    connection.release();
  }
}