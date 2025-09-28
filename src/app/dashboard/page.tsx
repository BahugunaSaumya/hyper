// src/app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { loginUrl } from "@/config/paths";
import LoadingScreen from "@/components/LoadingScreen";

type OrderLite = {
  id: string;
  total?: number | string;
  status?: string;
  createdAt?: any;      // Firestore Timestamp | ISO | number
  placedAt?: string;    // ISO/string
  amounts?: { total?: number; currency?: string };
  customer?: { name?: string };
};

type Address = {
  name?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postal?: string;
  country?: string;
};

export default function DashboardPage() {
  const { user, loading, profile } = useAuth() as any;
  const router = useRouter();

  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);
  const [fetchErr, setFetchErr] = useState<string | null>(null);

  // Address state (read-only by default if Firestore has one)
  const [addr, setAddr] = useState<Address>({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    postal: "",
    country: "IN",
  });
  const [editingAddr, setEditingAddr] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.replace(loginUrl("/dashboard"));
    }
  }, [loading, user, router]);

  // Prefill from local profile (context) or local draft for initial render
  useEffect(() => {
    const draft = safeParse(localStorage.getItem("addressDraft"));
    const fromProfile: Address | null = profile?.address || null;

    if (fromProfile) {
      setAddr({
        name: fromProfile.name || profile?.name || "",
        phone: fromProfile.phone || profile?.phone || "",
        street: fromProfile.street || "",
        city: fromProfile.city || "",
        state: fromProfile.state || "",
        postal: fromProfile.postal || "",
        country: fromProfile.country || "IN",
      });
      setEditingAddr(false);
    } else if (draft) {
      setAddr({
        name: draft.name || profile?.name || "",
        phone: draft.phone || profile?.phone || "",
        street: draft.street || "",
        city: draft.city || "",
        state: draft.state || "",
        postal: draft.postal || "",
        country: draft.country || "IN",
      });
      setEditingAddr(true);
    } else {
      setAddr({
        name: profile?.name || "",
        phone: profile?.phone || "",
        street: "",
        city: "",
        state: "",
        postal: "",
        country: "IN",
      });
      setEditingAddr(true);
    }
  }, [profile?.address, profile?.name, profile?.phone]);

  // NEW: Load saved profile/address from Firestore (authoritative)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const tok = await user.getIdToken?.();
        const res = await fetch("/api/me/profile", {
          headers: { authorization: `Bearer ${tok}` },
          cache: "no-store",
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body) return;
        if (cancelled) return;

        if (body.address) {
          setAddr({
            name: body.address.name || profile?.name || "",
            phone: body.address.phone || profile?.phone || "",
            street: body.address.street || "",
            city: body.address.city || "",
            state: body.address.state || "",
            postal: body.address.postal || "",
            country: body.address.country || "IN",
          });
          setEditingAddr(false); // show read-only view if exists in Firestore
        }
      } catch {
        // ignore network errors; local draft already applied
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, profile?.name, profile?.phone]);

  // Load orders (paged) from API
  useEffect(() => {
    if (!user || fetching) return;
    (async () => {
      setFetching(true);
      setFetchErr(null);
      try {
        const tok = await user.getIdToken?.();
        const res = await fetch(`/api/me/orders?limit=50`, {
          headers: { authorization: `Bearer ${tok}` },
          cache: "no-store",
        });
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error || "Failed to load orders");
        const list = Array.isArray(body?.orders) ? body.orders : [];
        list.sort((a: any, b: any) => tsMs(b?.createdAt) - tsMs(a?.createdAt));
        setOrders(list);
        setNextCursor(body?.nextCursor || null);
      } catch (e: any) {
        setFetchErr(e?.message || "Failed to load orders");
      } finally {
        setFetching(false);
        setFirstLoad(false);
      }
    })();
  }, [user]); // run once per session

  async function loadMore() {
    if (!user || !nextCursor || fetching) return;
    setFetching(true);
    setFetchErr(null);
    try {
      const tok = await user.getIdToken?.();
      const res = await fetch(
        `/api/me/orders?limit=50&cursor=${encodeURIComponent(nextCursor)}`,
        { headers: { authorization: `Bearer ${tok}` }, cache: "no-store" }
      );
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Failed to load more orders");
      const page: OrderLite[] = Array.isArray(body?.orders) ? body.orders : [];
      setOrders((prev) => {
        const merged = [...prev, ...page];
        merged.sort((a: any, b: any) => tsMs(b?.createdAt) - tsMs(a?.createdAt));
        return dedupeById(merged);
      });
      setNextCursor(body?.nextCursor || null);
    } catch (e: any) {
      setFetchErr(e?.message || "Failed to load more orders");
    } finally {
      setFetching(false);
    }
  }

  // Derived KPIs
  const kpis = useMemo(() => {
    const count = orders.length;
    const totalSpend = orders.reduce((sum, o) => {
      const n =
        o?.amounts?.total ??
        (typeof o?.total === "string" ? parseFloat(o.total) : Number(o?.total || 0));
      return sum + (isFinite(n) ? n : 0);
    }, 0);

    const latestWhen =
      toISO(orders[0]?.createdAt) ||
      orders[0]?.placedAt ||
      orders
        .map((o) => toISO(o.createdAt) || o.placedAt || null)
        .filter(Boolean)
        .sort()
        .pop() ||
      null;

    return { count, totalSpend, latestWhen };
  }, [orders]);

  if (loading || (!user && typeof window !== "undefined")) {
    return (
      <main className="min-h-[60vh] grid place-items-center text-sm text-gray-600">
      <LoadingScreen />
      </main>
    );
  }
  if (!user) return null;

  // Save address to Firestore (with graceful local fallback)
  async function saveAddress() {
    if (!user) return;
    setSavingAddr(true);
    try {
      const tok = await user.getIdToken?.();

      // Preferred endpoint
      let res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${tok}`,
        },
        body: JSON.stringify({ address: addr }),
      });

      // Fallback alias if someone removed /profile
      if (res.status === 404) {
        res = await fetch("/api/me/address", {
          method: "PUT",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${tok}`,
          },
          body: JSON.stringify({ address: addr }),
        });
      }

      if (res.ok) {
        localStorage.removeItem("addressDraft");
        setEditingAddr(false);
        alert("Address saved.");
        return;
      }

      const bodyText = await res.text().catch(() => "");
      console.warn("[dashboard] address save failed:", res.status, bodyText);
      localStorage.setItem("addressDraft", JSON.stringify(addr));
      alert("Saved locally (no profile API). Add /api/me/profile to persist in Firestore.");
      setEditingAddr(false);
    } catch (e) {
      console.error(e);
      localStorage.setItem("addressDraft", JSON.stringify(addr));
      alert("Saved locally. (Network/API error)");
      setEditingAddr(false);
    } finally {
      setSavingAddr(false);
    }
  }

  function cancelEditAddress() {
    const fromProfile: Address | null = profile?.address || null;
    const draft = safeParse(localStorage.getItem("addressDraft"));
    const base: Address =
      fromProfile ||
      draft || {
        name: profile?.name || "",
        phone: profile?.phone || "",
        street: "",
        city: "",
        state: "",
        postal: "",
        country: "IN",
      };
    setAddr(base);
    setEditingAddr(false);
  }

  return (
    <main className="bg-white text-black">
      <div style={{ height: "calc(var(--nav-h, 88px))" }} />

      {/* Header */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide">
          My Account
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Signed in as <span className="font-medium">{user.email || user.uid}</span>
        </p>
      </section>

      {/* KPI Cards */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pb-8">
        <Card title="Orders">
          <div className="text-2xl font-extrabold">{kpis.count}</div>
        </Card>
        <Card title="Total Spend">
          <div className="text-2xl font-extrabold">₹ {fmtINR(kpis.totalSpend)}</div>
        </Card>
        <Card title="Last Order">
          <div className="text-sm">
            {kpis.latestWhen ? new Date(kpis.latestWhen).toLocaleString() : "—"}
          </div>
        </Card>
      </section>

      <div className="max-w-6xl mx-auto px-4 md:px-6 grid lg:grid-cols-3 gap-6 pb-16">
        {/* Orders */}
        <section className="lg:col-span-2 rounded-2xl border border-gray-200 overflow-hidden">
          <header className="px-5 py-3 border-b text-sm font-semibold flex items-center justify-between">
            <span>Your Orders</span>
            <div className="flex items-center gap-2">
              {fetchErr && <span className="text-xs text-red-600">{fetchErr}</span>}
              <button
                onClick={() => {
                  // quick reload first page
                  setNextCursor(null);
                  setOrders([]);
                  setFirstLoad(true);
                  (async () => {
                    if (!user) return;
                    setFetching(true);
                    try {
                      const tok = await user.getIdToken?.();
                      const res = await fetch(`/api/me/orders?limit=50`, {
                        headers: { authorization: `Bearer ${tok}` },
                        cache: "no-store",
                      });
                      const body = await res.json().catch(() => null);
                      if (!res.ok) throw new Error(body?.error || "Failed to load orders");
                      const list = Array.isArray(body?.orders) ? body.orders : [];
                      list.sort((a: any, b: any) => tsMs(b?.createdAt) - tsMs(a?.createdAt));
                      setOrders(list);
                      setNextCursor(body?.nextCursor || null);
                    } catch (e: any) {
                      setFetchErr(e?.message || "Failed to load orders");
                    } finally {
                      setFetching(false);
                      setFirstLoad(false);
                    }
                  })();
                }}
                className="text-xs px-3 py-1 rounded-full border hover:bg-black hover:text-white transition disabled:opacity-60"
                disabled={fetching}
              >
                Refresh
              </button>
            </div>
          </header>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <Th>Order ID</Th>
                  <Th>Status</Th>
                  <Th>Total</Th>
                  <Th>Placed</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.length ? (
                  orders.map((o) => {
                    const total =
                      o?.amounts?.total ??
                      (typeof o?.total === "string"
                        ? parseFloat(o.total)
                        : Number(o?.total || 0));
                    const when = toISO(o.createdAt) || o.placedAt || null;
                    return (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <Td className="font-mono">{o.id}</Td>
                        <Td className="capitalize">{o.status || "created"}</Td>
                        <Td>₹ {fmtINR(total)}</Td>
                        <Td>{when ? new Date(when).toLocaleString() : "—"}</Td>
                        <Td>
                          <Link
                            href={`/order/${o.id}`}
                            className="text-xs px-3 py-1 rounded-full border hover:bg-black hover:text-white transition"
                          >
                            View
                          </Link>
                        </Td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <Td colSpan={5} className="text-gray-500">
                      {firstLoad ? "Loading…" : "You haven’t placed any orders yet."}
                    </Td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {orders.length} loaded{nextCursor ? " (more available)" : ""}
            </span>
            <button
              onClick={loadMore}
              disabled={!nextCursor || fetching}
              className="text-xs px-4 py-2 rounded-full border hover:bg-black hover:text-white transition disabled:opacity-60"
            >
              {fetching ? "Loading…" : nextCursor ? "Load more" : "All caught up"}
            </button>
          </div>
        </section>

        {/* Address / Profile */}
        <section className="rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Profile & Address</div>
            {!editingAddr ? (
              <button
                onClick={() => setEditingAddr(true)}
                className="text-xs px-3 py-1.5 rounded-full border hover:bg-black hover:text-white"
              >
                Edit
              </button>
            ) : null}
          </div>

          {/* READ-ONLY VIEW */}
          {!editingAddr ? (
            <div className="space-y-3 mt-3">
              <Labeled value={user.email || user.uid} label="Email" />
              <Labeled value={addr.name} label="Full Name" />
              <Labeled value={addr.phone} label="Phone" />
              <Labeled
                value={[addr.street, addr.city, addr.state, addr.postal].filter(Boolean).join(", ")}
                label="Address"
              />
              <Labeled value={addr.country} label="Country" />
            </div>
          ) : (
            // EDIT FORM
            <div className="space-y-3 mt-3">
              <Labeled value={user.email || user.uid} label="Email" />
              <Input label="Full Name" value={addr.name} onChange={(v) => setAddr((a) => ({ ...a, name: v }))} />
              <Input label="Phone" value={addr.phone} onChange={(v) => setAddr((a) => ({ ...a, phone: v }))} />
              <Input label="Street Address" value={addr.street} onChange={(v) => setAddr((a) => ({ ...a, street: v }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="City" value={addr.city} onChange={(v) => setAddr((a) => ({ ...a, city: v }))} />
                <Input label="State" value={addr.state} onChange={(v) => setAddr((a) => ({ ...a, state: v }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Postal Code" value={addr.postal} onChange={(v) => setAddr((a) => ({ ...a, postal: v }))} />
                <Input label="Country" value={addr.country} onChange={(v) => setAddr((a) => ({ ...a, country: v }))} />
              </div>

              <div className="pt-2 flex items-center justify-between gap-3">
                <button
                  onClick={saveAddress}
                  disabled={savingAddr}
                  className="px-4 py-2 rounded-full border text-sm font-semibold hover:bg-black hover:text-white transition disabled:opacity-60"
                >
                  {savingAddr ? "Saving…" : "Save"}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      localStorage.setItem("addressDraft", JSON.stringify(addr));
                      alert("Saved locally. (If no profile API exists, this keeps your draft here.)");
                    }}
                    className="px-3 py-1.5 rounded-full border text-xs hover:bg-gray-100"
                  >
                    Save local draft
                  </button>
                  <button
                    onClick={cancelEditAddress}
                    className="px-3 py-1.5 rounded-full border text-xs hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

/* ---------- helpers & tiny UI bits ---------- */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 p-5">
      <div className="text-xs text-gray-600 mb-1">{title}</div>
      {children}
    </div>
  );
}
function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-2 font-semibold whitespace-nowrap">{children}</th>;
}
function Td({
  children,
  className = "",
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return <td className={`px-4 py-2 align-top ${className}`} colSpan={colSpan}>{children}</td>;
}
function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-600">{label}</span>
      <input
        className="border rounded px-3 py-2"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Labeled({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-600">{label}</span>
      <span className="text-sm">{value || "—"}</span>
    </div>
  );
}

function fmtINR(n?: number) {
  return Number(n || 0).toLocaleString("en-IN");
}
function safeParse(json: any) {
  try {
    return JSON.parse(json);
  } catch {
    return null;
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
function tsMs(ts: any) {
  const iso = toISO(ts);
  return iso ? Date.parse(iso) : 0;
}
function dedupeById<T extends { id: string }>(xs: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const x of xs) {
    if (!seen.has(x.id)) {
      seen.add(x.id);
      out.push(x);
    }
  }
  return out;
}
