import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import { requireAdmin } from "../_lib/auth";
import * as cache from "@/lib/cache";
import { RowDataPacket } from "mysql2";

export const runtime = "nodejs";

const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;
const keyFor = (limit: number) => `admin:qry:orders?limit=${limit}`;

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(500, Number(searchParams.get("limit") || 200)));

    const k = keyFor(limit);
    const peek = cache.peek(k);
    let xcache = "MISS";

    const orders = await cache.remember<RowDataPacket[]>(
      k,
      TTL_MS,
      SWR_MS,
      async () => {
        // Querying MySQL: Join orders with shipping addresses for the dashboard view
        const [rows] = await db.query<RowDataPacket[]>(
          `
          SELECT 
            /* Order Basic Info */
            o.id as order_id,
            o.order_number,
            o.email as order_email,
            o.subtotal,
            o.discount,
            o.shipping_charges,
            o.shipping_charges,
            o.tax,
            o.total,
            o.order_status,
            o.payment_status,
            o.created_at,

            /* Coupon Data */
            cp.code as coupon_code,
            cp.title as coupon_title,

            /* Shipping Address Data (The details used for THIS order) */
            oa.first_name,
            oa.last_name,
            oa.mobile as shipping_phone,
            oa.address1,
            oa.address2,
            oa.city,
            oa.state,
            oa.pincode,

            /* Customer Account Data (The registered user details) */
            c.email as registered_email,
            c.firebase_uid,
            c.created_at as customer_since,
            (
              SELECT JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', oi.id,
                  'product_id', oi.product_id,
                  'variant_id', oi.variant_id,
                  'quantity', oi.quantity,
                  'mrp', oi.mrp,
                  'price', oi.price,
                  'subtotal', oi.subtotal,
                  'discount', oi.discount,
                  'tax', oi.tax,
                  'shipping_total', oi.shipping_total,
                  'item_total', oi.total,
                  'title', p.title,
                  'slug', p.slug,
                  'size', s.label
                )
              )
              FROM order_items oi
              LEFT JOIN products p ON oi.product_id = p.id
              LEFT JOIN product_variants pv ON oi.variant_id = pv.id
              LEFT JOIN sizes s ON pv.size_id = s.id
              WHERE oi.order_id = o.id
            ) AS items
          FROM orders o
          LEFT JOIN order_addresses oa ON o.shipping_address_id = oa.id
          LEFT JOIN customers c ON o.customer_id = c.id
          LEFT JOIN coupons cp ON o.coupon_id = cp.id
          ORDER BY o.created_at DESC
          LIMIT ?
          `,
          [limit]
        );
        return rows;
      }
    );

    if (peek.has && (peek.fresh || peek.stale)) xcache = peek.fresh ? "HIT" : "STALE";

    return NextResponse.json(
      { orders },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
          "X-Cache": xcache,
        },
      }
    );
  } catch (e: any) {
    console.error("[/api/admin/orders GET] error:", e);
    return NextResponse.json({ error: e?.message || "Failed to load orders" }, { status: 500 });
  }
}
