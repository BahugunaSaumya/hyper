// src/app/api/me/profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb, getAuth } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

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
  return { uid: decoded.uid, email: decoded.email || "" };
}

/** GET the caller's profile (address + a few basics) */
export async function GET(req: NextRequest) {
  const id = await getUidFromReq(req);
  if ("error" in id) return id.error;

  const db = getDb();
  const doc = await db.collection("users").doc(id.uid).get();
  const data = doc.exists ? (doc.data() || {}) : {};

  // Shape is intentionally simple for your dashboard
  return NextResponse.json(
    {
      exists: !!doc.exists,
      user: {
        id: id.uid,
        email: data.email || id.email || null,
        name: data.name || null,
        phone: data.phone || null,
      },
      address: data.address || null,
    },
    { status: 200 }
  );
}

/** PUT the caller's profile address (and optional name/phone) */
export async function PUT(req: NextRequest) {
  const id = await getUidFromReq(req);
  if ("error" in id) return id.error;

  const body = await req.json().catch(() => ({}));
  const incoming = (body?.address ?? {}) as Record<string, any>;

  const clean = (v: any) => (typeof v === "string" ? v.trim() : "");
  const address = {
    name: clean(incoming.name),
    phone: clean(incoming.phone),
    street: clean(incoming.street),
    city: clean(incoming.city),
    state: clean(incoming.state),
    postal: clean(incoming.postal),
    country: clean(incoming.country || "IN"),
  };

  // allow updating top-level name/phone too (optional)
  const topName = typeof body?.name === "string" ? body.name.trim() : undefined;
  const topPhone = typeof body?.phone === "string" ? body.phone.trim() : undefined;

  const db = getDb();
  await db
    .collection("users")
    .doc(id.uid)
    .set(
      {
        email: id.email || null,
        ...(topName !== undefined ? { name: topName } : {}),
        ...(topPhone !== undefined ? { phone: topPhone } : {}),
        address,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

  return NextResponse.json({ ok: true, address }, { status: 200 });
}
