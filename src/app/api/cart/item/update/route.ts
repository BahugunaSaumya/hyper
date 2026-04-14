import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import { RowDataPacket } from "mysql2";

export async function PATCH(req: NextRequest) {
  const { cartItemId, action } = await req.json();
  const sessionId = req.cookies.get("session_id")?.value;
  const customerId = req.headers.get("customer_id");

  if (!cartItemId || !action) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const change = action === "inc" ? 1 : -1;
    const ownerFilter = sessionId ? "c.session_id = ?" : "c.customer_id = ?";
    const ownerValue = sessionId || customerId;

    // 1. UPDATE QUANTITY
    await connection.query(
      `UPDATE cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       SET ci.quantity = GREATEST(ci.quantity + ?, 1)
       WHERE ci.id = ? AND ${ownerFilter}`,
      [change, cartItemId, ownerValue]
    );

    // 2. FETCH CART DETAILS & MANUAL COUPON INFO
    // We need to know if there is a manual coupon attached to the cart
    const [cartRows] = await connection.query<RowDataPacket[]>(
      `SELECT c.id, c.coupon_id, cp.type, cp.amount as couponValue
       FROM carts c
       JOIN cart_items ci ON c.id = ci.cart_id
       LEFT JOIN coupons cp ON c.coupon_id = cp.id
       WHERE ci.id = ?`, [cartItemId]
    );
    
    if (!cartRows.length) throw new Error("Cart not found");
    const { id: cartId, coupon_id: hasCoupon, type: couponType, couponValue } = cartRows[0];

    // 3. CALCULATE GROSS TOTAL (Price * Qty)
    const [totals]: any = await connection.query(
      `SELECT SUM(price * quantity) as grossSum FROM cart_items WHERE cart_id = ?`,
      [cartId]
    );
    const grossSum = Number(totals[0].grossSum || 0);

    // 4. CALCULATE INDIVIDUAL DISCOUNTS
    // A. Manual Coupon Discount
    let manualDiscountTotal = 0;
    if (hasCoupon) {
      manualDiscountTotal = couponType === 'amount' ? Number(couponValue) : (grossSum * (Number(couponValue) / 100));
    }

    // B. Auto 5% Discount (Calculated on gross, applied if > 2500)
    const autoDiscountTotal = grossSum > 2500 ? (grossSum * 0.05) : 0;

    // Combined Total Discount to distribute pro-rata
    const combinedDiscount = manualDiscountTotal + autoDiscountTotal;

    // 5. UPDATE ALL ITEMS (Tax, Subtotal, Pro-rata Discount)
    await connection.query(
      `UPDATE cart_items 
       SET 
         tax = (price * quantity) - ((price * quantity) / 1.05),
         subtotal = (price * quantity) / 1.05,
         /* Distribute the combined discount based on item's share of gross total */
         discount = ((price * quantity) / NULLIF(?, 0)) * ?,
         /* Total = Gross - Combined Discount + Shipping */
         total = (price * quantity) - (((price * quantity) / NULLIF(?, 0)) * ?) + shipping_total
       WHERE cart_id = ?`,
      [grossSum, combinedDiscount, grossSum, combinedDiscount, cartId]
    );

    // 6. SYNC PARENT CART TABLE
    await connection.query(
      `UPDATE carts
       SET 
         subtotal = (SELECT IFNULL(SUM(subtotal), 0) FROM cart_items WHERE cart_id = ?),
         discount = (SELECT IFNULL(SUM(discount), 0) FROM cart_items WHERE cart_id = ?),
         tax = (SELECT IFNULL(SUM(tax), 0) FROM cart_items WHERE cart_id = ?),
         total = (SELECT IFNULL(SUM(total), 0) FROM cart_items WHERE cart_id = ?),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [cartId, cartId, cartId, cartId, cartId]
    );

    await connection.commit();
    return NextResponse.json({ success: true });

  } catch (error) {
    await connection.rollback();
    console.error("PATCH Error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  } finally {
    connection.release();
  }
}