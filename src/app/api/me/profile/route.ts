// src/app/api/me/profile/route.ts
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

function cleanStr(v: any) {
  return typeof v === "string" ? v.trim() : "";
}

function normalizeAddress(raw: any = {}) {
  // Accept multiple shapes coming from the client
  const street = cleanStr(raw.street ?? raw.addr1);
  const city = cleanStr(raw.city);
  const state = cleanStr(raw.state);
  const phone = cleanStr(raw.phone);
  const name = cleanStr(raw.name);
  const country = cleanStr(raw.country) || "IN";

  // Accept pin/pincode/postal/postalCode and unify
  const p =
    cleanStr(raw.postal) ||
    cleanStr(raw.postalCode) ||
    cleanStr(raw.pin) ||
    cleanStr(raw.pincode);

  return {
    name,
    phone,
    street,
    city,
    state,
    postal: p,       // what the UI reads
    postalCode: p,   // compatibility (old writes)
    country,
  };
}

function normalizeDocForResponse(doc: any) {
  const user = doc?.user || {
    name: cleanStr(doc?.name),
    email: cleanStr(doc?.email),
    phone: cleanStr(doc?.phone),
  };

  // ensure postal is present even if only postalCode exists in DB
  const addr = doc?.address || {};
  const addrNorm = {
    name: cleanStr(addr.name),
    phone: cleanStr(addr.phone),
    street: cleanStr(addr.street),
    city: cleanStr(addr.city),
    state: cleanStr(addr.state),
    postal: cleanStr(addr.postal) || cleanStr(addr.postalCode),
    postalCode: cleanStr(addr.postalCode) || cleanStr(addr.postal),
    country: cleanStr(addr.country) || "IN",
  };

  return { id: doc?.id, user, address: addrNorm, updatedAt: doc?.updatedAt || null, email: doc?.email || null };
}

export async function GET(req: NextRequest) {
  const id = await getUidFromReq(req);
  if ("error" in id) return id.error;

  const k = keyFor(id.uid);
  const peek = cache.peek(k);
  let xcache = "MISS";

  const payload = await cache.remember<Record<string, any> | null>(k, TTL_MS, SWR_MS, async () => {
    const db = getDb();
    const snap = await db.collection("users").doc(id.uid).get();
    if (!snap.exists) return null;
    const data = { id: snap.id, ...snap.data() };
    return normalizeDocForResponse(data);
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

  // ✅ Read the body ONCE
  const body = await req.json().catch(() => ({} as any));
  console.log("[/api/me/profile] PUT body:", body);

  const incomingUser = body?.user || {};
  const userPatch = {
    name: cleanStr(incomingUser.name),
    email: cleanStr(incomingUser.email) || cleanStr(id.email),
    phone: cleanStr(incomingUser.phone),
  };

  // normalize & unify address keys
  const address = normalizeAddress(body?.address || body);

  // also keep top-level email + emailLower for querying
  const email = userPatch.email || id.email || null;
  const emailLower = email ? email.toLowerCase() : null;

  const db = getDb();
  await db.collection("users").doc(id.uid).set(
    {
      user: userPatch,
      email,
      emailLower,
      address,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );

  // Bust cache so subsequent GET returns fresh data
  cache.del(keyFor(id.uid));

  // Read back fresh doc to return normalized payload
  const snap = await db.collection("users").doc(id.uid).get();
  const fresh = snap.exists ? normalizeDocForResponse({ id: snap.id, ...snap.data() }) : null;

  return NextResponse.json({ ok: true, ...fresh }, { status: 200 });
}
