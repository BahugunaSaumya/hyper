import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import { getServerUser } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { variantId } = await req.json();

    if (!variantId) {
      return NextResponse.json({ error: "Variant ID is required" }, { status: 400 });
    }

    // 1. Get MySQL customer ID from Firebase UID
    const [customers]: any = await db.query(
      "SELECT id FROM customers WHERE firebase_uid = ? LIMIT 1",
      [user.uid]
    );

    if (customers.length === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const customerId = customers[0].id;

    // 2. Check if the item already exists in the wishlist
    const [existing]: any = await db.query(
      "SELECT id FROM customer_wishlist WHERE customer_id = ? AND product_variant_id = ? LIMIT 1",
      [customerId, variantId]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Product already added to wishlist" },
        { status: 409 } // 409 Conflict is the standard status for duplicates
      );
    }

    // 3. Perform the Insert
    await db.query(
      "INSERT INTO customer_wishlist (customer_id, product_variant_id) VALUES (?, ?)",
      [customerId, variantId]
    );

    return NextResponse.json({ 
      success: true, 
      message: "Product added to wishlist successfully" 
    });

  } catch (error: any) {
    console.error("Wishlist Error:", error);
    
    // Fallback: Check for MySQL duplicate entry error code directly
    if (error.code === 'ER_DUP_ENTRY') {
      return NextResponse.json(
        { error: "Product already added to wishlist" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const [rows]: any = await db.query(`
      SELECT 
        w.id as wishlist_id,
        p.id as product_id,
        p.title,
        p.slug as product_slug,
        pv.id as variant_id,
        s.label as size,
        p.price,
        p.mrp,
        p.color as product_color,
        p.new_launch
      FROM customer_wishlist w
      JOIN product_variants pv ON w.product_variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      JOIN sizes s ON pv.size_id = s.id
      JOIN customers c ON w.customer_id = c.id
      WHERE c.firebase_uid = ?
    `, [user.uid]);

    return NextResponse.json({ wishlist: rows });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}