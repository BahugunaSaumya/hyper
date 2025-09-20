// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "../_lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/admin/users
 * Query params:
 *  - q: optional search (matches name or email, case-insensitive; client-side filtered after fetch)
 *  - limit: max users (default 100, max 500)
 *  - perUserOrders: number of recent orders to include per user in the list (default 2, max 5)
 *
 * Response:
 *  {
 *    users: [
 *      {
 *        id, email, name, address?, ...other user fields,
 *        orderStats: { count: number, recent: Array<{ id, total, itemsCount, status, createdAt }> }
 *      }
 *    ]
 *  }
 */
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const limit = Math.max(1, Math.min(500, Number(searchParams.get("limit") || 100)));
    const perUserOrders = Math.max(0, Math.min(5, Number(searchParams.get("perUserOrders") || 2)));

    const db = getDb();

    // Pull up to 1000 users (upper bound so client-side search still works).
    // If you have many users, consider adding server-side pagination (startAfter).
    const snap = await db.collection("users").limit(1000).get();

    // Build base user list
    let users = snap.docs.map((d) => {
      const data = d.data() || {};
      // Address could be stored as object or string — include both if present
      const address = data.address ?? data.shippingAddress ?? data.defaultAddress ?? null;

      return {
        id: d.id,
        email: data.email || null,
        name: data.name || data.displayName || null,
        address,
        ...data, // preserve additional user fields without overriding id
      };
    });

    // Client-side search by email/name
    if (q) {
      users = users.filter((u) => {
        const email = (u.email || "").toLowerCase();
        const name = (u.name || "").toLowerCase();
        return email.includes(q) || name.includes(q);
      });
    }

    // Sort by createdAt desc if present, else leave as-is
    users.sort((a: any, b: any) => {
      const ta = a.createdAt?.toMillis?.() ?? a.createdAt?._seconds ?? 0;
      const tb = b.createdAt?.toMillis?.() ?? b.createdAt?._seconds ?? 0;
      return tb - ta;
    });

    // Limit users
    users = users.slice(0, limit);

    // Attach order stats (count + a few recent orders) per user
    if (perUserOrders > 0) {
      // Sequential queries to keep it simple & predictable
      for (let i = 0; i < users.length; i++) {
        const u = users[i];
        const uid = u.id;
        const email = u.email || "";

        let orders: any[] = [];

        // Prefer userId match — NO orderBy (avoids composite index); we'll sort locally
        const byUid = await db
          .collection("orders")
          .where("userId", "==", uid)
          .limit(perUserOrders)
          .get();

        orders = byUid.docs.map((d) => ({ id: d.id, ...d.data() }));

        // If none found by uid and we have an email, try by email — also NO orderBy
        if (orders.length === 0 && email) {
          const byEmail = await db
            .collection("orders")
            .where("customer.email", "==", email)
            .limit(perUserOrders)
            .get();
          orders = byEmail.docs.map((d) => ({ id: d.id, ...d.data() }));
        }

        // Sort recent first locally (using createdAt or placedAt)
        orders.sort((a: any, b: any) => {
          const ta =
            a.createdAt?.toMillis?.() ??
            (typeof a.createdAt?.seconds === "number" ? a.createdAt.seconds * 1000 : 0) ??
            a.placedAt?.toMillis?.() ??
            (typeof a.placedAt?.seconds === "number" ? a.placedAt.seconds * 1000 : 0) ??
            0;

          const tb =
            b.createdAt?.toMillis?.() ??
            (typeof b.createdAt?.seconds === "number" ? b.createdAt.seconds * 1000 : 0) ??
            b.placedAt?.toMillis?.() ??
            (typeof b.placedAt?.seconds === "number" ? b.placedAt.seconds * 1000 : 0) ??
            0;

          return tb - ta;
        });

        // Count total orders
        // (If you need exact count for huge datasets, consider a counter in user doc or a Cloud Function.)
        let count = 0;
        try {
          const countByUid = await db.collection("orders").where("userId", "==", uid).count().get();
          count = countByUid.data().count;
          if (count === 0 && email) {
            const countByEmail = await db.collection("orders").where("customer.email", "==", email).count().get();
            count = countByEmail.data().count;
          }
        } catch {
          // Firestore count() requires new SDK; if unavailable, fall back to recent length (approx)
          count = orders.length;
        }

        const recent = orders.slice(0, perUserOrders).map((o: any) => ({
          id: o.id,
          total: o.total ?? o.amount ?? o.amounts?.total ?? null,
          itemsCount: Array.isArray(o.items) ? o.items.length : o.itemsCount ?? null,
          status: o.status ?? null,
          createdAt: toISO(o.createdAt) || toISO(o.placedAt) || null,
        }));

        (users[i] as any).orderStats = { count, recent };
      }
    }

    return NextResponse.json({ users }, { status: 200 });
  } catch (e: any) {
    console.error("[/api/admin/users GET] error:", e);
    return NextResponse.json({ error: e?.message || "Failed to load users" }, { status: 500 });
  }
}

function toISO(ts: any): string | null {
  try {
    if (!ts) return null;
    if (typeof ts?.toDate === "function") return ts.toDate().toISOString();
    if (typeof ts?.seconds === "number") return new Date(ts.seconds * 1000).toISOString();
    const d = new Date(ts);
    return isNaN(+d) ? null : d.toISOString();
  } catch {
    return null;
  }
}
