// src/app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "../../_lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/admin/users/:id
 * :id may be a user doc id OR an email address.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const unauthorized = await requireAdmin(_req);
  if (unauthorized) return unauthorized;

  try {
    const db = getDb();
    const idOrEmail = decodeURIComponent((await params).id || "").trim();
    if (!idOrEmail) {
      return NextResponse.json({ error: "Missing user id" }, { status: 400 });
    }

    // 1) Load user by doc id; if not found and looks like email, try email
    let userDoc = await db.collection("users").doc(idOrEmail).get();
    let userData: any = null;

    if (userDoc.exists) {
      userData = { id: userDoc.id, ...userDoc.data() };
    } else if (idOrEmail.includes("@")) {
      const q = await db.collection("users").where("email", "==", idOrEmail).limit(1).get();
      if (!q.empty) {
        const d = q.docs[0];
        userData = { id: d.id, ...d.data() };
      }
    }

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const address =
      userData.address ?? userData.shippingAddress ?? userData.defaultAddress ?? null;

    const user = {
      id: userData.id,
      email: userData.email || null,
      name: userData.name || userData.displayName || null,
      address,
      ...userData, // keep original fields
    };

    // 2) Load orders (by uid, then by email) WITHOUT orderBy (no composite index)
    const ordersRaw: any[] = [];
    const uid = user.id;
    const email = user.email || "";

    const byUidSnap = await db.collection("orders").where("userId", "==", uid).limit(500).get();
    byUidSnap.forEach((d) => ordersRaw.push({ id: d.id, ...d.data() }));

    if (email) {
      const byEmailSnap = await db.collection("orders").where("customer.email", "==", email).limit(500).get();
      byEmailSnap.forEach((d) => {
        if (!ordersRaw.some((o) => o.id === d.id)) ordersRaw.push({ id: d.id, ...d.data() });
      });
    }

    const toISO = (ts: any): string | null => {
      try {
        if (!ts) return null;
        if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
        if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000).toISOString();
        const d = new Date(ts);
        return isNaN(+d) ? null : d.toISOString();
      } catch { return null; }
    };

    // Normalize & newest-first
    const orders = ordersRaw
      .map((o) => ({
        id: o.id,
        total: o.total ?? o.amount ?? o.amounts?.total ?? null,
        items: Array.isArray(o.items) ? o.items : null,
        status: o.status ?? null,
        createdAt: toISO(o.createdAt) || toISO(o.placedAt) || null,
        ...o,
      }))
      .sort((a, b) => (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0));

    return NextResponse.json({ user, orders }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/admin/users/[id] GET] error:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed to load user details" }, { status: 500 });
  }
}
