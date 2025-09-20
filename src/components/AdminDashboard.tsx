// src/components/AdminDashboard.tsx (FULL REPLACEMENT)
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_EMAILS, ADMIN_UIDS } from "@/config/admin";

// ---- Types ----
type KPI = { ordersCount: number; usersCount: number; revenue: number };
type Order = any;

// ---- Utils ----
async function safeJson(res: Response) {
    try {
        return await res.json();
    } catch {
        return null;
    }
}

function clsx(...xs: Array<string | false | null | undefined>) {
    return xs.filter(Boolean).join(" ");
}

function valueToCell(v: any) {
    if (v == null) return "";
    if (Array.isArray(v) || typeof v === "object") return JSON.stringify(v);
    return String(v);
}

// ---- Component ----
export default function AdminDashboard() {
    const { user } = useAuth();

    // auth/admin gate
    const allowed = useMemo(() => {
        if (!user) return false;
        return (
            (!!user.email && ADMIN_EMAILS.includes(user.email)) ||
            ADMIN_UIDS.includes(user.uid)
        );
    }, [user]);

    // state
    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    const [kpi, setKpi] = useState<KPI | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);

    // PRODUCTS TABLE STATE (works with Firestore or CSV)
    const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
    const [csvRows, setCsvRows] = useState<string[][]>([]);
    const [savingCsv, setSavingCsv] = useState(false);

    const [tab, setTab] = useState<"overview" | "products" | "orders" | "users">(
        "overview"
    );

    // users (loaded on demand when Users tab opens)
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any | null>(null);

    // initial load
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                if (!user || !allowed) {
                    if (mounted) setLoading(false);
                    return;
                }
                const tok = await user.getIdToken(true);
                if (!mounted) return;
                setToken(tok);

                console.log("[AdminDashboard] fetching summary, orders, products…");

                const [sRes, oRes, pRes] = await Promise.all([
                    fetch("/api/admin/summary", { headers: { authorization: `Bearer ${tok}` } }),
                    fetch("/api/admin/orders?limit=50", { headers: { authorization: `Bearer ${tok}` } }),
                    fetch("/api/admin/products", { headers: { authorization: `Bearer ${tok}` } }),
                ]);

                const s = await safeJson(sRes);
                const o = await safeJson(oRes);
                const p = await safeJson(pRes);

                if (sRes.ok && s) setKpi(s as KPI);
                if (oRes.ok && o) setOrders((o as any).orders || []);

                // Normalize products payload:
                // - Firestore mode: { products, headers }
                // - CSV mode: { headers, rows }
                if (pRes.ok && p) {
                    if (Array.isArray(p.products)) {
                        const list = p.products.map((prod: any) => ({ id: prod.id, ...prod }));
                        // union headers (always include "id")
                        const headerSet = new Set<string>(["id"]);
                        (p.headers || []).forEach((h: string) => headerSet.add(h));
                        list.forEach((prod: any) => Object.keys(prod).forEach((k) => headerSet.add(k)));
                        const headers = Array.from(headerSet);

                        const rows = list.map((prod: any) =>
                            headers.map((h) => (h === "id" ? prod.id : valueToCell(prod[h])))
                        );

                        console.log("[AdminDashboard] products: Firestore mode", {
                            count: list.length, headers: headers.length
                        });

                        setCsvHeaders(headers);
                        setCsvRows(rows);
                    } else if (Array.isArray(p.headers) && Array.isArray(p.rows)) {
                        console.log("[AdminDashboard] products: CSV mode", {
                            rows: p.rows.length, headers: p.headers.length
                        });
                        setCsvHeaders(p.headers);
                        setCsvRows(p.rows);
                    } else {
                        console.warn("[AdminDashboard] products: unexpected payload", p);
                        setCsvHeaders(["id", "name", "price"]);
                        setCsvRows([]);
                    }
                }

                if (!sRes.ok || !oRes.ok || !pRes.ok) {
                    setErr("Some admin data failed to load. Check server logs.");
                }
            } catch (e: any) {
                setErr(e?.message || "Failed to load admin data.");
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, [user, allowed]);

    // ---- Products: single row update/delete + CSV migrate/save ----
    const updateProduct = useCallback(
        async (id: string, patch: any) => {
            if (!token) return alert("Not authenticated");
            const res = await fetch(`/api/admin/products/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(patch),
            });
            const b = await safeJson(res);
            if (!res.ok) throw new Error(b?.error || "Failed to update product");
        },
        [token]
    );

    const deleteProduct = useCallback(
        async (id: string) => {
            if (!token) return alert("Not authenticated");
            if (!confirm("Delete this product? This cannot be undone.")) return;
            const res = await fetch(`/api/admin/products/${id}`, {
                method: "DELETE",
                headers: { authorization: `Bearer ${token}` },
            });
            const b = await safeJson(res);
            if (!res.ok) throw new Error(b?.error || "Failed to delete product");

            // remove from table state
            const idIdx = csvHeaders.indexOf("id");
            if (idIdx >= 0) {
                setCsvRows((rows) => rows.filter((r) => r?.[idIdx] !== id));
            }
        },
        [token, csvHeaders]
    );

    async function handleMigrateCsv() {
        if (!token) return alert("Not authenticated.");
        try {
            const res = await fetch("/api/admin/migrate-csv", {
                method: "POST",
                headers: { authorization: `Bearer ${token}` },
            });
            const body = await safeJson(res);
            if (!res.ok) throw new Error(body?.error || "CSV migration failed");
            alert(`CSV migrated: ${body?.count ?? 0} products updated.`);

            // reload products table
            await reloadProducts();
        } catch (e: any) {
            alert(e?.message || "CSV migration failed");
        }
    }

    async function saveCsv() {
        if (!token) return alert("Not authenticated.");
        try {
            setSavingCsv(true);
            const res = await fetch("/api/admin/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    authorization: `Bearer ${token}`,
                },
                // If your API supports bulk save via headers/rows, this will work.
                // If not, use per-row Save buttons (which call PUT).
                body: JSON.stringify({ headers: csvHeaders, rows: csvRows }),
            });
            const body = await safeJson(res);
            if (!res.ok) throw new Error(body?.error || "Failed to save products");
            alert("Products updated.");
        } catch (e: any) {
            alert(e?.message || "Failed to save products");
        } finally {
            setSavingCsv(false);
        }
    }

    async function reloadProducts() {
        if (!token) return;
        console.log("[AdminDashboard] reloadProducts()");
        const pRes = await fetch("/api/admin/products", {
            headers: { authorization: `Bearer ${token}` },
        });
        const p = await safeJson(pRes);

        if (!pRes.ok) {
            console.error("[AdminDashboard] reloadProducts error", p);
            alert(p?.error || "Failed to load products");
            return;
        }

        if (Array.isArray(p.products)) {
            const list = p.products.map((prod: any) => ({ id: prod.id, ...prod }));
            const headerSet = new Set<string>(["id"]);
            (p.headers || []).forEach((h: string) => headerSet.add(h));
            list.forEach((prod: any) => Object.keys(prod).forEach((k) => headerSet.add(k)));
            const headers = Array.from(headerSet);

            const rows = list.map((prod: any) =>
                headers.map((h) => (h === "id" ? prod.id : valueToCell(prod[h])))
            );

            console.log("[AdminDashboard] products: Firestore mode (reload)", {
                count: list.length, headers: headers.length
            });

            setCsvHeaders(headers);
            setCsvRows(rows);
            return;
        }

        if (Array.isArray(p.headers) && Array.isArray(p.rows)) {
            console.log("[AdminDashboard] products: CSV mode (reload)", {
                rows: p.rows.length, headers: p.headers.length
            });
            setCsvHeaders(p.headers);
            setCsvRows(p.rows);
            return;
        }

        console.warn("[AdminDashboard] products: unexpected payload on reload", p);
        setCsvHeaders(["id", "name", "price"]);
        setCsvRows([]);
    }

    // ---- Users ----
    const loadUsers = useCallback(async () => {
        if (!token) return;
        const res = await fetch(`/api/admin/users`, {
            headers: { authorization: `Bearer ${token}` },
        });
        const b = await safeJson(res);
        if (res.ok) setUsers(b?.users || []);
    }, [token]);

    const openUser = useCallback(
        async (uid: string) => {
            if (!token) return;
            const res = await fetch(`/api/admin/users/${uid}`, {
                headers: { authorization: `Bearer ${token}` },
            });
            const b = await safeJson(res);
            if (res.ok) setSelectedUser(b);
        },
        [token]
    );

    useEffect(() => {
        if (tab === "users") loadUsers();
        if (tab === "products") reloadProducts(); // ensure fresh data when switching to Products tab
    }, [tab, loadUsers]); // reloadProducts uses token; token is stable after mount

    // ---- Guards ----
    if (!user) {
        return (
            <div className="min-h-[60vh] grid place-items-center text-sm text-gray-600">
                Please log in.
            </div>
        );
    }
    if (!allowed) {
        return (
            <div className="min-h-[60vh] grid place-items-center text-sm text-gray-600">
                You do not have access to this page.
            </div>
        );
    }
    if (loading) {
        return (
            <div className="min-h-[60vh] grid place-items-center text-sm text-gray-600">
                Loading admin data…
            </div>
        );
    }

    // ---- UI ----
    return (
        <main className="bg-white text-black">
            <div style={{ height: "calc(var(--nav-h, 88px))" }} />

            <section className="max-w-6xl mx-auto px-6 pt-10 pb-6">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide">
                    Admin Dashboard
                </h1>
                <p className="text-sm text-gray-600 mt-1">Welcome, {user.email}.</p>
                {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
            </section>

            {/* Tabs header */}
            <section className="max-w-6xl mx-auto px-4 md:px-6 pb-4">
                <div className="flex items-center justify-between gap-3">
                    <nav className="flex gap-2">
                        {(["overview", "products", "orders", "users"] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setTab(t)}
                                className={clsx(
                                    "px-3 py-1.5 rounded-full border text-xs sm:text-sm",
                                    tab === t ? "bg-black text-white" : "hover:bg-gray-100"
                                )}
                            >
                                {t.toUpperCase()}
                            </button>
                        ))}
                    </nav>

                    {tab === "products" && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleMigrateCsv}
                                className="rounded-full bg-black px-4 py-2 text-white text-sm font-semibold hover:bg-pink-600 transition"
                            >
                                Migrate CSV → Firestore
                            </button>
                            <button
                                onClick={saveCsv}
                                disabled={savingCsv}
                                className="px-4 py-2 rounded-full border text-sm font-semibold hover:bg-black hover:text-white transition disabled:opacity-60"
                            >
                                {savingCsv ? "Saving…" : "Save All"}
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* OVERVIEW */}
            {tab === "overview" && (
                <section className="max-w-6xl mx-auto px-4 md:px-6 grid grid-cols-1 sm:grid-cols-3 gap-4 pb-8">
                    <Card title="Orders">
                        <div className="text-2xl font-extrabold">{kpi?.ordersCount ?? "—"}</div>
                    </Card>
                    <Card title="Users">
                        <div className="text-2xl font-extrabold">{kpi?.usersCount ?? "—"}</div>
                    </Card>
                    <Card title="Revenue (INR)">
                        <div className="text-2xl font-extrabold">
                            ₹ {Number(kpi?.revenue || 0).toLocaleString("en-IN")}
                        </div>
                    </Card>
                </section>
            )}

            {/* PRODUCTS */}
            {tab === "products" && (
                <section className="max-w-6xl mx-auto px-4 md:px-6 pb-20">
                    <div className="rounded-2xl border border-gray-200 overflow-hidden">
                        <header className="px-5 py-3 border-b text-sm font-semibold flex items-center justify-between">
                            <span>Products</span>
                            <button
                                onClick={reloadProducts}
                                className="px-3 py-1.5 rounded-full border text-xs hover:bg-black hover:text-white"
                            >
                                Refresh
                            </button>
                        </header>

                        <div className="overflow-x-auto">
                            <table className="min-w-full text-xs sm:text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {csvHeaders.map((h, i) => (
                                            <Th key={i}>{h}</Th>
                                        ))}
                                        <Th>Action</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {csvRows.map((row, rIdx) => (
                                        <tr key={rIdx}>
                                            {csvHeaders.map((_, cIdx) => (
                                                <Td key={cIdx} className="p-1 sm:p-2">
                                                    <input
                                                        value={row[cIdx] ?? ""}
                                                        onChange={(e) => {
                                                            const v = e.target.value;
                                                            setCsvRows((old) => {
                                                                const next = old.map((r) => [...r]);
                                                                while (next[rIdx].length < csvHeaders.length)
                                                                    next[rIdx].push("");
                                                                next[rIdx][cIdx] = v;
                                                                return next;
                                                            });
                                                        }}
                                                        className="w-full px-2 py-1 border rounded-md"
                                                    />
                                                </Td>
                                            ))}
                                            <Td>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={async () => {
                                                            const idIdx = csvHeaders.indexOf("id");
                                                            const id = csvRows[rIdx]?.[idIdx];
                                                            if (!id) return alert("Row missing id");
                                                            const obj: any = {};
                                                            csvHeaders.forEach((h, idx) => {
                                                                if (h !== "id") {
                                                                    // parse JSON-ish values if needed
                                                                    const raw = csvRows[rIdx]?.[idx] ?? "";
                                                                    try {
                                                                        obj[h] = JSON.parse(raw);
                                                                    } catch {
                                                                        obj[h] = raw;
                                                                    }
                                                                }
                                                            });
                                                            try {
                                                                await updateProduct(id, obj);
                                                                alert("Saved");
                                                            } catch (e: any) {
                                                                alert(e?.message || "Failed to save row");
                                                            }
                                                        }}
                                                        className="px-3 py-1 rounded-full border text-xs hover:bg-black hover:text-white"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const idIdx = csvHeaders.indexOf("id");
                                                            const id = csvRows[rIdx]?.[idIdx];
                                                            if (!id) return alert("Row missing id");
                                                            deleteProduct(id).catch((e) => alert(e.message));
                                                        }}
                                                        className="px-3 py-1 rounded-full border text-xs text-red-600 hover:bg-red-600 hover:text-white"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </Td>
                                        </tr>
                                    ))}
                                    {!csvRows.length && (
                                        <tr>
                                            <Td className="text-gray-500" >
                                                No products.
                                            </Td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-4 border-t flex items-center justify-end">
                            <button
                                onClick={() =>
                                    setCsvRows((old) => [...old, new Array(csvHeaders.length).fill("")])
                                }
                                className="px-4 py-2 rounded-full border text-sm hover:bg-black hover:text-white transition"
                            >
                                + Add Row
                            </button>
                        </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                        Tip: keep <code>id</code> stable so updates merge.
                    </p>
                </section>
            )}

            {/* ORDERS */}
            {tab === "orders" && (
                <section className="max-w-6xl mx-auto px-4 md:px-6 pb-12">
                    <div className="rounded-2xl border border-gray-200 overflow-hidden">
                        <header className="px-5 py-3 border-b text-sm font-semibold">Orders</header>
                        <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <Th>Order ID</Th>
                                        <Th>Customer</Th>
                                        <Th>Email</Th>
                                        <Th>Total</Th>
                                        <Th>Status</Th>
                                        <Th>Placed</Th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {orders.map((o: any) => (
                                        <tr key={o.id} className="hover:bg-gray-50">
                                            <Td className="font-mono">
                                                <a href={`/order/${o.id}`} className="underline decoration-dotted hover:decoration-solid">
                                                    {o.id}
                                                </a>
                                            </Td>
                                            <Td>{o.customer?.name || "—"}</Td>
                                            <Td className="break-all">{o.customer?.email || "—"}</Td>
                                            <Td>
                                                ₹ {Number(o?.amounts?.total || 0).toLocaleString("en-IN")}
                                            </Td>
                                            <Td>{o.status || "—"}</Td>
                                            <Td>
                                                {o.createdAt?.toDate
                                                    ? o.createdAt.toDate().toLocaleString()
                                                    : (o.placedAt || "—")}
                                            </Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}

            {/* USERS */}
            {tab === "users" && (
                <section className="max-w-6xl mx-auto px-4 md:px-6 pb-16">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="border rounded-2xl p-4">
                            <div className="font-semibold mb-2">Users</div>
                            <ul className="divide-y">
                                {users.map((u) => (
                                    <li key={u.id} className="py-2 flex items-center justify-between">
                                        <div>
                                            <div className="text-sm font-medium">
                                                {u.name || u.email || u.id}
                                            </div>
                                            <div className="text-xs text-gray-500">{u.email || ""}</div>
                                        </div>
                                        <button
                                            onClick={() => openUser(u.id)}
                                            className="text-xs px-3 py-1 rounded-full border hover:bg-black hover:text-white"
                                        >
                                            Open
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="border rounded-2xl p-4">
                            <div className="font-semibold mb-2">User detail</div>
                            {!selectedUser ? (
                                <div className="text-sm text-gray-500">Select a user…</div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="text-sm">
                                        <div className="font-medium">
                                            {selectedUser.user.name || selectedUser.user.email || selectedUser.user.id}
                                        </div>
                                        <div className="text-gray-600">{selectedUser.user.email}</div>
                                    </div>
                                    <div>
                                        <div className="text-xs text-gray-500 mb-1">Orders</div>
                                        <ul className="divide-y max-h-80 overflow-auto">
                                            {selectedUser.orders.map((o: any) => (
                                                <li key={o.id} className="py-2">
                                                    <div className="text-xs text-gray-500">
                                                        {o.createdAt?.toDate?.()?.toLocaleString?.() || "—"}
                                                    </div>
                                                    <div className="text-sm">
                                                        {o.amounts?.total} {o.amounts?.currency || "INR"} · {o.status || "created"} ·
                                                        <a href={`/order/${o.id}`} className="underline decoration-dotted hover:decoration-solid ml-1 font-mono">
                                                            {o.id}
                                                        </a>
                                                        <a href={`/order/${o.id}`} className="ml-2 text-xs text-blue-600 underline">Open</a>
                                                    </div>
                                                </li>

                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
}

// ---- Simple presentational helpers ----
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
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <td className={clsx("px-4 py-2 align-top", className)}>{children}</td>;
}
