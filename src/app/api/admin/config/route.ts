// src/app/api/admin/config/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb, getAuth } from "@/lib/firebaseAdmin";
import { requireAdmin } from "../_lib/auth";
import { ADMIN_EMAILS, ADMIN_UIDS, SUPER_ADMIN_EMAILS } from "@/config/admin";

export const runtime = "nodejs";

/**
 * GET -> any admin (email in ADMIN_EMAILS / Firestore list, or UID in ADMIN_UIDS) can read config
 * Response: { adminEmails: string[], adminUids: string[] }
 */
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const db = getDb();
  const snap = await db.collection("config").doc("admin").get();
  const remote = snap.exists ? (snap.data() || {}) : {};

  // Prefer remote if present, else fall back to file
  const adminEmails: string[] = Array.isArray(remote.adminEmails)
    ? remote.adminEmails
    : ADMIN_EMAILS;

  const adminUids: string[] = Array.isArray(remote.adminUids)
    ? remote.adminUids
    : ADMIN_UIDS;

  return NextResponse.json({ adminEmails, adminUids }, { status: 200 });
}

/**
 * PUT -> ONLY SUPER ADMINS (email in SUPER_ADMIN_EMAILS) can update the admin email list.
 * Body: { adminEmails: string[] }
 */
export async function PUT(req: NextRequest) {
  // verify token
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const auth = getAuth();
  const decoded = await auth.verifyIdToken(token).catch(() => null);
  if (!decoded?.email) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

  // SUPER ADMIN check: email must be in hard-coded SUPER_ADMIN_EMAILS
  if (!SUPER_ADMIN_EMAILS.includes(decoded.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse body (we only allow editing adminEmails here)
  const body = await req.json().catch(() => ({}));
  const adminEmails: string[] = Array.isArray(body.adminEmails)
    ? body.adminEmails
        .filter((e: unknown) => typeof e === "string" && e.includes("@"))
        .map((e: string) => e.trim().toLowerCase())
    : [];

  const db = getDb();
  await db
    .collection("config")
    .doc("admin")
    .set(
      {
        adminEmails,
      },
      { merge: true }
    );

  return NextResponse.json({ ok: true, adminEmails }, { status: 200 });
}
