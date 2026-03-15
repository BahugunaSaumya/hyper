import ProductDetailView from "@/components/ProductDetailView";
import db from "@/lib/mysql";
import * as cache from "@/lib/cache";
import fs from "fs";
import path from "path";


export const runtime = "nodejs";

const DB_TTL = 5 * 60 * 60 * 1000; // 5 hours
const DB_SWR = 30 * 60 * 60 * 1000;

/**
 * Normalize MySQL row → frontend-friendly object
 */
function normalizeProduct(p: any) {
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description,
    gender: p.gender,
    color: p.color,
    image: p.image,
    mrp: Number(p.mrp),
    price: Number(p.price),
    discountPercentage: Number(p.discount_percentage),
    presalePrice: Number(p.presale_price),
    presalePricePercentage: Number(p.presale_price_percentage),
    bestseller: Boolean(p.bestseller),
    new_launch: Boolean(p.new_launch),
    categories: p.categories ?? [],
    sizes: p.sizes ?? [],
    updatedAt: p.updated_at,
  };
}

/**
 * Fetch product + categories + sizes (single query)
 */
async function loadProductBySlug(slug: string) {
  return cache.remember(
    `db:product:${slug}`,
    DB_TTL,
    DB_SWR,
    async () => {
      const [rows] = await db.query(
        `
        SELECT
        p.id,
        p.title,
        p.slug,
        p.description,
        p.price,
        p.mrp,
        p.discount_percentage,
        p.bestseller,

        /* categories */
        (
          SELECT JSON_ARRAYAGG(slug)
          FROM (
            SELECT DISTINCT c.slug
            FROM product_categories pc
            JOIN categories c ON c.id = pc.category_id
            WHERE pc.product_id = p.id
          ) cat
        ) AS categories,

        /* sizes */
        (
          SELECT JSON_OBJECTAGG(pv.id, s.label)
          FROM product_variants pv
          JOIN sizes s ON s.id = pv.size_id
          WHERE pv.product_id = p.id
        ) AS sizes

      FROM products p
      WHERE p.slug = ?
      LIMIT 1;
        `,
        [slug]
      );
      const product = (rows as any[])[0];
      if (!product) return null;
      return {
        ...normalizeProduct(product),
        images: loadGalleryImages(slug),
      };
    }
  );
}

function loadGalleryImages(slug: string): string[] {
  const dir = path.join(
    process.cwd(),
    "public/assets/models/products",
    slug
  );

  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => /\.(avif|webp|png|jpg|jpeg)$/i.test(f))
    .sort((a, b) => {
      const na = parseInt(a);
      const nb = parseInt(b);
      if (!isNaN(na) && !isNaN(nb)) return na - nb;
      return a.localeCompare(b);
    })
    .map((f) => `/assets/models/products/${slug}/${f}`);
}


/**
 * Product page
 */
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await loadProductBySlug(slug);

  if (!product) {
    return (
      <div className="p-10 text-center text-xl font-medium">
        Product not found
      </div>
    );
  }

  return <ProductDetailView product={product} />;
}
