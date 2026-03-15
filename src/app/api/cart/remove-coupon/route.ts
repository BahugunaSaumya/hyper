import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import { RowDataPacket } from "mysql2";
import { getServerUser } from "@/lib/firebaseAdmin";

export async function DELETE(req: NextRequest) {
  const { cartId, couponId } = await req.json();

  if (!cartId || !couponId) {
    return NextResponse.json({ error: "Invalid request data" }, { status: 400 });
  }

  try {
    await getServerUser();
  } catch {
    return NextResponse.json({ error: "Please login to manage coupons." }, { status: 401 });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    /* 1. Verify Cart and Coupon Match */
    const [cartRows] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM carts WHERE id = ? AND coupon_id = ?`,
      [cartId, couponId]
    );

    if (!cartRows.length) {
      await connection.rollback();
      return NextResponse.json({ error: "Coupon not found on this cart" }, { status: 404 });
    }

    /* 2. RESET ALL DISCOUNTS 
       Set everything to 0 before checking the 2500 threshold */
    await connection.query(
      `UPDATE cart_items SET discount = 0, total = (price * quantity) + shipping_total WHERE cart_id = ?`,
      [cartId]
    );

    /* 3. CALCULATE GROSS TOTAL 
       We check the sum of (price * quantity) to determine auto-discount eligibility */
    const [grossRows]: any = await connection.query(
      `SELECT SUM(price * quantity) as grossTotal FROM cart_items WHERE cart_id = ?`,
      [cartId]
    );
    const grossTotal = Number(grossRows[0].grossTotal || 0);

    /* 4. CHECK 2500 THRESHOLD FOR AUTO-DISCOUNT */
    let finalAutoDiscount = 0;
    if (grossTotal > 2500) {
      finalAutoDiscount = grossTotal * 0.05;
    }

    /* 5. APPLY AUTO-DISCOUNT TO ITEMS (PRO-RATA)
       If threshold is met, distribute the 10% across items. If not, this sets items to 0 discount. */
    await connection.query(
      `UPDATE cart_items 
       SET 
         discount = ((price * quantity) / NULLIF(?, 0)) * ?,
         total = (price * quantity) - (((price * quantity) / NULLIF(?, 0)) * ?) + shipping_total
       WHERE cart_id = ?`,
      [grossTotal, finalAutoDiscount, grossTotal, finalAutoDiscount, cartId]
    );

    /* 6. SYNC PARENT CART 
       Note: coupon_id is set to NULL because the manual coupon was removed, 
       even if the auto-discount (10%) is active. */
    await connection.query(
      `UPDATE carts
       SET
         coupon_id = NULL,
         discount = (SELECT IFNULL(SUM(discount), 0) FROM cart_items WHERE cart_id = ?),
         total = (SELECT IFNULL(SUM(total), 0) FROM cart_items WHERE cart_id = ?),
         updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [cartId, cartId, cartId]
    );

    await connection.commit();
    return NextResponse.json({ success: true, autoDiscountApplied: finalAutoDiscount > 0 });

  } catch (err) {
    await connection.rollback();
    console.error("REMOVE COUPON ERROR:", err);
    return NextResponse.json({ error: "Coupon removal failed" }, { status: 500 });
  } finally {
    connection.release();
  }
}