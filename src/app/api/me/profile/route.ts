import { NextRequest, NextResponse } from "next/server";
import { getDb, getAuth } from "@/lib/firebaseAdmin";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;
const keyFor = (uid: string) => `me:doc:profile/${uid}`;

function bearer(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7).trim() : "";
}

async function getUidFromReq(req: NextRequest) {
  const token = bearer(req);
  if (!token) return { error: NextResponse.json({ error: "Missing token" }, { status: 401 }) };
  const auth = getAuth();
  const decoded = await auth.verifyIdToken(token).catch(() => null);
  if (!decoded?.uid) return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  return { uid: decoded.uid, email: decoded.email || null };
}

export async function GET(req: NextRequest) {
  const id = await getUidFromReq(req);
  if ("error" in id) return id.error;

  const k = keyFor(id.uid);
  const peek = cache.peek(k);
  let xcache = "MISS";

  const payload = await cache.remember<Record<string, any> | null>(k, TTL_MS, SWR_MS, async () => {
    const db = getDb();
    const doc = await db.collection("users").doc(id.uid).get();
    return doc.exists ? ({ id: doc.id, ...doc.data() }) : null;
  });

  if (!payload) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (peek.has && (peek.fresh || peek.stale)) xcache = peek.fresh ? "HIT" : "STALE";

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=300",
      "X-Cache": xcache,
    },
  });
}

export async function PUT(req: NextRequest) {
  const id = await getUidFromReq(req);
  if ("error" in id) return id.error;

  const db = getDb();
  const body = await req.json().catch(() => ({}));
  const incoming = (body?.address ?? {}) as Record<string, any>;

  const clean = (v: any) => (typeof v === "string" ? v.trim() : "");
  const address = {
    name: clean(incoming.name),
    phone: clean(incoming.phone),
    street: clean(incoming.street),
    city: clean(incoming.city),
    state: clean(incoming.state),
    postalCode: clean(incoming.postalCode || incoming.pin || incoming.pincode),
    country: incoming.country || "IN",
  };

  await db.collection("users").doc(id.uid).set(
    {
      email: id.email || null,
      address,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  // Invalidate profile cache after write
  cache.del(keyFor(id.uid));

  return NextResponse.json({ ok: true, address }, { status: 200 });
}
