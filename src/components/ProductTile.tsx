// src/components/ProductTile.tsx
"use client";

import { useCart } from "@/context/CartContext";
import Link from "next/link";

type Props = {
  href?: string;               // PDP link (if present)
  title: string;
  image: string;
  price?: string | number;
  rating?: number;             // 0..5
  showAdd?: boolean;           // show "+ ADD TO CART" pill
  className?: string;
};

function Stars({ value = 4.8 }: { value?: number }) {
  const r = Math.round(value);
  return (
    <div className="text-pink-500 text-xs tracking-tight">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>{i < r ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

export default function ProductTile({
  href,
  title,
  image,
  price,
  rating = 5,
  showAdd = true,
  className = "",
}: Props) {
  const { add } = useCart();

  const content = (
    <div className={`rounded-2xl bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition ${className}`}>
      <div className="rounded-xl bg-neutral-100 overflow-hidden flex items-center justify-center aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt={title} className="w-full h-full object-contain" />
      </div>

      <div className="mt-4">
        <div className="text-base sm:text-lg font-semibold leading-tight line-clamp-2">{title}</div>

        <div className="mt-2 flex items-center gap-3">
          {price !== undefined && price !== "" && (
            <div className="text-sm sm:text-base font-bold">
              {String(price).startsWith("₹") ? price : `₹ ${price}`}
            </div>
          )}
          <Stars value={rating} />
        </div>

        {showAdd && (
          <button
            onClick={(e) => {
              e.preventDefault();
              add({
                id: `${title}__tile`,
                name: title,
                size: "",
                price: String(price ?? ""),
                image,
                quantity: 1,
              });
            }}
            className="mt-3 w-full rounded-full border px-4 py-2 text-xs sm:text-sm font-extrabold tracking-widest hover:bg-black hover:text-white transition"
          >
            + ADD TO CART
          </button>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
