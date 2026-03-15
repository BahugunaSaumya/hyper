"use client";

import { useEffect, useState } from "react";

type Coupon = {
  id: number;
  code: string;
  title: string;
  message: string;
  type: "amount" | "percent";
  amount: number;
};

export default function Coupons({productPrice}: {productPrice: number;}) {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const res = await fetch("/api/coupons", {
          next: { revalidate: 36000 },
        });
        const body = await res.json();

        if (!res.ok) throw new Error(body?.error);

        if (mounted) {
          setCoupons(body?.coupons ?? []);
        }
      } catch (err) {
        console.error("Failed to load coupons");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return null;
  if (!coupons.length) return null;

  return (
    <div className="mt-4">
        {coupons.map((c) => (
          <div
            key={c.id}
            className="border border-green-600 rounded-lg p-3 bg-green-50"
          >
            <div className="flex items-center mb-2">
              <img
              src='/assets/coupons/200-OFF.avif'
              alt='200 off coupons'
              className="h-12 w-18 object-contain"
            />
              <span className="text-xl md:text-2xl font-bold text-black">
                Get at ₹ <span className="font-extrabold">{c.type =='amount' ? (productPrice-c.amount) : (productPrice - (c.amount/100)*productPrice )}</span>
              </span>
            </div>

            {c.message && (
              <p className="text-xs text-gray-700 leading-snug">
                {c.message}
              </p>
            )}
          </div>
        ))}
    </div>
  );
}
