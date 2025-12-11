import fs from "node:fs/promises";
import path from "node:path";
import ProductDetailView from "@/components/ProductDetailView";
import { parseCSV, mapProducts } from "@/lib/csv";
import { coverFor } from "@/lib/images";
import * as cache from "@/lib/cache"; // 👈 add

const CSV_TTL = 5 * 60_000;   // 5m fresh
const CSV_SWR = 30 * 60_000;  // 30m stale-while-revalidate

async function loadAllProductsCached() {
  return cache.remember<any[]>(
    "csv:all-products",
    CSV_TTL,
    CSV_SWR,
    async () => {
      const csvPath = path.join(process.cwd(), "public", "assets", "hyper-products-sample.csv");
      const csv = await fs.readFile(csvPath, "utf8");
      return mapProducts(parseCSV(csv));
    }
  );
}

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const name = decodeURIComponent(slug);

  let product: any | undefined;

  try {
    const products = await loadAllProductsCached();

    // prefer title match; fallback to slug match
    product =
      products.find((p) => (p.title ?? "").toLowerCase() === name.toLowerCase()) ??
      products.find((p) => (p.slug ?? "").toLowerCase() === name.toLowerCase());
  } catch {
    // ignore; fallback below
  }

  if (!product) {
    product = {
      id: name,
      title: name,
      price: "",
      image: `/assets/models/products/${slug}/1.avif`,
      description: "",
      sizes: [],
    };
  } else {
    product.image = product.image || coverFor(product);
  }

  return <ProductDetailView product={product} />;
}
