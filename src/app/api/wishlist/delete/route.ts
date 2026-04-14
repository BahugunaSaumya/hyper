import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import { getServerUser } from "@/lib/firebaseAdmin";

export async function DELETE(req: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { wishlistId } = await req.json();

    if (!wishlistId) {
      return NextResponse.json({ error: "Wishlist ID required" }, { status: 400 });
    }

    // 1. Get MySQL customer ID
    const [customer]: any = await db.query(
      "SELECT id FROM customers WHERE firebase_uid = ? LIMIT 1",
      [user.uid]
    );

    if (!customer.length) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const customerId = customer[0].id;

    // 2. Delete the item
    const [result]: any = await db.query(
      "DELETE FROM customer_wishlist WHERE id = ? AND customer_id = ?",
      [wishlistId, customerId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Item not found or unauthorized" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Item removed from wishlist" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}