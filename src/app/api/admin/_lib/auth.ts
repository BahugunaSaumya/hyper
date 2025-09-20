// src/app/api/admin/_lib/auth.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@/lib/firebaseAdmin";
import { ADMIN_EMAILS, ADMIN_UIDS } from "@/config/admin";

/**
 * Require a valid Firebase ID token with Bearer auth AND
 * ensure the user is an admin (email in ADMIN_EMAILS or uid in ADMIN_UIDS).
 */
export async function requireAdmin(req: NextRequest) {
  const authz = req.headers.get("authorization") || "";
  const m = authz.match(/^Bearer (.+)$/i);
  if (!m) {
    return NextResponse.json({ error: "Unauthorized: missing Bearer token" }, { status: 401 });
  }

  const token = m[1];

  try {
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(token);

    const email = (decoded.email || "").toLowerCase();
    const uid = decoded.uid;

    const allowed =
      (email && ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email)) ||
      (uid && ADMIN_UIDS.includes(uid));

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden: not an admin" }, { status: 403 });
    }

    return null; // OK
  } catch (e: any) {
    console.error("[requireAdmin] verifyIdToken failed:", e?.code || e?.message || e);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
