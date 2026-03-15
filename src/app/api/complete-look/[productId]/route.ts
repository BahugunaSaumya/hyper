import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  const { productId } = await context.params;

  const id = Number(productId);
  if (!id || Number.isNaN(id)) {
    return NextResponse.json(
      { error: "Invalid product id" },
      { status: 400 }
    );
  }

  const cacheKey = `complete-look:${id}`;

  try {
    const looks = await cache.remember<any[]>(
      cacheKey,
      TTL_MS,
      SWR_MS,
      async () => {
        const [rows] = await db.query(
          `
          SELECT
            cl.id AS look_id,
            cl.title AS look_title,

            p.id AS product_id,
            p.slug,
            p.title,
            p.price,
            p.mrp,
            p.discount_percentage,
            p.bestseller,
            p.new_launch,
            p.color,
            cli.position,
            (
              SELECT JSON_OBJECTAGG(pv.id, s.label)
              FROM product_variants pv
              JOIN sizes s ON s.id = pv.size_id
              WHERE pv.product_id = p.id
            ) AS sizes
          FROM product_complete_looks cl
          JOIN product_complete_look_items cli
            ON cli.complete_look_id = cl.id
          JOIN products p
            ON p.id = cli.product_id
          WHERE cl.product_id = ?
            AND cl.is_active = 1
          ORDER BY cli.position ASC
          `,
          [id]
        );

        return rows as any[];
      }
    );

    if (!looks.length) {
      return NextResponse.json({ looks: [] });
    }

    return NextResponse.json({
      lookId: looks[0].look_id,
      title: looks[0].look_title,
      products: looks.map(product => ({
        id: product.product_id,
        slug: product.slug,
        title: product.title,
        price: Number(product.price),
        mrp: Number(product.mrp),
        discountedPrice: product.discounted_price
          ? Number(product.discounted_price)
          : null,
        discountPercentage: product.discount_percentage
          ? Number(product.discount_percentage)
          : null,
        bestseller: Boolean(product.bestseller),
        new_launch: Boolean(product.new_launch),
        position: product.position,
        color: product.color,
        sizes: product.sizes ?? []
      })),
    });

  } catch (err) {
    console.error("[complete-look]", err);
    return NextResponse.json(
      { error: "Failed to fetch complete look" },
      { status: 500 }
    );
  }
}
