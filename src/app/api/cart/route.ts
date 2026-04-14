import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import { getServerUser } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get("session_id")?.value;
  const customerId = req.cookies.get("customer_id")?.value;

  if (!sessionId && !customerId) {
    return NextResponse.json({ items: [], summary: null });
  }

  // Build dynamic WHERE clause for the cart
  let whereClause = "";
  let params: any[] = [];

  if (customerId) {
    whereClause = "c.customer_id = ?";
    params.push(customerId);
  } else {
    whereClause = "c.session_id = ?";
    params.push(sessionId);
  }

  try {
    const [rows]: any = await db.query(
      `
      SELECT
        c.id AS cartId,
        c.subtotal AS cartSubtotal,
        c.discount AS cartDiscount,
        c.shipping_charges AS cartShipping,
        c.tax AS cartTax,
        c.total AS cartTotal,
        c.coupon_id AS coupon_id,
        
        ci.id AS id,
        ci.product_id AS productId,
        ci.variant_id AS variantId,
        s.label AS size, 
        p.slug,
        p.title AS name,
        ci.mrp,
        ci.price,
        ci.quantity,
        ci.total AS itemTotal,
        p.new_launch AS newLaunch,
        /* Fetch category slug for the product */
        cat.slug AS categorySlug,
        (
          SELECT JSON_OBJECTAGG(pv2.id, s2.label)
          FROM product_variants pv2
          JOIN sizes s2 ON s2.id = pv2.size_id
          WHERE pv2.product_id = p.id
        ) AS sizes
      FROM carts c
      LEFT JOIN cart_items ci ON c.id = ci.cart_id
      LEFT JOIN products p ON p.id = ci.product_id
      LEFT JOIN product_variants v ON v.id = ci.variant_id
      LEFT JOIN sizes s ON s.id = v.size_id
      /* Join Categories */
      LEFT JOIN product_categories pc ON pc.product_id = p.id
      LEFT JOIN categories cat ON cat.id = pc.category_id
      WHERE c.order_id IS NULL
      AND ${whereClause}
      ORDER BY c.created_at ASC
      `,
      params
    );

    if (rows.length === 0) {
      return NextResponse.json({ items: [], summary: null });
    }

    // Format the items, filtering out nulls if the cart is empty but exists
    const items = rows
      .filter((row: any) => row.id !== null)
      .map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        size: item.size,
        slug: item.slug,
        name: item.name,
        mrp: Number(item.mrp),
        price: Number(item.price),
        quantity: item.quantity,
        itemTotal: Number(item.itemTotal),
        newLaunch: Boolean(item.newLaunch),
        sizes: typeof item.sizes === 'string' ? JSON.parse(item.sizes) : (item.sizes || {}),
        categorySlug: item.categorySlug,
      }));

    const categorySlugs: string[] = items.map((i: any) => i.categorySlug || "");

    const hasCompressions = categorySlugs.some((slug: string) => slug === 'male-compressions');
    const hasShorts = categorySlugs.some((slug: string) => 
      ['female-mma-shorts', 'male-mma-shorts'].includes(slug)
    );

    let cartCategory = "both";
    if (hasCompressions && hasShorts) {
      cartCategory = "both";
    } else if (hasCompressions) {
      cartCategory = "compressions";
    } else if (hasShorts) {
      cartCategory = "shorts";
    }

    // Extract summary from the first row (it's the same for all rows in this join)
    const summary = {
      id: rows[0].cartId,
      subtotal: Number(rows[0].cartSubtotal || 0),
      discount: Number(rows[0].cartDiscount || 0),
      shipping: Number(rows[0].cartShipping || 0),
      tax: Number(rows[0].cartTax || 0),
      total: Number(rows[0].cartTotal || 0),
      coupon_id: Number(rows[0].coupon_id || 0) ,
      cart_category: cartCategory
    };
    return NextResponse.json({ items, summary });

  } catch (error) {
    console.error("Cart Fetch Error:", error);
    return NextResponse.json({ error: "Failed to fetch cart" }, { status: 500 });
  }
}