// src/lib/products.server.ts (SSR via Admin SDK)
import { getDb } from "./firebaseAdmin";
import { Product } from "./products.types";

export async function getAllProductsSSR(limit = 100): Promise<Product[]> {
  const db = getDb();
  const snap = await db.collection("products").get(); // no order requirement
return snap.docs.map(d => d.data() as Product);
}

export async function getProductBySlugSSR(slug: string): Promise<Product | null> {
  const db = getDb();
 const snap = await db.collection("products").get(); // no order requirement
return snap.empty ? null : (snap.docs[0].data() as Product);
}
