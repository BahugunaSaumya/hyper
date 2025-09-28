// src/lib/products.server.ts
import { getDb } from "./firebaseAdmin";
import { Product } from "./products.types";
import * as cache from "./cache";

const TTL_MS = 60_000;
const SWR_MS = 5 * 60_000;

const listKey  = (limit: number) => `ssr:qry:products?limit=${limit}`;
const slugKey  = (slug: string)   => `ssr:doc:productBySlug?slug=${encodeURIComponent(slug)}`;

export async function getAllProductsSSR(limit = 100): Promise<Product[]> {
  return cache.remember<Product[]>(
    listKey(limit),
    TTL_MS,
    SWR_MS,
    async () => {
      const db = getDb();
      const snap = await db.collection("products").get(); // (kept as-is)
      return snap.docs.map(d => d.data() as Product);
    }
  );
}

export async function getProductBySlugSSR(slug: string): Promise<Product | null> {
  return cache.remember<Product | null>(
    slugKey(slug),
    TTL_MS,
    SWR_MS,
    async () => {
      const db = getDb();
      const snap = await db.collection("products").get(); // (kept as-is)
      return snap.empty ? null : (snap.docs[0].data() as Product);
    }
  );
}
