import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../_lib/auth";
import db from "@/lib/mysql";
import { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "today";

    let dateCondition = "CURDATE()";
    if (range === "week") dateCondition = "DATE_SUB(CURDATE(), INTERVAL 7 DAY)";
    if (range === "month") dateCondition = "DATE_SUB(CURDATE(), INTERVAL 30 DAY)";

    // Fetching directly from the DB for instant data
    const [orderStats, userStats] = await Promise.all([
      db.query<RowDataPacket[]>(
        `SELECT 
          COUNT(id) as ordersCount, 
          IFNULL(SUM(total), 0) as revenue 
         FROM orders 
         WHERE payment_status = 'paid' 
         AND created_at >= ${range === 'today' ? 'CURDATE()' : dateCondition}`
      ),
      db.query<RowDataPacket[]>("SELECT COUNT(id) as usersCount FROM customers")
    ]);

    const stats = orderStats[0][0];
    const customers = userStats[0][0];

    const payload = {
      ordersCount: Number(stats.ordersCount) || 0,
      usersCount: Number(customers.usersCount) || 0,
      revenue: Number(stats.revenue) || 0,
    };

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0", // Ensure browser doesn't cache locally
      },
    });
  } catch (error: any) {
    console.error("Dashboard Fetch Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}