import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

// cache settings
const TTL_MS = 60_000;       // 60s
const SWR_MS = 5 * 60_000;   // 5m

function normalizeProduct(p: any) {
  return {
    ...p,
    price: Number(p.price),
    mrp: Number(p.mrp),
    discount_percentage: Number(p.discount_percentage),
    bestseller: Boolean(p.bestseller),
    new_launch: Boolean(p.new_launch),
    categories: p.categories ?? [],
    sizes: p.sizes ?? [],
  };
}

export async function GET(_req: NextRequest) {
  const headers = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };

  const cacheKey = "api:products:new-launch?limit=12";

  try {
    const products = await cache.remember<any[]>(
      cacheKey,
      TTL_MS,
      SWR_MS,
      async () => {
        const [rows] = await db.query(
          `
          SELECT
            p.*,

            /* categories */
            (
              SELECT JSON_ARRAYAGG(c.slug)
              FROM product_categories pc
              JOIN categories c ON c.id = pc.category_id
              WHERE pc.product_id = p.id
            ) AS categories,

            /* sizes */
            (
              SELECT JSON_ARRAYAGG(s.label)
              FROM product_variants pv
              JOIN sizes s ON s.id = pv.size_id
              WHERE pv.product_id = p.id
              AND pv.quantity > 0
            ) AS sizes

          FROM products p
          WHERE p.new_launch = 1
          AND p.active=1
          ORDER BY p.created_at DESC
          LIMIT 12
          `
        );

        return (rows as any[]).map(normalizeProduct);
      }
    );

    if (!products.length) {
      return NextResponse.json(
        { error: "No new launch products available" },
        { status: 404, headers }
      );
    }

    return NextResponse.json({ products }, { status: 200, headers });
  } catch (error) {
    console.error("[/api/products/new-launch] MySQL error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers }
    );
  }
}
