import { notFound } from "next/navigation";
import { headers } from "next/headers";
import ProductTile from "@/components/ProductTile";

export default async function CategoryProduct({ params}: { params: Promise<{ slug: string }>}) {
  const { slug } = await params;
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV !== "production" ? "http" : "https";
  const res = await fetch(`${protocol}://${host}/api/products/category?slug=${slug}`, {
    next: { revalidate: 36000 },
  });

  if (!res.ok) return notFound();

  const data = await res.json();
  const products = data.products || [];
  
  type Product = {
    id: number;
    slug?: string;
    title?: string;
    name?: string;
    price?: number | string;
    discountedPrice?: number | string;
    presalePrice?: number | string;
    salePrice?: number | string;
    mrp: number;
    new_launch:boolean;
    bestseller: boolean;
    color: string;
    sizes: [];
  };

  const toNumber = (v: any) =>
    Number.isFinite(+v)
      ? +v
      : typeof v === "string"
      ? parseFloat(v.replace(/[^0-9.]/g, ""))
      : 0;

  const dirFrom = (p: Product) =>
    (p.slug || p.title || p.name || "").trim();

  const hrefFor = (p: Product) =>
    `/product/${p.slug}`;

  return (
    <div className="max-w-6xl mx-auto p-6 px-2">
      {products.length === 0 ? (
         <div className="flex justify-center items-center h-64 px-4 text-center">
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-gray-700 animate-pulse">
            Train. Recover. Dominate. Launching Soon! 🚀
          </h2>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {products.map((p: Product, index: number) => {
            const title = p.title || p.name || "Product";
            const dir = dirFrom(p);
            const price =
              toNumber((p as any).price) ||
              toNumber((p as any).salePrice) ||
              toNumber((p as any).discountedPrice) ||
              toNumber((p as any).presalePrice) ||
              toNumber((p as any).mrp);
            const variantKeys = p.sizes ? Object.keys(p.sizes) : [];
            const firstVariantId = variantKeys.length > 0 ? Number(variantKeys[0]) : 0;
            const firstVariant = p.sizes ? Object.values(p.sizes)[0] : '';
            return (
              <ProductTile
                key={`${p.id || p.slug || p.name || "item"}-${index}`}  
                productId={p.id}
                href={hrefFor(p)}
                title={title}
                slug={`${p.slug}`}
                image={
                  dir
                    ? `/assets/models/products/${dir}/1.avif`
                    : "/assets/placeholder.png"
                }
                mrp={p.mrp}
                price={price}
                newLaunch={!!p.new_launch}
                bestseller={p.bestseller ?? false}
                color= {p.color ?? ''}
                variantId={firstVariantId}
                size={firstVariant}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}