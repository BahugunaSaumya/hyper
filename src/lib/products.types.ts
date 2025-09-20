// src/lib/products.types.ts
export type Product = {
  id: string;               // Firestore doc id (stable)
  slug: string;             // slug(title)
  title: string;
  desc: string;
  mrp: number;              // store numbers as numbers
  discountedPrice?: number;
  discountPct?: number;
  presalePrice?: number;
  presalePct?: number;
  category?: string;
  sizes: string[];
  image?: string;
  rating?: number | null;
  quantity?: number;        // stock
  price: number;            // effective: presale || discounted || mrp
  createdAt?: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
};

// src/lib/price.ts
export function computeEffectivePrice(row: {
  mrp?: any;
  discountedPrice?: any;
  presalePrice?: any;
}) {
  const num = (x: any) =>
    x == null || x === "" ? undefined : Number(String(x).replace(/[^\d.]/g, ""));
  const mrp = num(row.mrp) ?? 0;
  const disc = num(row.discountedPrice);
  const pre = num(row.presalePrice);
  return pre ?? disc ?? mrp;
}

export function slugify(s: string) {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
