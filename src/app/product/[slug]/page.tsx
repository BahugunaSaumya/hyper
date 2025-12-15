import ProductDetailView from "@/components/ProductDetailView";
import { getDb } from "@/lib/firebaseAdmin";
import * as cache from "@/lib/cache";

export const runtime = "nodejs";

const DB_TTL = 5 * 60 * 60 * 1000; // 5 hours
const DB_SWR = 30 * 60 * 60 * 1000;

function serialize(value: any): any {
  if (!value || typeof value !== "object") return value;
  if (typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serialize);
  }

  const out: any = {};
  for (const key in value) {
    out[key] = serialize(value[key]);
  }
  return out;
}

function normalizeProduct(p: any) {
  return serialize({
    ...p,
    title: p.title,
    slug: p.slug ?? p.title,
    mrp: Number(p.mrp ?? 0),
    price: Number(p.price ?? 0),
    discountedPrice: Number(p.discountedPrice ?? 0),
    discountPercentage: Number(p?.["discount percentage"] ?? 0),
    presalePrice: Number(p.presalePrice ?? 0),
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    categories: Array.isArray(p.categories) ? p.categories : [],
    rating: Number(p.rating || 0),
    quantity: Number(p.quantity || 0),
    new_launch: Boolean(p.new_launch),
  });
}

async function loadProductBySlug(slug: string) {
  return cache.remember(
    `db:product:${slug}`,
    DB_TTL,
    DB_SWR,
    async () => {
      const db = getDb();
      const snap = await db
        .collection("products")
        .where("slug", "==", slug)
        .limit(1)
        .get();

      if (snap.empty) return null;

      const doc = snap.docs[0];
      return normalizeProduct({ id: doc.id, ...doc.data() });
    }
  );
}

export default async function Page({ params }: { params: Promise<{ slug: string }>;}) {
  const { slug } = await params;
  const product = await loadProductBySlug(slug);
  if (!product) {
    return (
      <div className="p-10 text-center text-xl">
        Product not found
      </div>
    );
  }
  return <ProductDetailView product={product} />;
}
