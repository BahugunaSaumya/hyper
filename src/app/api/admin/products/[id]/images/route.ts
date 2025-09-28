// src/app/api/admin/products/[id]/images/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "../../../_lib/auth";
import fs from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

// Server paths centralized
const ASSETS_BASE_FS = ["public", "assets", "models"]; // /public/assets/models
const PRODUCT_DIR_NAME = "products";                    // .../products/<slug>

// ---------- POST: upload ----------
// fields: file (image/*), slug (string), index ("1" default)
// saves to: /public/assets/models/products/<slug>/<index>.jpg
// returns:  /assets/models/products/<slug>/<index>.jpg
export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const form = await req.formData();
    const file = form.get("file");
    const slug = String(form.get("slug") || "").trim();
    const index = String(form.get("index") || "1").trim();

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }
    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());

    const dir = path.join(process.cwd(), ...ASSETS_BASE_FS, PRODUCT_DIR_NAME, slug);
    await fs.mkdir(dir, { recursive: true });

    const outPath = path.join(dir, `${index}.jpg`);
    await fs.writeFile(outPath, buf);

    const webPath = `/assets/models/${PRODUCT_DIR_NAME}/${encodeURIComponent(slug)}/${index}.jpg`;
    return NextResponse.json({ ok: true, path: webPath }, { status: 200 });
  } catch (e: any) {
    console.error("[id/images POST] error:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}

// ---------- GET: list images for slug ----------
// query: ?slug=<slug>
// lists from:
//   /public/assets/models/<slug>
//   /public/assets/models/products/<slug>
// returns: { files: string[] } (web paths start with "/")
export async function GET(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const slug = String(searchParams.get("slug") || "").trim();
    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const roots = [
      path.join(process.cwd(), ...ASSETS_BASE_FS, slug),
      path.join(process.cwd(), ...ASSETS_BASE_FS, PRODUCT_DIR_NAME, slug),
    ];

    const files: string[] = [];
    for (const root of roots) {
      try {
        const items = await fs.readdir(root, { withFileTypes: true });
        for (const it of items) {
          if (it.isFile()) {
            const inProducts = root.includes(path.sep + PRODUCT_DIR_NAME + path.sep);
            const web = inProducts
              ? `/assets/models/${PRODUCT_DIR_NAME}/${encodeURIComponent(slug)}/${it.name}`
              : `/assets/models/${encodeURIComponent(slug)}/${it.name}`;
            files.push(web);
          }
        }
      } catch {
        // folder might not exist; ignore
      }
    }

    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));
    return NextResponse.json({ files }, { status: 200 });
  } catch (e: any) {
    console.error("[id/images GET] error:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message || "Failed to list images" }, { status: 500 });
  }
}

// ---------- PATCH: rename an image ----------
// body: { slug: string, from: string (web path), to: string (web path) }
// only allows renames within the same slug folder under /assets/models/products/<slug>
export async function PATCH(req: NextRequest) {
  const unauthorized = await requireAdmin(req);
  if (unauthorized) return unauthorized;

  try {
    const { slug, from, to } = await req.json();
    if (!slug || !from || !to) {
      return NextResponse.json({ error: "Missing slug/from/to" }, { status: 400 });
    }

    // Only allow renaming inside /assets/models/products/<slug> to keep paths predictable
    const prefix = `/assets/models/${PRODUCT_DIR_NAME}/${encodeURIComponent(slug)}/`;
    if (!from.startsWith(prefix) || !to.startsWith(prefix)) {
      return NextResponse.json({ error: "Rename must stay within the slug folder" }, { status: 400 });
    }

    // Map web paths -> fs paths
    const fromName = decodeURIComponent(from.replace(prefix, ""));
    const toName = decodeURIComponent(to.replace(prefix, ""));
    const dir = path.join(process.cwd(), ...ASSETS_BASE_FS, PRODUCT_DIR_NAME, slug);
    const fromFs = path.join(dir, fromName);
    const toFs = path.join(dir, toName);

    // Ensure source exists
    try { await fs.stat(fromFs); } catch { return NextResponse.json({ error: "Source file not found" }, { status: 404 }); }

    await fs.rename(fromFs, toFs);

    return NextResponse.json({ ok: true, path: to }, { status: 200 });
  } catch (e: any) {
    console.error("[id/images PATCH] error:", e?.stack || e?.message || e);
    return NextResponse.json({ error: e?.message || "Rename failed" }, { status: 500 });
  }
}
