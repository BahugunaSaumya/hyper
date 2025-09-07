export type Product = {
  title: string;
  desc: string;
  MRP: string;
  "discounted price": string;
  "discount percentage": string;
  "presale price": string;
  "presale price percentage": string;
  category: string;
  sizes: string;
  image: string;
  rating?: string;
};

export type ProductModel = {
  title: string;
  desc: string;
  mrp: string;
  discountedPrice: string;
  discountPct: string;
  presalePrice: string;
  presalePct: string;
  category: string;
  sizes: string[];
  image: string;
  rating: number | null;
};

export function parseCSV(text: string): Product[] {
  const rows: string[][] = [];
  let i = 0, field = "", row: string[] = [], inQuotes = false;
  const pushField = () => { row.push(field); field = ""; };
  const pushRow = () => { rows.push(row); row = []; };
  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') { if (text[i+1] === '"') { field += '"'; i+=2; continue; } inQuotes = false; i++; continue; }
      field += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ",") { pushField(); i++; continue; }
    if (c === "\r") { i++; continue; }
    if (c === "\n") { pushField(); pushRow(); i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { pushField(); pushRow(); }
  const header = rows.shift() || [];
  return rows
    .filter(r => r.some(v => (v || "").trim().length))
    .map(r => Object.fromEntries(header.map((h, idx) => [h.trim(), (r[idx] || "").trim()])) as Product);
}

export function mapProducts(raw: Product[]): ProductModel[] {
  return raw.map(r => ({
    title: r.title || "",
    desc: r.desc || "",
    mrp: r["MRP"] || "",
    discountedPrice: r["discounted price"] || "",
    discountPct: r["discount percentage"] || "",
    presalePrice: r["presale price"] || "",
    presalePct: r["presale price percentage"] || "",
    category: r["category"] || "",
    sizes: (r.sizes || "").split("|").filter(Boolean),
    image: r.image || "",
    rating: r.rating ? Number(r.rating) : null,
  }));
}
