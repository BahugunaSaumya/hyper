// src/app/api/reviews/upload/route.ts
import { NextRequest, NextResponse } from "next/server";

// ✅ We need Node runtime for fs/Buffer and broader compat with File
export const runtime = "nodejs";
// (optional but helpful when writing to disk in dev)
export const dynamic = "force-dynamic";

const MAX_FILES = 6;
const MAX_BYTES_PER_FILE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

type Uploaded = { url: string; key?: string };

export async function POST(req: NextRequest) {
  try {
    // ✅ (Optional) auth: Bearer <token>
    const auth = req.headers.get("authorization") || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!bearer) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // If you use Firebase Admin, you can verify the token here:
    // await admin.auth().verifyIdToken(bearer);

    const form = await req.formData();

    // ✅ Keys must match your client ReviewForm
    const productId = (form.get("productId") || "") as string;
    const fileItems = form.getAll("files");

    // Filter only real File objects (formData can also contain strings)
    const files = fileItems.filter((v): v is File => typeof v === "object" && "arrayBuffer" in v);

    if (!productId) {
      return NextResponse.json({ error: "Missing productId" }, { status: 400 });
    }
    if (!files.length) {
      return NextResponse.json({ error: "No image files" }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Max ${MAX_FILES} images` }, { status: 400 });
    }

    // Basic validation
    for (const f of files) {
      // Some browsers send empty type for HEIC; allow if filename suggests image, or normalize downstream
      const mime = (f.type || "").toLowerCase();
      const name = (f as any).name || "upload";
      if (mime && !ALLOWED_MIME.has(mime)) {
        // You can convert HEIC -> JPEG server side if you want; for now reject
        return NextResponse.json({ error: `Unsupported type for ${name}` }, { status: 400 });
      }
      if (f.size > MAX_BYTES_PER_FILE) {
        return NextResponse.json({ error: `${name} is larger than 5MB` }, { status: 400 });
      }
    }

    // ---------- Choose your upload backend ----------
    // A) Local dev save to /public/uploads (easy to test)
    const uploads = await saveLocal(files);

    // B) S3 / GCS / Cloudinary etc. (uncomment and implement)
    // const uploads = await saveToS3(files, productId);

    const urls = uploads.map((u) => u.url);
    return NextResponse.json({ ok: true, urls }, { status: 200 });
  } catch (err: any) {
    console.error("[/api/reviews/upload] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/** ------ Local filesystem upload (dev only) ------ */
import { promises as fs } from "fs";
import path from "path";
async function saveLocal(files: File[]): Promise<Uploaded[]> {
  // Ensure folder exists
  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });

  const now = Date.now();
  const results: Uploaded[] = [];

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const ext = inferExt(f);
    const base = sanitizeFilename((f as any).name || `image-${i}${ext}`);
    const fname = `${now}-${i}-${base}`;
    const buf = Buffer.from(await f.arrayBuffer());
    const target = path.join(dir, fname);
    await fs.writeFile(target, buf);

    // Public URL served by Next static: /uploads/<file>
    results.push({ url: `/uploads/${fname}` });
  }
  return results;
}

function inferExt(file: File): string {
  const name = ((file as any).name || "").toLowerCase();
  const byName = path.extname(name);
  if (byName) return byName;
  const t = (file.type || "").toLowerCase();
  if (t.includes("jpeg")) return ".jpg";
  if (t.includes("png")) return ".png";
  if (t.includes("webp")) return ".webp";
  if (t.includes("gif")) return ".gif";
  if (t.includes("avif")) return ".avif";
  return "";
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
