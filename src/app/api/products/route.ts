import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;

/**
 * Normalizes the MySQL row for the frontend list
 */
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

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limitParam = searchParams.get("limit");
  const limit = limitParam === "all" ? 1000 : Math.max(1, Math.min(500, Number(limitParam || 50)));

  const cacheKey = `api:products:list?limit=${limit}`;

  try {
    const products = await cache.remember<any[]>(
      cacheKey,
      TTL_MS,
      SWR_MS,
      async () => {
        const [rows] = await db.query(`
          SELECT 
            p.*,
            /* Aggregating Categories */
            (
              SELECT JSON_ARRAYAGG(c.slug)
              FROM product_categories pc
              JOIN categories c ON c.id = pc.category_id
              WHERE pc.product_id = p.id
            ) AS categories,
            /* Aggregating Sizes using the correct labels */
            (
              SELECT JSON_OBJECTAGG(pv.id, s.label)
              FROM product_variants pv
              JOIN sizes s ON s.id = pv.size_id
              WHERE pv.product_id = p.id
              AND pv.quantity > 0
            ) AS sizes
          FROM products p
          where p.active=1
          ORDER BY p.created_at DESC
          LIMIT ?
        `, [limit]);

        return (rows as any[]).map(normalizeProduct);
      }
    );

    return NextResponse.json({ products }, { 
      status: 200, 
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      "X-Data-Source": "mysql"
       } 
    });

  } catch (error) {
    console.error("Database Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}