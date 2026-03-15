import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import { getServerUser } from "@/lib/firebaseAdmin";

export async function PUT(req: NextRequest) {
  try {
    // 1. Get and Verify Token
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.split("Bearer ")[1];
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const customer = await getCustomerId();

    const customerId = customer.id;
    const body = await req.json();

    // Remove ID if it exists in body to prevent primary key mutation errors
    const { id, ...addressData } = body;

    // 3. Check for existing default address
    const [existing]: any = await db.query(
      "SELECT id FROM customer_addresses WHERE customer_id = ? AND `default` = 1 LIMIT 1",
      [customerId]
    );

    if (existing.length > 0) {
      // Update existing
      await db.query(
        "UPDATE customer_addresses SET ? WHERE id = ?",
        [addressData, existing[0].id]
      );
    } else {
      // Insert new with customer_id explicitly set
      await db.query(
        "INSERT INTO customer_addresses SET ?",
        { ...addressData, customer_id: customerId, default: 1 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PROFILE_UPDATE_ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const customer = await getCustomerId();

    const [addrRows]: any = await db.query(
      `SELECT *
       FROM customer_addresses
       WHERE customer_id = ? AND \`default\` = 1
       LIMIT 1`,
      [customer.id]
    );

    return NextResponse.json({
      profile: {
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
      },
      address: addrRows.length ? addrRows[0] : null,
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 401 }
    );
  }
}

async function getCustomerId() {
  const decoded = await getServerUser();
  const firebaseUid = decoded.uid;
  const email = decoded.email ?? null;

  const [rows]: any = await db.query(
    `SELECT id, first_name, last_name, email
     FROM customers
     WHERE firebase_uid = ? OR email = ?
     LIMIT 1`,
    [firebaseUid, email]
  );

  if (!rows.length) {
    throw new Error("Customer not found");
  }

  return rows[0];
}
