import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;

function keyFor(slug: string) {
  return `api:products:category:${slug}`;
}

/**
 * Normalize product row
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
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json(
      { error: "Missing category slug" },
      { status: 400 }
    );
  }

  const headers = {
    "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
  };

  try {
    const products = await cache.remember<any[]>(
      keyFor(slug),
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
              FROM product_categories pc2
              JOIN categories c ON c.id = pc2.category_id
              WHERE pc2.product_id = p.id
            ) AS categories,

            /* sizes */
            (
              SELECT JSON_OBJECTAGG(pv.id, s.label)
              FROM product_variants pv
              JOIN sizes s ON s.id = pv.size_id
              WHERE pv.product_id = p.id
            ) AS sizes
          FROM products p
          JOIN product_categories pc ON pc.product_id = p.id
          JOIN categories cat ON cat.id = pc.category_id
          WHERE cat.slug = ?
          AND p.active=1
          ORDER BY p.created_at DESC
          `,
          [slug]
        );

        return (rows as any[]).map(normalizeProduct);
      }
    );
    if (!products.length) {
      return NextResponse.json(
        { error: "No products found for this category" },
        { status: 404, headers }
      );
    }

    return NextResponse.json({ products }, { status: 200, headers });
  } catch (error) {
    console.error("[/api/products/by-category] MySQL error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500, headers }
    );
  }
}
