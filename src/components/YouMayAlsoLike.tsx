// src/components/YouMayAlsoLike.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { parseCSV, mapProducts, type ProductModel } from "@/lib/csv";
import ProductTile from "@/components/ProductTile";

type Props = {
  excludeTitle?: string;
  limit?: number; // default 3 on mobile, 4 on desktop
  headingImg?: string; // optional header asset (PNG text "YOU MAY ALSO LIKE")
};

export default function YouMayAlsoLike({
  excludeTitle = "",
  limit = 4,
  headingImg = "/assets/ymal-header.png",
}: Props) {
  const [data, setData] = useState<ProductModel[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/assets/hyper-products-sample.csv", { cache: "no-cache" });
        const text = await res.text();
        setData(mapProducts(parseCSV(text)));
      } catch {}
    })();
  }, []);

  const list = useMemo(() => {
    const ex = excludeTitle.toLowerCase();
    return data.filter((p) => (p.title || "").toLowerCase() !== ex).slice(0, limit);
  }, [data, excludeTitle, limit]);

  if (!list.length) return null;

  return (
    <div className="mt-14">
      <div className="text-center mb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={headingImg} alt="You may also like" className="mx-auto w-64 sm:w-80" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {list.map((p) => (
          <ProductTile
            key={p.title}
            href={`/product/${encodeURIComponent(p.title)}`}
            title={p.title}
            image={(p as any).image?.startsWith("/") ? (p as any).image : `/${(p as any).image}`}
            price={(p as any).price || (p as any).discountedPrice || (p as any).presalePrice || (p as any).mrp}
            rating={(p as any).rating ?? 5}
            showAdd
          />
        ))}
      </div>
    </div>
  );
}
