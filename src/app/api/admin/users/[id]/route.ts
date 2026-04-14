import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import { requireAdmin } from "../../_lib/auth";
import { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin(_req);
  if (unauthorized) return unauthorized;

  const connection = await db.getConnection();

  try {
    const idOrEmail = decodeURIComponent((await params).id || "").trim();
    if (!idOrEmail) {
      return NextResponse.json({ error: "Missing user identification" }, { status: 400 });
    }

    // 1️⃣ Load User & Saved Address
    // We search by ID or Email as per your requirements
    const [userRows] = await connection.query<RowDataPacket[]>(
      `SELECT c.id, c.first_name, c.last_name, c.email, c.mobile, c.firebase_uid, c.created_at,
              ca.address1, ca.address2, ca.city, ca.state, ca.pincode, ca.mobile as address_mobile
       FROM customers c
       LEFT JOIN customer_addresses ca ON c.id = ca.customer_id
       WHERE c.id = ? OR c.email = ?
       LIMIT 1`,
      [idOrEmail, idOrEmail]
    );

    if (userRows.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userRows[0];

    // Format user object
    const user = {
      id: userData.id,
      name: `${userData.first_name || ""} ${userData.last_name || ""}`.trim() || "N/A",
      email: userData.email,
      mobile: userData.mobile,
      firebase_uid: userData.firebase_uid,
      joinedAt: userData.created_at,
      address: userData.address1 ? {
        address1: userData.address1,
        address2: userData.address2,
        city: userData.city,
        state: userData.state,
        pincode: userData.pincode,
        mobile: userData.address_mobile
      } : null
    };

    // 2️⃣ Load All Orders for this User
    // We check both customer_id and email to capture guest orders placed with same email
    const [orderRows] = await connection.query<RowDataPacket[]>(
      `SELECT id, order_number, total, order_status, payment_status, created_at
       FROM orders
       WHERE customer_id = ? OR email = ?
       ORDER BY created_at DESC`,
      [user.id, user.email]
    );

    // Format orders
    const orders = orderRows.map(o => ({
      id: o.id,
      orderNumber: o.order_number,
      total: Number(o.total),
      status: o.order_status,
      paymentStatus: o.payment_status,
      createdAt: o.created_at
    }));

    return NextResponse.json({ user, orders }, { status: 200 });

  } catch (e: any) {
    console.error("[/api/admin/users/[id] GET] error:", e);
    return NextResponse.json({ error: "Failed to load user details" }, { status: 500 });
  } finally {
    connection.release();
  }
}