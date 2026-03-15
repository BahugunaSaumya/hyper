import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import db from "@/lib/mysql";
import { getServerUser } from "@/lib/firebaseAdmin";
import bcrypt from "bcryptjs";
import { ResultSetHeader } from "mysql2";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const connection = await db.getConnection();

  try {
    const body = await req.json();
    const { shippingAddress, customer, cartId, session_id } = body;

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1] || null;

    let customerId: number | null = null;
    let email: string = customer?.email || "";
    let sessionId: string | null = session_id || null;

    await connection.beginTransaction();

    // 1️⃣ Identify or Create Customer
    try {
      if (token && token !== "undefined") {
        const decoded = await getServerUser();
        email = decoded.email ?? email;

        const [custRows]: any = await connection.query(
          "SELECT id FROM customers WHERE firebase_uid = ? LIMIT 1",
          [decoded.uid]
        );
        customerId = custRows[0]?.id || null;
      }

      // If not logged in, search by email to see if they've shopped before
      if (!customerId && email) {
        const [existing]: any = await connection.query(
          "SELECT id FROM customers WHERE email = ? LIMIT 1",
          [email]
        );
        
        if (existing.length > 0) {
          customerId = existing[0].id;
        } else {
          // New Guest: Provide all required fields including password placeholder
          const hashedPassword = await bcrypt.hash(shippingAddress.first_name, 10);
          const [newCust]: any = await connection.query(
            `INSERT INTO customers (first_name, last_name, email, mobile, password) 
             VALUES (?, ?, ?, ?, ?)`,
            [shippingAddress.first_name, shippingAddress.last_name, email, customer?.phone || shippingAddress.mobile, hashedPassword]
          );
          customerId = (newCust as ResultSetHeader).insertId;
        }
      }
    } catch (e: any) {
      throw new Error("Failed to initialize customer record: " + e.message);
    }

    if (!cartId) throw new Error("Active shopping cart not found.");

    // 2️⃣ Save Address into cart_addresses (Temporary/Current Cart)
    let cartAddressId: number;
    try {
      const [cartAddrInsert]: any = await connection.query(
        `INSERT INTO cart_addresses (first_name, last_name, mobile, email, address1, address2, pincode, city, state) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          shippingAddress.first_name, shippingAddress.last_name, shippingAddress.mobile, email,
          shippingAddress.address1, shippingAddress.address2, shippingAddress.pincode, shippingAddress.city, shippingAddress.state,
        ]
      );
      cartAddressId = cartAddrInsert.insertId;
    } catch (e: any) {
      throw new Error("Error saving cart address: " + e.message);
    }

    // 3️⃣ Save Address into order_addresses (REQUIRED for Orders table FK)
    let orderAddressId: number;
    try {
      const [orderAddrInsert]: any = await connection.query(
        `INSERT INTO order_addresses (first_name, last_name, mobile, email, address1, address2, pincode, city, state) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          shippingAddress.first_name, shippingAddress.last_name, shippingAddress.mobile, email,
          shippingAddress.address1, shippingAddress.address2, shippingAddress.pincode, shippingAddress.city, shippingAddress.state,
        ]
      );
      orderAddressId = orderAddrInsert.insertId;
    } catch (e: any) {
      throw new Error("Error creating permanent order address: " + e.message);
    }

    // 4️⃣ Fetch Cart and Lock
    const [cartRows]: any = await connection.query(
      `SELECT * FROM carts WHERE id = ? AND order_id IS NULL LIMIT 1 FOR UPDATE`,
      [cartId]
    );
    if (!cartRows.length) throw new Error("Cart is no longer available.");
    const cart = cartRows[0];

    // Update cart to reflect the current checkout attempt
    await connection.query(
      `UPDATE carts SET customer_id = ?, email = ?, shipping_address_id = ?, billing_address_id = ? WHERE id = ?`,
      [customerId, email, cartAddressId, cartAddressId, cartId]
    );

    // 5️⃣ Generate Order
    const orderNumber = await generateOrderNumber(connection);
    let orderId: number;
    try {
      const [orderInsert]: any = await connection.query(
        `INSERT INTO orders SET ?`,
        {
          email,
          customer_id: customerId,
          billing_address_id: orderAddressId, // Use the ID from order_addresses
          shipping_address_id: orderAddressId, // Use the ID from order_addresses
          session_id: sessionId,
          subtotal: cart.subtotal,
          discount: cart.discount,
          shipping_charges: cart.shipping_charges,
          tax: cart.tax,
          total: cart.total,
          coupon_id: cart.coupon_id || null,
          order_number: orderNumber,
          payment_status: "pending",
          order_status: "created",
        }
      );
      orderId = orderInsert.insertId;

      // Copy Items
      const [cartItems]: any = await connection.query("SELECT * FROM cart_items WHERE cart_id = ?", [cart.id]);
      for (const item of cartItems) {
        await connection.query(`INSERT INTO order_items SET ?`, {
          order_id: orderId,
          product_id: item.product_id,
          variant_id: item.variant_id,
          mrp: item.mrp,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal,
          discount: item.discount,
          tax: item.tax,
          shipping_total: item.shipping_total,
          total: item.total,
        });
      }
    } catch (e: any) {
      throw new Error("Failed to generate order records: " + e.message);
    }

    // 6️⃣ Finish Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const rzpOrder = await razorpay.orders.create({
      amount: Math.round(Number(cart.total) * 100),
      currency: "INR",
      receipt: orderNumber,
      notes: { dbOrderId: String(orderId) },
    });

    await connection.query("UPDATE orders SET razorpay_order_id = ? WHERE id = ?", [rzpOrder.id, orderId]);
    await connection.query("UPDATE carts SET order_id = ? WHERE id = ?", [orderId, cart.id]);
    
    await connection.commit();

    return NextResponse.json({
      ...rzpOrder,
      dbOrderId: orderId,
      order_number: orderNumber,
    });

  } catch (err: any) {
    await connection.rollback();
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    connection.release();
  }
}

async function generateOrderNumber(connection: any): Promise<string> {
  while (true) {
    const random = Math.floor(100000000 + Math.random() * 900000000);
    const orderNumber = `OR-${random}`;
    const [rows]: any = await connection.query("SELECT id FROM orders WHERE order_number = ? LIMIT 1", [orderNumber]);
    if (rows.length === 0) return orderNumber;
  }
}