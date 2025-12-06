import { notFound } from "next/navigation";
import ProductTile from "@/components/ProductTile";

export default async function CategoryProduct({ params}: { params: Promise<{ slug: string }>}) {
  const { slug } = await params;

  // Ensure environment variable exists
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://gethypergear.in/";

  // Fetch category products
  const res = await fetch(`${baseUrl}/api/products/category?slug=${slug}`, {
    next: { revalidate: 12 },
  });

  if (!res.ok) return notFound();

  const data = await res.json();
  const products = data.products || [];

  type Product = {
    id: string;
    slug?: string;
    title?: string;
    name?: string;
    price?: number | string;
    discountedPrice?: number | string;
    presalePrice?: number | string;
    salePrice?: number | string;
    mrp?: number | string;
  };

  const fmtINR = (n: number | string | undefined) =>
    "₹ " + Number(n || 0).toLocaleString("en-IN");

  const toNumber = (v: any) =>
    Number.isFinite(+v)
      ? +v
      : typeof v === "string"
      ? parseFloat(v.replace(/[^0-9.]/g, ""))
      : 0;

  const dirFrom = (p: Product) =>
    (p.slug || p.title || p.name || p.id || "").trim();

  const hrefFor = (p: Product) =>
    `/product/${p.slug}`;

  return (
    <div className="max-w-6xl mx-auto p-6">
      {products.length === 0 ? (
         <div className="flex justify-center items-center h-64 px-4 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-700 animate-pulse">
            Train. Recover. Dominate. Launching Soon! 🚀
          </h2>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((p: Product, index: number) => {
            const title = p.title || p.name || "Product";
            const dir = dirFrom(p);
            const price =
              toNumber((p as any).price) ||
              toNumber((p as any).salePrice) ||
              toNumber((p as any).discountedPrice) ||
              toNumber((p as any).presalePrice) ||
              toNumber((p as any).mrp);
            return (
              <ProductTile
                key={`${p.id || p.slug || p.name || "item"}-${index}`}  
                href={hrefFor(p)}
                title={title}
                image={
                  dir
                    ? `/assets/models/products/${dir}/${Math.floor(Math.random() * 3) + 1}.avif`
                    : "/assets/placeholder.png"
                }
                price={fmtINR(price)}
                rating={5}
                showAdd
                className="p-3 sm:p-4"
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
