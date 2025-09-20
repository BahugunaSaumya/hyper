// app/product/[slug]/page.tsx
import fs from "node:fs/promises";
import path from "node:path";
import ProductDetailView from "@/components/ProductDetailView";
import { mapProducts } from "@/lib/csv";
import { coverFor } from "@/lib/images";

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params; // ✅ FIX: await here
  const name = decodeURIComponent(slug); // handles spaces

  let product: any | undefined;
  try {
    const csvPath = path.join(process.cwd(), "public", "assets", "hyper-products-sample.csv");
    const csv = await fs.readFile(csvPath, "utf8");
    const products = mapProducts(csv);

    // prefer title match (ignore slug entirely for navigation)
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
      image: `/assets/models/products/${encodeURI(name)}/1.jpg`,
      description: "",
      sizes: [],
    };
  } else {
    // ensure image exists for first render
    product.image = product.image || coverFor(product);
  }

  return <ProductDetailView product={product} />;
}
