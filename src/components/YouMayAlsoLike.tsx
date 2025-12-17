// src/components/YouMayAlsoLike.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ProductTile from "@/components/ProductTile";
import LoadingScreen from "./LoadingScreen";

type Product = {
  id: string;
  slug?: string;
  title?: string;
  name?: string;
  price: number;
  discountedPrice?: number | string;
  presalePrice?: number | string;
  salePrice?: number | string;
  mrp?: number | string;
  new_launch: boolean;
};

const toNumber = (v: any) =>
  Number.isFinite(+v) ? +v : (typeof v === "string" ? parseFloat(v.replace(/[^0-9.]/g, "")) : 0);

const dirFrom = (p: Product) => (p.slug || p.title || p.name || p.id || "").trim();
const IMG_NAMES = ["1", "2", "3", "4"];
const oneRandomImg = (dir: string) => {
  return `/assets/models/products/${dir}/1.avif`;
};
const fallbackSeq = (dir: string) => IMG_NAMES.map(n => `/assets/models/products/${dir}/${n}.avif`);

const hrefFor = (p: Product) =>`/product/${p.slug}`;

function shuffle<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Picks ONE image; no rotation. If it 404s, tries the remaining candidates once. */
function OneShotImage({ dir, alt }: { dir: string; alt: string }) {
  const tried = useRef<Set<string>>(new Set());
  const [src, setSrc] = useState(() => oneRandomImg(dir));
  const fallbacks = useMemo(() => fallbackSeq(dir), [dir]);

  useEffect(() => {
    tried.current.clear();
    setSrc(oneRandomImg(dir));
  }, [dir]);

  const onError = () => {
    tried.current.add(src);
    const next = fallbacks.find(u => !tried.current.has(u));
    if (next) {
    
      setSrc(next);
    } else {
      setSrc("/assets/placeholder.png");
    }
  };

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      onError={onError}
      className="h-full w-full object-cover"
      loading="lazy"
      decoding="async"
    />
  );
}

export default function YouMayAlsoLike({
  excludeTitle = "",
  limit = 4,
  headingImg = "/assets/ymal-header.png",
  debug = true,
}: {
  excludeTitle?: string;
  limit?: number;
  headingImg?: string;
  debug?: boolean;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // MOUNT logs
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ymal:mounted", { detail: { excludeTitle } }));
    return;
  }, [excludeTitle]);

  // FETCH from Firestore-backed API (no CSV)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setErr(null);
        setLoading(true);
        const res = await fetch("/api/products?limit=16", { next: { revalidate: 36000 }});
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error || "Failed to load products");
        const list: Product[] = Array.isArray(body?.products) ? body.products : [];
        if (!mounted) return;
        setProducts(list);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message || "Failed to load products.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);
  const visible = useMemo(() => {
    const ex = excludeTitle.toLowerCase();
    const pool = products.filter(p => (p.title || p.name || "").toLowerCase() !== ex);
    const pick = shuffle(pool).slice(0, limit);
    return pick;
  }, [products, excludeTitle, limit]);

  if (loading && !products.length) {
    return (
      <div className="mt-14" data-ymal>
        <div className="text-center mb-6">
          <img src={headingImg} alt="You may also like" className="mx-auto w-64 sm:w-80" />
        </div>
         <div className="text-sm text-gray-500 text-center"><LoadingScreen /></div>
        </div>
    );
  }
  return (
    <div className="mt-14" data-ymal>
      <div className="text-center mb-6">
        <img src={headingImg} alt="You may also like" className="mx-auto w-64 sm:w-80" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {visible.map((p) => {
          const title = p.title || p.name || "Product";
          const dir = dirFrom(p);
          const price = toNumber((p as any).price) || toNumber((p as any).mrp);
          return (
            <ProductTile
              key={p.id}
              href={hrefFor(p)}
              title={title}
              slug={`${p.slug}`}
              image={dir ? `/assets/models/products/${dir}/1.avif` : "/assets/placeholder.png"}
              price={price}
              rating={5}
              showAdd
              // Optional: if your ProductTile supports className, keep the tighter padding:
              className="p-3 sm:p-4"
              newLaunch={!!p.new_launch}
            // If ProductTile doesn't accept className, you can remove ^ safely.
            />
          );
        })}
      </div>
    </div>
  );
}
