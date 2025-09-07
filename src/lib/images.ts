// src/lib/images.ts
const abs = (p?: string) => (!p ? "" : p.startsWith("/") ? p : `/${p}`);
/** URL-safe (keeps spaces by encoding them) */
const safe = (s?: string | null) =>
  s && s.trim() ? encodeURI(decodeURI(String(s))) : "";

/** Prefer folder from CSV image if it already has one */
export function deriveFolderFromCsvImage(img: string | undefined, fallbackFolder: string) {
  const s = safe(img);
  if (!s) return fallbackFolder;
  // /assets/models/products/<folder>/
  const m = s.match(/^\/?assets\/models\/products\/([^/]+)\//i);
  return m ? decodeURI(m[1]) : fallbackFolder;
}

// then in your existing helpers, make sure returns are wrapped with abs()

export function normalizeCsvImage(img?: string, dir: string = ""): string {
  if (!img) return "";
  const s = decodeURI(String(img).trim());

  // already absolute and inside our products folder
  if (new RegExp(`^/assets/models/products/${dir}/`, "i").test(s)) return s;

  // bare "1.jpg"
  const m1 = s.match(/^(\d+)\.(jpe?g)$/i);
  if (m1) return abs(`/assets/models/products/${dir}/${m1[1]}.${m1[2].toLowerCase()}`);

  // "/assets/models/products/1.jpg" (no folder)
  const m2 = s.match(/^\/?assets\/models\/products\/(\d+)\.(jpe?g)$/i);
  if (m2) return abs(`/assets/models/products/${dir}/${m2[1]}.${m2[2].toLowerCase()}`);

  // if it looks like "assets/..." (no leading slash) make it absolute
  if (/^assets\//i.test(s)) return abs(s);

  // external or already absolute (keep)
  return abs(s);
}

export function galleryCandidatesExactFolder(dir: string): string[] {
  const base = abs(`/assets/models/products/${dir}`);
  const names = ["1", "2", "3", "4", "5"];
  return names.map(n => abs(`${base}/${n}.jpg`));
}

export function coverFor(p: ProductModel): string {
  const dir = (p.slug || p.title || "").trim();
  const normalized = normalizeCsvImage(p.image, dir);
  if (normalized) return abs(normalized);
  const cands = galleryCandidatesExactFolder(dir);
  return abs(cands[0]);
}
