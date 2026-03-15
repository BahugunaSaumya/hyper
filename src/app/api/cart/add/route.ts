import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import { getServerUser } from "@/lib/firebaseAdmin";
import { RowDataPacket } from "mysql2";

const GST_DIVISOR = 1.05;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { product_id, variant_id, mrp, price, quantity } = body;

    const connection = await db.getConnection();

    /* -------------------------------------
       1️⃣ Identify User OR Guest
    ------------------------------------- */

    let customerId: number | null = null;
    let sessionId = req.cookies.get("session_id")?.value || null;

    const authHeader = req.headers.get("authorization");

    if (authHeader) {
      try {
        const decoded = await getServerUser();
        const firebaseUid = decoded.uid;

        const [rows] = await connection.query<RowDataPacket[]>(
          "SELECT id FROM customers WHERE firebase_uid = ? LIMIT 1",
          [firebaseUid]
        );

        if (rows.length) {
          customerId = rows[0].id;
        }
      } catch {
        customerId = null;
      }
    }

    /* -------------------------------------
       2️⃣ Guest → create session
    ------------------------------------- */

    if (!customerId && !sessionId) {
      sessionId = crypto.randomUUID();
    }

    /* -------------------------------------
       3️⃣ Get or Create Cart
    ------------------------------------- */

    const [[cart]]: any = await connection.query(
      `SELECT id, subtotal, discount
       FROM carts
       WHERE order_id IS NULL
       AND (
            (customer_id IS NOT NULL AND customer_id = ?)
         OR (session_id IS NOT NULL AND session_id = ?)
       )
       ORDER BY created_at DESC
       LIMIT 1`,
      [customerId, sessionId]
    );

    let cartId = cart?.id;

    if (!cartId) {
      const [res]: any = await connection.query(
        `INSERT INTO carts
        (customer_id, session_id, subtotal, discount, shipping_charges, tax, total)
        VALUES (?, ?, 0, 0, 0, 0, 0)`,
        [customerId, sessionId]
      );

      cartId = res.insertId;
    }

    const currentCartSubtotal = Number(cart?.subtotal || 0);
    const currentCartDiscount = Number(cart?.discount || 0);

    /* -------------------------------------
       4️⃣ Item calculations
    ------------------------------------- */

    const lineTotal = price * quantity;
    const lineSubtotal = lineTotal / GST_DIVISOR;
    const lineTax = lineTotal - lineSubtotal;

    await connection.query(
      `
      INSERT INTO cart_items
      (cart_id, product_id, variant_id, mrp, price, quantity, subtotal, tax, total, discount, shipping_total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)

      ON DUPLICATE KEY UPDATE
        quantity = quantity + VALUES(quantity),
        subtotal = (price * quantity) / ${GST_DIVISOR},
        tax = (price * quantity) - ((price * quantity) / ${GST_DIVISOR}),
        discount = IF(? > 0, ((price * quantity) / ?) * ?, 0),
        total = (price * quantity) - discount
      `,
      [
        cartId,
        product_id,
        variant_id,
        mrp,
        price,
        quantity,
        lineSubtotal,
        lineTax,
        lineTotal,
        currentCartSubtotal,
        currentCartSubtotal,
        currentCartDiscount,
      ]
    );

    /* -------------------------------------
       5️⃣ Auto 5% discount > 2500
    ------------------------------------- */

    const [[totals]]: any = await connection.query(
      `SELECT SUM(total) as total FROM cart_items WHERE cart_id = ?`,
      [cartId]
    );

    const updatedTotal = Number(totals?.total || 0);

    if (updatedTotal > 2500) {
      const autoDiscount = updatedTotal * 0.05;

      await connection.query(
        `
        UPDATE cart_items ci
        JOIN (
          SELECT cart_id, SUM(total) AS cart_total
          FROM cart_items
          WHERE cart_id = ?
        ) t ON ci.cart_id = t.cart_id
        SET
          ci.discount = ci.discount + ((ci.total / t.cart_total) * ?),
          ci.total = (ci.price * ci.quantity)
                    - (ci.discount + ((ci.total / t.cart_total) * ?))
                    + ci.shipping_total
        WHERE ci.cart_id = ?
        `,
        [cartId, autoDiscount, autoDiscount, cartId]
      );
    }

    /* -------------------------------------
       6️⃣ Update Cart totals
    ------------------------------------- */

    await connection.query(
      `
      UPDATE carts
      SET
        subtotal = (SELECT SUM(subtotal) FROM cart_items WHERE cart_id = ?),
        discount = (SELECT SUM(discount) FROM cart_items WHERE cart_id = ?),
        tax = (SELECT SUM(tax) FROM cart_items WHERE cart_id = ?),
        total = (SELECT SUM(total) FROM cart_items WHERE cart_id = ?),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [cartId, cartId, cartId, cartId, cartId]
    );

    const response = NextResponse.json({
      success: true,
      message: "Item added to cart",
    });

    /* -------------------------------------
       7️⃣ Persist session cookie for guest
    ------------------------------------- */

    if (sessionId) {
      response.cookies.set("session_id", sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;

  } catch (error: any) {
    console.error("CART_ADD_ERROR:", error);

    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}