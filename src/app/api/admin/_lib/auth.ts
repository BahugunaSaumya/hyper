// src/app/api/admin/_lib/auth.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getAuth, getDb } from "@/lib/firebaseAdmin";
import * as cache from "@/lib/cache";
import { ADMIN_EMAILS, ADMIN_UIDS, SUPER_ADMIN_EMAILS } from "@/config/admin";

/** Short cache to avoid hitting Firestore on every call. */
const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;
const CFG_KEY = "admin:doc:config/admin";

type AdminConfigDoc = {
  adminEmails: string[];
  adminUids?: string[];
};

function extractBearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : null;
}

function uniqLower(xs: string[]): string[] {
  return Array.from(new Set(xs.map((x) => x.trim().toLowerCase()).filter(Boolean)));
}

/** Pull current admin emails from Firestore (with cache), fallback to file list. */
async function getDbAdminEmails(): Promise<string[]> {
  const peek = cache.peek(CFG_KEY);
  const doc = await cache.remember<AdminConfigDoc | null>(
    CFG_KEY,
    TTL_MS,
    SWR_MS,
    async () => {
      const db = getDb();
      const snap = await db.collection("config").doc("admin").get();
      if (!snap.exists) return { adminEmails: [], adminUids: [] };
      return snap.data() as AdminConfigDoc;
    }
  );
  const fileAdmins = uniqLower(ADMIN_EMAILS || []);
  const storedAdmins = uniqLower(doc?.adminEmails || []);
  // Effective admins = DB list (editable via UI) plus file list (fallback/seed)
  return uniqLower([...storedAdmins, ...fileAdmins]);
}

/**
 * Require a valid token AND that the user is an admin.
 * Admin if:
 *  - email in Firestore config/admin.adminEmails (editable via UI), OR
 *  - email in ADMIN_EMAILS (file fallback), OR
 *  - uid in ADMIN_UIDS (file)
 */
export async function requireAdmin(req: NextRequest) {
  const token = extractBearer(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized: missing Bearer token" }, { status: 401 });
  }
  try {
    const auth = getAuth();
    const id = await auth.verifyIdToken(token);
    const email = (id.email || "").toLowerCase();
    const uid = id.uid;

    const dbAdmins = await getDbAdminEmails();
    const isAdmin = (!!email && dbAdmins.includes(email)) || ADMIN_UIDS.includes(uid);

    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: not an admin" }, { status: 403 });
    }
    return null; // OK
  } catch (e: any) {
    console.error("[requireAdmin] verifyIdToken failed:", e?.code || e?.message || e);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

/**
 * Require a valid token AND that the user is a super admin.
 * Super admin is ONLY checked from code: SUPER_ADMIN_EMAILS.
 * (So only people you hardcode can edit the admin config itself.)
 */
export async function requireSuperAdmin(req: NextRequest) {
  const token = extractBearer(req);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized: missing Bearer token" }, { status: 401 });
  }
  try {
    const auth = getAuth();
    const id = await auth.verifyIdToken(token);
    const email = (id.email || "").toLowerCase();

    const allowed =
      !!email && SUPER_ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email);

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden: super admin only" }, { status: 403 });
    }
    return null; // OK
  } catch (e: any) {
    console.error("[requireSuperAdmin] verifyIdToken failed:", e?.code || e?.message || e);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
