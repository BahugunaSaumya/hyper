import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/mysql";
import bcrypt from "bcryptjs";
import { getAuth } from "firebase-admin/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, first_name, last_name, mobile, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    // Hash the password before saving to MySQL
    const hashedPassword = await bcrypt.hash(password, 10);

    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing token" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await getAuth().verifyIdToken(token);
    await db.query(
      `INSERT INTO customers (
        first_name,
        last_name,
        email,
        mobile,
        password,
        email_verified,
        firebase_uid
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        first_name = VALUES(first_name),
        last_name = VALUES(last_name),
        mobile = IF(mobile IS NULL OR mobile = '', VALUES(mobile), mobile),
        firebase_uid = VALUES(firebase_uid)
      `,
      [
        first_name,
        last_name,
        email,
        mobile,
        hashedPassword,
        1,
        decoded.uid,
      ]
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("MySQL Sync Error:", error);
    return NextResponse.json({ error: "Database sync failed" }, { status: 500 });
  }
}