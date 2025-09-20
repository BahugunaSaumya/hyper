// src/app/admin/products/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_EMAILS, ADMIN_UIDS } from "@/config/admin";

type Dict = Record<string, any>;
type Product = { id: string } & Dict;

async function j(res: Response) {
  try { return await res.json(); } catch { return null; }
}

export default function AdminProductsPage() {
  const { user } = useAuth() as any;

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvMode, setCsvMode] = useState(false);

  // Inline add form
  const [addOpen, setAddOpen] = useState(true);
  const [addDraft, setAddDraft] = useState<Dict>({ name: "", price: "", slug: "" });
  const addKeyRef = useRef<HTMLInputElement>(null);
  const addValRef = useRef<HTMLInputElement>(null);

  // Per-row edit state
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Dict>({});

  // Debug UI state
  const [showDebug, setShowDebug] = useState(false);
  const [lastFetchInfo, setLastFetchInfo] = useState<any>(null);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const ok =
      (user.email && ADMIN_EMAILS.includes(user.email)) ||
      ADMIN_UIDS.includes(user.uid);
    console.log("[ProductsPage] isAdmin?", ok, {
      userEmail: user?.email,
      userUid: user?.uid,
    });
    return ok;
  }, [user]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log("[ProductsPage] mount", { hasUser: !!user, isAdmin });
        if (!user || !isAdmin) { setLoading(false); return; }
        const tok = await user.getIdToken(true);
        if (!mounted) return;
        console.log("[ProductsPage] got token", { length: tok?.length ?? 0 });
        setToken(tok);
        await reload(tok);
      } catch (e: any) {
        console.error("[ProductsPage] initial load error:", e);
        setErr(e?.message || "Failed to load products");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user, isAdmin]);

  async function reload(tok = token) {
    console.log("[ProductsPage] reload() start");
    try {
      const res = await fetch("/api/admin/products", { headers: { authorization: `Bearer ${tok}` } });
      console.log("[ProductsPage] /api/admin/products status", res.status);
      const b = await j(res);
      setLastFetchInfo({
        status: res.status,
        ok: res.ok,
        payloadPreview: safePreview(b),
      });

      if (!res.ok) {
        console.error("[ProductsPage] products GET failed:", b);
        throw new Error(b?.error || "Failed to load products");
      }

      // A) Firestore mode
      if (Array.isArray(b?.products)) {
        console.log("[ProductsPage] Detected Firestore mode", {
          count: b.products.length,
          headersCount: (b.headers || []).length,
        });

        setCsvMode(false);
        const list: Product[] = b.products.map((p: any) => ({ id: p.id, ...p }));
        setProducts(list);

        const pref = ["id", "name", "title", "slug", "price", "mrp", "presalePrice", "discountedPrice"];
        const hs = new Set<string>(pref);
        (b.headers || []).forEach((h: string) => hs.add(h));
        list.forEach((p) => Object.keys(p).forEach((k) => hs.add(k)));
        const finalHeaders = Array.from(hs);
        console.log("[ProductsPage] final headers (FS):", finalHeaders);
        setHeaders(finalHeaders);
        return;
      }

      // B) CSV mode
      if (Array.isArray(b?.headers) && Array.isArray(b?.rows)) {
        console.log("[ProductsPage] Detected CSV mode", {
          rows: b.rows.length,
          headers: b.headers,
        });

        setCsvMode(true);
        const h: string[] = b.headers;
        const rows: any[][] = b.rows;

        const mapped: Product[] = rows.map((row: any[], i: number) => {
          const obj: any = {};
          h.forEach((key, idx) => { obj[key] = row?.[idx]; });
          obj.id = obj.id || obj.slug || obj.sku || String(i);
          return obj as Product;
        });

        console.log("[ProductsPage] mapped CSV rows → objects", { count: mapped.length });

        setProducts(mapped);

        const pref = ["id", "name", "title", "slug", "price", "mrp", "presalePrice", "discountedPrice"];
        const hs = new Set<string>(pref);
        h.forEach((x) => hs.add(x));
        mapped.forEach((p) => Object.keys(p).forEach((k) => hs.add(k)));
        const finalHeaders = Array.from(hs);
        console.log("[ProductsPage] final headers (CSV):", finalHeaders);
        setHeaders(finalHeaders);
        return;
      }

      // Fallback
      console.warn("[ProductsPage] Unexpected payload shape", b);
      setCsvMode(false);
      setProducts([]);
      setHeaders(["id", "name", "price"]);
    } catch (e: any) {
      console.error("[ProductsPage] reload() error:", e);
      setErr(e?.message || "Failed to load products");
      setProducts([]);
      setHeaders(["id", "name", "price"]);
    }
  }

  // ---------- Add ----------
  function addSet(k: string, v: any) { setAddDraft((d) => ({ ...d, [k]: v })); }
  function addField() {
    const k = addKeyRef.current?.value?.trim();
    if (!k) return;
    const v = addValRef.current?.value ?? "";
    setAddDraft((d) => (k in d ? d : { ...d, [k]: v }));
    if (addKeyRef.current) addKeyRef.current.value = "";
    if (addValRef.current) addValRef.current.value = "";
  }
  function removeAddField(k: string) {
    setAddDraft((d) => { const n = { ...d }; delete n[k]; return n; });
  }
  async function addSave() {
    console.log("[ProductsPage] addSave()", { body: addDraft });
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(addDraft),
      });
      const b = await j(res);
      console.log("[ProductsPage] addSave() result", { status: res.status, ok: res.ok, payload: b });
      if (!res.ok) throw new Error(b?.error || "Create failed");
      setAddDraft({ name: "", price: "", slug: "" });
      await reload();
    } catch (e: any) {
      console.error("[ProductsPage] addSave() error:", e);
      setErr(e?.message || "Create failed");
    }
  }

  // ---------- Edit ----------
  function startEdit(p: Product) { console.log("[ProductsPage] startEdit", { id: p.id }); setEditRowId(p.id); setEditDraft({ ...p }); }
  function cancelEdit() { console.log("[ProductsPage] cancelEdit"); setEditRowId(null); setEditDraft({}); }
  function editSet(k: string, v: any) { setEditDraft((d) => ({ ...d, [k]: v })); }
  async function editSave() {
    if (!editRowId) return;
    const { id, ...patch } = editDraft;
    console.log("[ProductsPage] editSave()", { id: editRowId, patch });
    try {
      const res = await fetch(`/api/admin/products/${editRowId}`, {
        method: "PUT",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      const b = await j(res);
      console.log("[ProductsPage] editSave() result", { status: res.status, ok: res.ok, payload: b });
      if (!res.ok) throw new Error(b?.error || "Update failed");
      setEditRowId(null);
      setEditDraft({});
      await reload();
    } catch (e: any) {
      console.error("[ProductsPage] editSave() error:", e);
      setErr(e?.message || "Update failed");
    }
  }

  // ---------- Delete ----------
  async function del(id: string) {
    console.log("[ProductsPage] del()", { id });
    try {
      if (!confirm("Delete this product?")) return;
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
      const b = await j(res);
      console.log("[ProductsPage] del() result", { status: res.status, ok: res.ok, payload: b });
      if (!res.ok) throw new Error(b?.error || "Delete failed");
      await reload();
    } catch (e: any) {
      console.error("[ProductsPage] del() error:", e);
      setErr(e?.message || "Delete failed");
    }
  }

  // Optional if you have /api/admin/migrate-csv
  async function migrateCsv() {
    console.log("[ProductsPage] migrateCsv()");
    try {
      const res = await fetch("/api/admin/migrate-csv", { method: "POST", headers: { authorization: `Bearer ${token}` } });
      const b = await j(res);
      console.log("[ProductsPage] migrateCsv() result", { status: res.status, ok: res.ok, payload: b });
      if (!res.ok) throw new Error(b?.error || "Migration failed");
      alert(`Migrated ${b?.count ?? 0} products from CSV to Firestore`);
      await reload();
    } catch (e: any) {
      console.error("[ProductsPage] migrateCsv() error:", e);
      setErr(e?.message || "Migration failed");
    }
  }

  if (!user) return <div className="min-h-[60vh] grid place-items-center text-gray-500">Please log in.</div>;
  if (!isAdmin) return <div className="min-h-[60vh] grid place-items-center text-gray-500">You do not have access to this page.</div>;
  if (loading) return <div className="min-h-[60vh] grid place-items-center text-gray-500">Loading…</div>;

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <div className="flex gap-2">
          <button className="px-3 py-2 border rounded" onClick={() => setShowDebug((s) => !s)}>
            {showDebug ? "Hide debug" : "Show debug"}
          </button>
          {csvMode && (
            <button className="px-3 py-2 border rounded" onClick={migrateCsv}>
              Migrate CSV → Firestore
            </button>
          )}
          <button className="px-3 py-2 border rounded" onClick={() => reload()}>Refresh</button>
        </div>
      </div>

      {showDebug && (
        <pre className="text-xs bg-gray-50 border rounded p-3 overflow-auto max-h-72">
{JSON.stringify({
  userEmail: user?.email,
  userUid: user?.uid,
  isAdmin,
  tokenLength: token?.length ?? 0,
  csvMode,
  productsCount: products.length,
  headers,
  err,
  lastFetchInfo,
}, null, 2)}
        </pre>
      )}

      {csvMode && (
        <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
          CSV mode detected from <code>/api/admin/products</code>. Values are mapped from
          <code> headers/rows</code>. Create/Edit/Delete write to Firestore. Use “Migrate CSV → Firestore”
          so they persist & load from Firestore on next reload.
        </div>
      )}

      {/* ADD PRODUCT */}
      <section className="rounded-2xl border">
        <header className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Add Product</div>
          <button className="text-sm underline" onClick={() => setAddOpen((s) => !s)}>{addOpen ? "Hide" : "Show"}</button>
        </header>
        {addOpen && (
          <div className="p-4 space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <LabeledInput label="id (optional, Firestore doc id)" value={addDraft.id || ""} onChange={(v) => addSet("id", v)} />
              <LabeledInput label="name / title" value={addDraft.name || addDraft.title || ""} onChange={(v) => addSet("name", v)} />
              <LabeledInput label="slug" value={addDraft.slug || ""} onChange={(v) => addSet("slug", v)} />
              <LabeledInput label="price" value={toStr(addDraft.price)} onChange={(v) => addSet("price", v)} />
              <LabeledInput label="mrp" value={toStr(addDraft.mrp)} onChange={(v) => addSet("mrp", v)} />
              <LabeledInput label="presalePrice" value={toStr(addDraft.presalePrice)} onChange={(v) => addSet("presalePrice", v)} />
              <LabeledInput label="discountedPrice" value={toStr(addDraft.discountedPrice)} onChange={(v) => addSet("discountedPrice", v)} />
            </div>

            {Object.entries(addDraft)
              .filter(([k]) => !["id","name","title","slug","price","mrp","presalePrice","discountedPrice"].includes(k))
              .map(([k, v]) => (
                <div key={k} className="grid grid-cols-12 gap-2 items-center">
                  <label className="col-span-4 text-sm">{k}</label>
                  <input className="col-span-7 border rounded px-3 py-2" value={toStr(v)} onChange={(e) => addSet(k, e.target.value)} />
                  <button className="col-span-1 text-red-600" onClick={() => removeAddField(k)} title="remove">×</button>
                </div>
              ))}

            <div className="grid grid-cols-12 gap-2 items-center pt-2 border-t">
              <input ref={addKeyRef} className="col-span-5 border rounded px-3 py-2" placeholder="new key (e.g. images)" />
              <input ref={addValRef} className="col-span-6 border rounded px-3 py-2" placeholder="value (string or JSON)" />
              <button className="col-span-1 border rounded px-2 py-2" onClick={addField}>+</button>
            </div>

            <div className="flex gap-2">
              <button className="px-4 py-2 border rounded" onClick={addSave}>Create</button>
              <button className="px-4 py-2 border rounded" onClick={() => setAddDraft({ name: "", price: "", slug: "" })}>Reset</button>
            </div>
          </div>
        )}
      </section>

      {/* TABLE */}
      <div className="rounded-2xl border overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((h) => (
                <th key={h} className="text-left px-3 py-2 font-semibold whitespace-nowrap">{h}</th>
              ))}
              <th className="text-left px-3 py-2 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => (
              <tr key={p.id}>
                {headers.map((h) => (
                  <td key={h} className="px-3 py-2 align-top">
                    {editRowId === p.id ? (
                      <input
                        className="w-full border rounded px-2 py-1"
                        value={toStr(editDraft[h])}
                        onChange={(e) => editSet(h, e.target.value)}
                        disabled={h === "id"}
                      />
                    ) : (
                      renderValue(p[h])
                    )}
                  </td>
                ))}
                <td className="px-3 py-2">
                  {editRowId === p.id ? (
                    <div className="flex gap-2">
                      <button className="px-3 py-1 border rounded" onClick={editSave}>Save</button>
                      <button className="px-3 py-1 border rounded" onClick={cancelEdit}>Cancel</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button className="px-3 py-1 border rounded" onClick={() => startEdit(p)}>Edit</button>
                      <button className="px-3 py-1 border rounded text-red-600" onClick={() => del(p.id)}>Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {!products.length && (
              <tr><td className="px-3 py-4 text-gray-500" colSpan={headers.length + 1}>No products.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}
    </main>
  );
}

function LabeledInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-600">{label}</span>
      <input className="border rounded px-3 py-2" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function renderValue(v: any) {
  if (v == null) return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
function toStr(v: any) {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
function safePreview(payload: any) {
  try {
    if (payload == null) return payload;
    const s = JSON.stringify(payload);
    return s.length > 2000 ? s.slice(0, 2000) + " …(truncated)" : payload;
  } catch { return "[unserializable payload]"; }
}
