"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAddToCart } from "./UseAddToCart";

type LookProduct = {
  id: number;
  slug: string;
  title: string;
  price: number;
  mrp: number;
  discountedPrice?: number | null;
  new_launch?: boolean;
  color: string;
  sizes: string[];
};

type CompleteLookResponse = {
  lookId: number;
  title?: string;
  products: LookProduct[];
};

export default function CompleteTheLook({
  productId,
  initialData,
  visible,
  onClose,
}: {
  productId?: number;
  initialData: CompleteLookResponse | null;
  visible: boolean;
  onClose: () => void;
}) {
  const { addProduct } = useAddToCart();
  const [data, setData] = useState<CompleteLookResponse | null>(initialData || null);
  const [loading, setLoading] = useState(!initialData);
  const [open, setOpen] = useState(false);
  const [selectedSizes, setSelectedSizes] = useState<{ id: number; size: string } | null>(null);
  const [sizeErrors, setSizeErrors] = useState<Record<number, boolean>>({});

  /* ---------------- fetch look (only if no initialData) ---------------- */
  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoading(false);
      return;
    }

    if (!productId) return;

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/complete-look/${productId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (mounted && json?.products?.length) setData(json);
      } finally {
        mounted && setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [productId, initialData]);

  /* ---------------- visibility animation ---------------- */
  useEffect(() => {
    if (visible && data?.products?.length) {
      requestAnimationFrame(() => setOpen(true));
    } else {
      setOpen(false);
    }
  }, [visible, data]);

  if (loading || !data) return null;

  const handleAdd = (p: LookProduct) => {
    if (!selectedSizes) {
      setSizeErrors((prev) => ({ ...prev, [p.id]: true }));
      return;
    }
    addProduct({
      product: {
        id: p.id,
        mrp: p.mrp,
        price: p.discountedPrice ?? p.price,
      },
      variantId: selectedSizes.id,
      image: `/assets/models/products/${p.slug}/1.avif`,
    });
  };

  return (
    <div
      className={`fixed bottom-0 left-0 w-full z-40 bg-black py-10 px-4 rounded-t-3xl overflow-hidden transform transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] ${open ? "translate-y-0" : "translate-y-full"}`}
      style={{ backgroundImage: "url('/assets/mask.avif')", backgroundRepeat: "no-repeat", backgroundSize: "cover", backgroundPosition: "top center" }}
    >
      <img src="/assets/cross.avif" alt="close" className="max-h-[25px] absolute right-5 top-5 cursor-pointer" onClick={onClose} />
      <div className="max-w-6xl mx-auto space-y-10">
        <h1 className="text-lg font-bold text-white text-center uppercase">Complete Your Outfit</h1>
        {data.products.filter((p) => p.slug !== "thunder-fang-neon").map((p) => {
          const price = p.discountedPrice ?? p.price ?? p.mrp ?? 0;
          return (
            <div key={p.id} className="space-y-4 text-white">
              <div className="grid grid-cols-2 gap-6">
                <Link href={`/products/${p.slug}`}>
                  <img src={`/assets/models/products/${p.slug}/1.avif`} alt={p.title} className="max-h-[360px] w-full object-contain rounded-xl" />
                </Link>
                <div className="flex flex-col justify-center gap-2">
                  <div className="font-extrabold text-xl">{p.title}</div>
                  <div className="font-extrabold text-3xl">₹ {price}</div>
                  <div className="mt-4">
                    <div className="font-extrabold mb-2 text-lg">Select Size</div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(p.sizes).map(([variantId, size]) => (
                        <button
                          key={variantId}
                          onClick={() => { setSelectedSizes({ id: Number(variantId), size }); setSizeErrors(prev => ({ ...prev, [p.id]: false })); }}
                          className={`px-3 py-1 text-sm font-bold rounded-md border transition ${selectedSizes?.id === Number(variantId) ? "border-pink-500 bg-pink-50 text-pink-600" : "border-white"}`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  {sizeErrors[p.id] && <div className="mt-3 bg-pink-50 text-pink-700 text-center py-2 rounded text-xs">Please select a size</div>}
                </div>
              </div>
              <div className="flex gap-4">
                <button onClick={onClose} className="flex-1 rounded-full border border-white py-3 font-title justify-center text-center">Skip</button>
                <button onClick={() => handleAdd(p)} className="flex-1 rounded-full py-3 bg-[#FF5CE9] font-title font-bold">Add to Cart</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}