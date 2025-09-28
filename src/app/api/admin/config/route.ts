import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "../_lib/auth";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;
const CFG_KEY = "admin:doc:config/admin";

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const peek = cache.peek(CFG_KEY);
  let xcache = "MISS";

  const payload = await cache.remember<Record<string, any> | null>(CFG_KEY, TTL_MS, SWR_MS, async () => {
    const db = getDb();
    const doc = await db.collection("config").doc("admin").get();
    return doc.exists ? doc.data()! : { adminEmails: [], adminUids: [] };
  });

  if (peek.has && (peek.fresh || peek.stale)) xcache = peek.fresh ? "HIT" : "STALE";
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      "X-Cache": xcache,
    },
  });
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const body = await req.json().catch(() => ({}));
  const adminEmails: string[] = Array.isArray(body.adminEmails) ? body.adminEmails : [];

  const db = getDb();
  await db.collection("config").doc("admin").set({ adminEmails }, { merge: true });

  // Invalidate cached config
  cache.del(CFG_KEY);

  return NextResponse.json({ ok: true, adminEmails }, { status: 200 });
}
