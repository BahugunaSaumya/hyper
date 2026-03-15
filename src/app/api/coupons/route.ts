import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;

function normalizeCoupon(c: any) {
  return {
    id: c.id,
    code: c.code,
    title: c.title,
    message: c.message,
    type: c.type,
    amount: Number(c.amount),
    valid_from: c.valid_from,
    valid_to: c.valid_to,
    per_customer_limit: c.per_customer_limit,
    show_on_pdp: Boolean(c.show_on_pdp),
  };
}

export async function GET(req: NextRequest) {
  const cacheKey = "api:coupons:active";

  try {
    const coupons = await cache.remember<any[]>(
      cacheKey,
      TTL_MS,
      SWR_MS,
      async () => {
        const [rows] = await db.query(`
          SELECT
            id,
            code,
            title,
            message,
            type,
            amount,
            valid_from,
            valid_to,
            per_customer_limit,
            show_on_pdp
          FROM coupons
          WHERE status = 1
            AND show_on_pdp = 1
            AND (valid_from IS NULL OR valid_from <= NOW())
            AND (valid_to IS NULL OR valid_to >= NOW())
          ORDER BY created_at DESC
        `);

        return (rows as any[]).map(normalizeCoupon);
      }
    );

    return NextResponse.json(
      { coupons },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"
        },
      }
    );
  } catch (err) {
    console.error("Coupon API error:", err);
    return NextResponse.json(
      { error: "Failed to load coupons" },
      { status: 500 }
    );
  }
}
