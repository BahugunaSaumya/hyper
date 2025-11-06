"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_EMAILS, ADMIN_UIDS } from "@/config/admin";

// ---- Centralized paths (edit these to move folders) ----
const ASSETS_BASE = "/assets/models";
const PRODUCT_IMAGES_BASE = `${ASSETS_BASE}/products`;
const FALLBACK_IMAGE = "/assets/video-preview.jpg";

type Dict = Record<string, any>;
type Product = {
  id: string;
  title?: string;
  name?: string;
  slug?: string;
  image?: string;
  price?: any;
  sizes?: string[] | string;
  new_launch: boolean,
  categories: string[],
} & Dict;

type Editable = Partial<Omit<Product, "id">> & { id?: string };

async function j(res: Response) {
  try { return await res.json(); } catch { return null; }
}
const toStr = (v: any) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));

function normalizeImagePath(p?: string | null): string | null {
  if (!p) return null;
  if (/^https?:\/\//i.test(p)) return p;           // absolute URL already
  const cleaned = p.replace(/^\.?\//, "");         // strip "./" or leading "/"
  return `/${cleaned}`;
}
function parseSizesInput(v: string | string[] | undefined): string[] {
  if (Array.isArray(v)) return v.map(s => String(s).trim()).filter(Boolean);
  const raw = String(v ?? "").trim();
  if (!raw) return [];
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

export default function AdminProductsGridPage() {
  const { user } = useAuth() as any;

  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);

  // modal state
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [draft, setDraft] = useState<Editable>({});
  const [editId, setEditId] = useState<string | null>(null);

  // image state (add/edit)
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // slug images listing
  const [files, setFiles] = useState<string[] | null>(null);
  const [listing, setListing] = useState(false);
  const [renaming, setRenaming] = useState<Record<string, string>>({}); // file -> new name

  const isAdmin = useMemo(() => {
    if (!user) return false;
    return (
      (user.email && ADMIN_EMAILS.includes(user.email)) ||
      ADMIN_UIDS.includes(user.uid)
    );
  }, [user]);

  // --- Safe, zero-error header hider (won't block auth effect) ---
  useEffect(() => {
    try {
      document.body.setAttribute("data-hide-global-header", "1");
    } catch {}
    return () => {
      try { document.body.removeAttribute("data-hide-global-header"); } catch {}
    };
  }, []);

  // --- Load auth + products ---
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!user || !isAdmin) { if (mounted) setLoading(false); return; }
        const tok = await user.getIdToken(true);
        if (!mounted) return;
        setToken(tok);
        await reload(tok);
      } catch (e: any) {
        console.error("[ProductsGrid] initial load error:", e);
        setErr(e?.message || "Failed to load products");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user, isAdmin]);

  async function reload(tok = token) {
    try {
      const res = await fetch("/api/admin/products", { headers: { authorization: `Bearer ${tok}` } });
      const b = await j(res);
      if (!res.ok) throw new Error(b?.error || "Failed to load products");

      if (Array.isArray(b?.products)) {
        const list: Product[] = b.products.map((p: any) => ({ id: p.id, ...p }));
        setProducts(list);

        const pref = ["id", "title", "name", "slug", "price", "mrp", "presalePrice", "discountedPrice", "image", "sizes"];
        const hs = new Set<string>(pref);
        (b.headers || []).forEach((h: string) => hs.add(h));
        list.forEach((p) => Object.keys(p).forEach((k) => hs.add(k)));
        setHeaders(Array.from(hs));
      } else {
        setProducts([]);
        setHeaders(["id", "title", "price"]);
      }
    } catch (e: any) {
      console.error("[ProductsGrid] reload error:", e);
      setErr(e?.message || "Failed to load products");
      setProducts([]);
    }
  }

  const titleOf = (p: Product) => (p.title || p.name || p.slug || p.id);
  const slugLike = (p: Product | Editable, fallbackId?: string) =>
    String(p.slug || p.title || p.name || fallbackId || "").trim();

  // If product.image is set (from CSV/DB), normalize to absolute.
  // Else fallback to /assets/models/products/<slug>/1.jpg
  const imageOf = (p: Product) =>
    normalizeImagePath(p.image) ||
    `${PRODUCT_IMAGES_BASE}/${encodeURIComponent(slugLike(p, p.id))}/1.jpg`;

  function openAdd() {
    setDraft({
      title: "",
      slug: "",
      price: "",
      mrp: "",
      discountedPrice: "",
      presalePrice: "",
      image: "",
      sizes: [] as string[],
    });
    setPreviewUrl(null);
    setFiles(null);
    setRenaming({});
    if (fileRef.current) fileRef.current.value = "";
    setAddOpen(true);
  }

  function openEdit(p: Product) {
    setEditId(p.id);
    setDraft({
      ...p,
      sizes: Array.isArray(p.sizes) ? p.sizes : parseSizesInput(p.sizes as any),
    });
    setPreviewUrl(null);
    setFiles(null);
    setRenaming({});
    if (fileRef.current) fileRef.current.value = "";
    setEditOpen(true);
    const s = slugLike(p, p.id);
    if (s) listImagesForSlug(s);
  }

  function closeModals() {
    setAddOpen(false);
    setEditOpen(false);
    setDraft({});
    setEditId(null);
    setPreviewUrl(null);
    setFiles(null);
    setRenaming({});
    if (fileRef.current) fileRef.current.value = "";
  }

  function draftSet(k: string, v: any) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  }

  async function uploadImageIfAny(productId: string, slugStr: string) {
    const f = fileRef.current?.files?.[0];
    if (!f) return null;
    const form = new FormData();
    form.append("file", f);
    form.append("slug", slugStr);
    form.append("index", "1"); // save as 1.jpg by default

    const res = await fetch(`/api/admin/products/${encodeURIComponent(productId)}/images`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: form,
    });
    const b = await j(res);
    if (!res.ok) throw new Error(b?.error || "Image upload failed");
    return b?.path as string | null;
  }

  // list images via API
  async function listImagesForSlug(slugStr: string) {
    try {
      if (!slugStr) { setFiles([]); return; }
      setListing(true);
      const res = await fetch(`/api/admin/products/${encodeURIComponent(slugStr)}/images?slug=${encodeURIComponent(slugStr)}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      const b = await j(res);
      if (!res.ok) throw new Error(b?.error || "List failed");
      setFiles(b?.files || []);
      setRenaming({});
    } catch (e: any) {
      setFiles([]);
      alert(e?.message || "Failed to list files");
    } finally {
      setListing(false);
    }
  }

  async function renameImage(slugStr: string, fromWebPath: string, newBaseName: string) {
    if (!newBaseName || !/\.[a-z0-9]+$/i.test(newBaseName)) {
      alert("Please include a file extension, e.g. 2.jpg");
      return;
    }
    const payload = { slug: slugStr, from: fromWebPath, to: `${PRODUCT_IMAGES_BASE}/${encodeURIComponent(slugStr)}/${newBaseName}` };
    const res = await fetch(`/api/admin/products/${encodeURIComponent(slugStr)}/images`, {
      method: "PATCH",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const b = await j(res);
    if (!res.ok) throw new Error(b?.error || "Rename failed");
    await listImagesForSlug(slugStr);
  }

  function sizesDisplayValue(v: string[] | string | undefined): string {
    const arr = Array.isArray(v) ? v : parseSizesInput(v as any);
    return arr.join(", ");
  }

  async function addSave() {
    try {
      const payload = { ...draft, sizes: parseSizesInput(draft.sizes as any) };
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const b = await j(res);
      if (!res.ok) throw new Error(b?.error || "Create failed");
      const newId = b?.id as string;

      const s = slugLike(draft, newId);
      try { await uploadImageIfAny(newId, s); } catch (e) { console.warn("image upload skipped/failed:", e); }

      closeModals();
      await reload();
    } catch (e: any) {
      console.error("[ProductsGrid] addSave error:", e);
      setErr(e?.message || "Create failed");
    }
  }

  async function editSave() {
    if (!editId) return;
    try {
      const { id, ...patch } = draft;
      const payload = { ...patch, sizes: parseSizesInput(patch.sizes as any) };
      const res = await fetch(`/api/admin/products/${encodeURIComponent(editId)}`, {
        method: "PUT",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const b = await j(res);
      if (!res.ok) throw new Error(b?.error || "Update failed");

      const s = slugLike(draft, editId);
      try { await uploadImageIfAny(editId, s); } catch (e) { console.warn("image upload skipped/failed:", e); }

      closeModals();
      await reload();
    } catch (e: any) {
      console.error("[ProductsGrid] editSave error:", e);
      setErr(e?.message || "Update failed");
    }
  }

  async function del(id: string) {
    try {
      if (!confirm("Delete this product?")) return;
      const res = await fetch(`/api/admin/products/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${token}` },
      });
      const b = await j(res);
      if (!res.ok) throw new Error(b?.error || "Delete failed");
      await reload();
    } catch (e: any) {
      console.error("[ProductsGrid] delete error:", e);
      setErr(e?.message || "Delete failed");
    }
  }

  if (!user) return <div className="min-h-[60vh] grid place-items-center text-gray-500">Please log in.</div>;
  if (!isAdmin) return <div className="min-h-[60vh] grid place-items-center text-gray-500">You do not have access to this page.</div>;
  if (loading) return <div className="min-h-[60vh] grid place-items-center text-gray-500">Loading…</div>;

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Local header (only header visible on this page) */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products — Grid</h1>
        <div className="flex gap-2">
          <button className="px-3 py-2 border rounded" onClick={() => reload()}>Refresh</button>
          <button className="px-3 py-2 border rounded bg-black text-white" onClick={openAdd}>+ Add Product</button>
        </div>
      </div>

      {/* Grid */}
      <section>
        {products.length === 0 ? (
          <div className="text-gray-500">No products yet.</div>
        ) : (
          <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((p) => (
              <li key={p.id} className="border rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition">
                <div className="aspect-square bg-gray-50 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageOf(p)}
                    alt={titleOf(p)}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; }}
                  />
                </div>
                <div className="p-3 space-y-2">
                  <div className="font-semibold line-clamp-2">{titleOf(p)}</div>
                  <div className="text-sm text-gray-600 flex items-center justify-between">
                    <span>₹{p.price ?? p.discountedPrice ?? p.mrp ?? "—"}</span>
                    <span className="text-xs text-gray-400">#{p.id}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Sizes: {sizesDisplayValue(p.sizes) || "—"}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button className="px-3 py-1 border rounded" onClick={() => openEdit(p)}>Edit</button>
                    <button className="px-3 py-1 border rounded text-red-600" onClick={() => del(p.id)}>Delete</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Add / Edit Modal */}
      {(addOpen || editOpen) && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={closeModals} />
          <div className="absolute inset-x-0 top-12 mx-auto w-[95%] max-w-3xl bg-white rounded-2xl shadow-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b">
              <div className="font-semibold">{addOpen ? "Add Product" : "Edit Product"}</div>
              <button onClick={closeModals} className="text-xl leading-none">×</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4 pt-4">
              {/* Left: fields */}
              <div className="space-y-3">
                <Field label="Title / Name">
                  <input className="w-full border rounded px-3 py-2" value={toStr(draft.title || draft.name)} onChange={(e) => draftSet("title", e.target.value)} />
                </Field>
                <Field label="Slug">
                  <input className="w-full border rounded px-3 py-2" value={toStr(draft.slug)} onChange={(e) => draftSet("slug", e.target.value)} />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Price">
                    <input className="w-full border rounded px-3 py-2" value={toStr(draft.price)} onChange={(e) => draftSet("price", e.target.value)} />
                  </Field>
                  <Field label="MRP">
                    <input className="w-full border rounded px-3 py-2" value={toStr(draft.mrp)} onChange={(e) => draftSet("mrp", e.target.value)} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Presale Price">
                    <input className="w-full border rounded px-3 py-2" value={toStr(draft.presalePrice)} onChange={(e) => draftSet("presalePrice", e.target.value)} />
                  </Field>
                  <Field label="Discounted Price">
                    <input className="w-full border rounded px-3 py-2" value={toStr(draft.discountedPrice)} onChange={(e) => draftSet("discountedPrice", e.target.value)} />
                  </Field>
                </div>

                <Field label="Image URL (from CSV or manual)">
                  <input className="w-full border rounded px-3 py-2" value={toStr(draft.image)} onChange={(e) => draftSet("image", e.target.value)} />
                </Field>

                <Field label="Sizes (comma separated: S, M, L, XL)">
                  <input
                    className="w-full border rounded px-3 py-2"
                    placeholder="S, M, L, XL"
                    value={sizesDisplayValue(draft.sizes)}
                    onChange={(e) => draftSet("sizes", e.target.value)}
                  />
                </Field>
                <Field label="New Launch (Yes/No)">
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={draft.new_launch ? "1" : "0"}
                    onChange={(e) => draftSet("new_launch", e.target.value === "1")}
                  >
                    <option value="0">No</option>
                    <option value="1">Yes</option>
                  </select>
                </Field>

                {/* <Field label="Categories (comma separated)">
                  <input
                    className="w-full border rounded px-3 py-2"
                    placeholder="e.g. T-shirts, Men, Summer"
                    value={Array.isArray(draft.category) ? draft.category.join(", ") : (draft.category || "")}
                    onChange={(e) =>
                      draftSet("categories", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
                    }
                  />
                </Field> */}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 border rounded text-xs"
                    onClick={() => listImagesForSlug(slugLike(draft, editId || "new"))}
                    disabled={listing}
                  >
                    {listing ? "Listing…" : "View images in slug folder"}
                  </button>
                  {files && <span className="text-xs text-gray-500">{files.length} files</span>}
                </div>

                {files && files.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs text-gray-600">Folder images (click a thumbnail to set as main image):</div>
                    <ul className="grid grid-cols-3 gap-3">
                      {files.map((f) => {
                        const fname = decodeURIComponent(f.split("/").pop() || "");
                        return (
                          <li key={f} className="border rounded-lg overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={f}
                              alt={fname}
                              className="w-full aspect-square object-cover cursor-pointer"
                              onClick={() => draftSet("image", f)}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; }}
                              title="Click to use as main image"
                            />
                            <div className="p-2 space-y-1">
                              <div className="text-[11px] text-gray-600 truncate">{fname}</div>
                              <div className="flex items-center gap-1">
                                <input
                                  className="w-full border rounded px-2 py-1 text-xs"
                                  placeholder="rename e.g. 2.jpg"
                                  value={renaming[f] ?? ""}
                                  onChange={(e) => setRenaming((r) => ({ ...r, [f]: e.target.value }))}
                                />
                                <button
                                  className="px-2 py-1 border rounded text-[11px]"
                                  onClick={async () => {
                                    const slugStr = slugLike(draft, editId || "new");
                                    try { await renameImage(slugStr, f, (renaming[f] || "").trim()); }
                                    catch (e: any) { alert(e?.message || "Rename failed"); }
                                  }}
                                >
                                  Rename
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right: image pick/preview */}
              <div className="space-y-3">
                <Field label="Upload New Image (optional)">
                  <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} />
                </Field>
                <div className="border rounded-lg overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      previewUrl ||
                      (normalizeImagePath(draft.image) ||
                        `${PRODUCT_IMAGES_BASE}/${encodeURIComponent(slugLike(draft, editId || "new"))}/1.jpg`)
                    }
                    alt="Preview"
                    className="w-full aspect-square object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = FALLBACK_IMAGE; }}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Fallback path if image is empty: <code>{PRODUCT_IMAGES_BASE}/&lt;slug&gt;/1.jpg</code>
                </p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 border-t mt-4">
              <button className="px-4 py-2 border rounded" onClick={closeModals}>Cancel</button>
              {addOpen ? (
                <button className="px-4 py-2 border rounded bg-black text-white" onClick={addSave}>Create</button>
              ) : (
                <button className="px-4 py-2 border rounded bg-black text-white" onClick={editSave}>Save</button>
              )}
            </div>
          </div>
        </div>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      {/* CSS that hides any global header/nav while this page is active */}
      <style jsx global>{`
        body[data-hide-global-header="1"] header,
        body[data-hide-global-header="1"] .site-header,
        body[data-hide-global-header="1"] [data-main-header],
        body[data-hide-global-header="1"] [data-site-header],
        body[data-hide-global-header="1"] #site-header,
        body[data-hide-global-header="1"] nav.sticky,
        body[data-hide-global-header="1"] nav.navbar,
        body[data-hide-global-header="1"] .navbar,
        body[data-hide-global-header="1"] .top-nav,
        body[data-hide-global-header="1"] [class*="SiteHeader"],
        body[data-hide-global-header="1"] [class*="Navbar"],
        body[data-hide-global-header="1"] .fixed.top-0,
        body[data-hide-global-header="1"] .sticky.top-0 {
          display: none !important;
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-gray-600">{label}</span>
      {children}
    </label>
  );
}
