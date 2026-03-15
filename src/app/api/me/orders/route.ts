import { NextRequest, NextResponse } from "next/server";
import { getServerUser } from "@/lib/firebaseAdmin";
import db from "@/lib/mysql";
import { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    // 1. Authenticate via Firebase Admin
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];

    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const decodedToken = await getServerUser();
    const firebaseUid = decodedToken.uid;
    const email = decodedToken.email;

    // 2. Pagination Params
    const url = new URL(req.url);
    const limit = Math.max(1, Math.min(100, Number(url.searchParams.get("limit") || 20)));
    const offset = Number(url.searchParams.get("offset") || 0);

    // 3. Resolve MySQL customer_id from Firebase UID or Email
    // This bridges the gap between Firebase Auth and your MySQL tables
    const [customer]: any = await db.query<RowDataPacket[]>(
      "SELECT id FROM customers WHERE firebase_uid = ? OR email = ? LIMIT 1",
      [firebaseUid, email]
    );

    if (!customer.length) {
      return NextResponse.json({ orders: [], message: "Customer profile not found" });
    }

    const customerId = customer[0].id;

    // 4. Fetch Orders with basic stats
    // We fetch from the 'orders' table specifically for this customer_id
    const [orders]: any = await db.query<RowDataPacket[]>(
      `SELECT 
        id, 
        order_number, 
        total, 
        discount, 
        order_status, 
        payment_status, 
        created_at 
       FROM orders 
       WHERE customer_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [customerId, limit, offset]
    );

    // 5. Check if there are more results for pagination
    const nextOffset = orders.length === limit ? offset + limit : null;

    return NextResponse.json({
      orders,
      nextCursor: nextOffset, // Next.js dashboard uses this to trigger load more
    });

  } catch (error: any) {
    console.error("MYSQL_ORDERS_ERROR:", error.message);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}