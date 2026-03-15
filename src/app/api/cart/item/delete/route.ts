import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import { RowDataPacket } from "mysql2";

export async function DELETE(req: NextRequest) {
  const { cartItemId } = await req.json();
  const sessionId = req.cookies.get("session_id")?.value;
  const customerId = req.headers.get("customer_id");

  if (!cartItemId) {
    return NextResponse.json({ error: "Cart Item ID required" }, { status: 400 });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verify ownership and get Cart ID
    const [itemRows] = await connection.query<RowDataPacket[]>(
      `SELECT ci.cart_id 
       FROM cart_items ci
       JOIN carts c ON c.id = ci.cart_id
       WHERE ci.id = ? AND (${sessionId ? "c.session_id = ?" : "c.customer_id = ?"})`,
      sessionId ? [cartItemId, sessionId] : [cartItemId, customerId]
    );

    if (!itemRows || itemRows.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const cartId = itemRows[0].cart_id;

    // 2. Delete the specific item
    await connection.query(`DELETE FROM cart_items WHERE id = ?`, [cartItemId]);

    // 3. Check remaining items and calculate the new Gross Sum (Price * Qty)
    const [remaining]: any = await connection.query(
      `SELECT COUNT(*) as count, SUM(price * quantity) as newGrossSum 
       FROM cart_items WHERE cart_id = ?`,
      [cartId]
    );

    const itemCount = remaining[0].count || 0;
    const newGrossSum = Number(remaining[0].newGrossSum || 0);

    if (itemCount === 0) {
      // 4a. Cart is empty -> Delete parent cart
      await connection.query(`DELETE FROM carts WHERE id = ?`, [cartId]);
      await connection.commit();
      return NextResponse.json({ success: true, cartDeleted: true });
    }

    // 4b. DETERMINE AUTO-DISCOUNT (5% if remaining total > 2500)
    const autoDiscountTotal = newGrossSum > 2500 ? newGrossSum * 0.05 : 0;

    // 5. UPDATE REMAINING ITEMS (Recalculate Tax, Subtotal, and Pro-rata Discount)
    await connection.query(
      `UPDATE cart_items 
       SET 
         tax = (price * quantity) - ((price * quantity) / 1.05),
         subtotal = (price * quantity) / 1.05,
         /* Recalculate 10% discount share or set to 0 */
         discount = ((price * quantity) / NULLIF(?, 0)) * ?,
         /* Total = Gross - Discount + Shipping */
         total = (price * quantity) - (((price * quantity) / NULLIF(?, 0)) * ?) + shipping_total
       WHERE cart_id = ?`,
      [newGrossSum, autoDiscountTotal, newGrossSum, autoDiscountTotal, cartId]
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
    return NextResponse.json({ 
      success: true, 
      cartDeleted: false, 
      autoDiscountActive: autoDiscountTotal > 0 
    });

  } catch (error) {
    await connection.rollback();
    console.error("DELETE Error:", error);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  } finally {
    connection.release();
  }
}