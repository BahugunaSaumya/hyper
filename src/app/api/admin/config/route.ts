// src/app/api/admin/config/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import * as cache from "@/lib/cache";
import { requireAdmin, requireSuperAdmin } from "../_lib/auth";

export const runtime = "nodejs";

const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;
const CFG_KEY = "admin:doc:config/admin";

type AdminConfigDoc = {
  adminEmails: string[];
  adminUids?: string[];
};

/**
 * GET /api/admin/config
 * - Any ADMIN can read the current config (cached).
 */
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const peek = cache.peek(CFG_KEY);
  let xcache = "MISS";

  const payload = await cache.remember<AdminConfigDoc>(
    CFG_KEY,
    TTL_MS,
    SWR_MS,
    async () => {
      const db = getDb();
      const doc = await db.collection("config").doc("admin").get();
      return doc.exists
        ? (doc.data() as AdminConfigDoc)
        : { adminEmails: [], adminUids: [] };
    }
  );

  if (peek.has && (peek.fresh || peek.stale)) xcache = peek.fresh ? "HIT" : "STALE";
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      "X-Cache": xcache,
    },
  });
}

/**
 * POST /api/admin/config
 * - ONLY SUPER ADMINS can modify the config (e.g., adminEmails list).
 * Body: { adminEmails: string[] }
 */
export async function POST(req: NextRequest) {
  const unauthorized = await requireSuperAdmin(req);
  if (unauthorized) return unauthorized;

  const body = (await req.json().catch(() => ({}))) as Partial<AdminConfigDoc>;
  const raw = Array.isArray(body.adminEmails) ? body.adminEmails : [];

  // Normalize/validate: strings, trimmed, deduped, lowercase
  const adminEmails: string[] = Array.from(
    new Set(
      raw
        .filter((x: unknown): x is string => typeof x === "string")
        .map((x: string) => x.trim())
        .filter((x: string) => !!x)
        .map((x: string) => x.toLowerCase())
    )
  );

  const db = getDb();
  await db.collection("config").doc("admin").set({ adminEmails }, { merge: true });

  cache.del(CFG_KEY);
  return NextResponse.json({ ok: true, adminEmails }, { status: 200 });
}
  