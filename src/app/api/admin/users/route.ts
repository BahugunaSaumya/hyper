import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import { requireAdmin } from "../_lib/auth";
import * as cache from "@/lib/cache";
import { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;
const keyFor = (limit: number, q: string, per: number) =>
  `admin:qry:users:mysql?limit=${limit}&q=${encodeURIComponent(q)}&per=${per}`;

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(500, Number(searchParams.get("limit") || 100)));
  const q = (searchParams.get("q") || "").trim();
  const perUserOrders = Math.max(0, Math.min(5, Number(searchParams.get("perUserOrders") || 0)));

  const k = keyFor(limit, q, perUserOrders);
  const peek = cache.peek(k);
  let xcache = "MISS";

  try {
    const payload = await cache.remember<{ users: Array<any> }>(
      k,
      TTL_MS,
      SWR_MS,
      async () => {
        const connection = await db.getConnection();
        try {
          // 1️⃣ Build the Customer Query
          let query = `SELECT id, first_name, last_name, email, mobile, firebase_uid, created_at 
                       FROM customers`;
          const params: any[] = [];

          if (q) {
            query += ` WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR mobile LIKE ?`;
            const searchVal = `%${q}%`;
            params.push(searchVal, searchVal, searchVal, searchVal);
          }

          query += ` ORDER BY created_at DESC LIMIT ?`;
          params.push(limit);

          const [users] = await connection.query<RowDataPacket[]>(query, params);

          // 2️⃣ Fetch Recent Orders if requested
          if (perUserOrders > 0 && users.length > 0) {
            for (const user of users) {
              // Fetch latest orders for this specific customer
              const [orders] = await connection.query<RowDataPacket[]>(
                `SELECT id, order_number, total, order_status, payment_status, created_at 
                 FROM orders 
                 WHERE customer_id = ? OR email = ?
                 ORDER BY created_at DESC 
                 LIMIT ?`,
                [user.id, user.email, perUserOrders]
              );
              user.orders = orders;
            }
          }

          return { users };
        } finally {
          connection.release();
        }
      }
    );

    if (peek.has && (peek.fresh || peek.stale)) xcache = peek.fresh ? "HIT" : "STALE";

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
        "X-Cache": xcache,
      },
    });
  } catch (e: any) {
    console.error("[/api/admin/users GET] error:", e);
    return NextResponse.json({ error: e?.message || "Failed to load users" }, { status: 500 });
  }
}