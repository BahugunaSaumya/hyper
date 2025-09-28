import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";
import { requireAdmin } from "../_lib/auth";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;
const keyFor = (limit: number, q: string, per: number) =>
  `admin:qry:users?limit=${limit}&q=${encodeURIComponent(q)}&per=${per}`;

function tsToMs(x: any): number {
  try {
    if (!x) return 0;
    if (typeof x?.toDate === "function") return x.toDate().getTime();
    if (typeof x?.seconds === "number") return x.seconds * 1000;
    const n = Date.parse(x);
    return Number.isFinite(n) ? n : 0;
  } catch { return 0; }
}

export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(500, Number(searchParams.get("limit") || 100)));
  const q = (searchParams.get("q") || "").trim();
  const perUserOrders = Math.max(0, Math.min(5, Number(searchParams.get("perUserOrders") || 0)));

  const k = keyFor(limit, q, perUserOrders);
  const peek = cache.peek(k);
  let xcache = "MISS";

  try {
    const payload = await cache.remember<{ users: Array<Record<string, any>> }>(
      k,
      TTL_MS,
      SWR_MS,
      async () => {
        const db = getDb();

        // Base list
        const usersSnap = await db.collection("users").limit(limit).get();
        let users = usersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        if (q) {
          const ql = q.toLowerCase();
          users = users.filter(
            (u) =>
              String(u.name || "").toLowerCase().includes(ql) ||
              String(u.email || "").toLowerCase().includes(ql)
          );
        }
        users = users.slice(0, limit);

        if (perUserOrders > 0) {
          const withOrders: any[] = [];
          for (const u of users) {
            const uid = u.id;
            const email = u.email || "";
            let orders: any[] = [];

            // 🔁 No orderBy → no composite index required; we sort in memory
            const s1 = await db
              .collection("orders")
              .where("userId", "==", uid)
              .limit(perUserOrders)
              .get()
              .catch(() => null);

            if (s1 && !s1.empty) {
              orders = s1.docs.map((d) => ({ id: d.id, ...d.data() }));
            } else if (email) {
              const s2 = await db
                .collection("orders")
                .where("customer.email", "==", email)
                .limit(perUserOrders)
                .get()
                .catch(() => null);
              if (s2 && !s2.empty) orders = s2.docs.map((d) => ({ id: d.id, ...d.data() }));
            }

            // Sort descending by createdAt if present
            orders.sort((a, b) => tsToMs(b.createdAt) - tsToMs(a.createdAt));

            withOrders.push({ ...u, orders });
          }
          users = withOrders;
        }

        return { users };
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
  } catch (e: any) {
    console.error("[/api/admin/users GET] error:", e);
    return NextResponse.json({ error: e?.message || "Failed to load users" }, { status: 500 });
  }
}
