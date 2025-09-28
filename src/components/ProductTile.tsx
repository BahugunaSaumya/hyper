"use client";

import { useRef, useState } from "react";
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

/* tiny helper: fly image to top-right (cart area approximation) */
function flyToCartFrom(sourceEl: HTMLElement | null, imgSrc: string) {
  try {
    if (!sourceEl || !imgSrc) return;
    const rect = sourceEl.getBoundingClientRect();

    const ghost = document.createElement("img");
    ghost.src = imgSrc;
    ghost.alt = "";
    Object.assign(ghost.style, {
      position: "fixed",
      left: `${rect.left + rect.width / 2 - 36}px`,
      top: `${rect.top + rect.height / 2 - 36}px`,
      width: "72px",
      height: "72px",
      objectFit: "cover",
      borderRadius: "10px",
      zIndex: "9999",
      pointerEvents: "none",
      opacity: "0.95",
      transition: "transform 650ms cubic-bezier(.22,.61,.36,1), opacity 650ms",
      transform: "translate3d(0,0,0) scale(1)",
      boxShadow: "0 10px 28px rgba(0,0,0,.35)",
      background: "#fff",
    } as CSSStyleDeclaration);

    document.body.appendChild(ghost);

    const endX = window.innerWidth - 40;
    const endY = 24;
    const dx = endX - (rect.left + rect.width / 2);
    const dy = endY - (rect.top + rect.height / 2);

    requestAnimationFrame(() => {
      ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(.1)`;
      ghost.style.opacity = "0.15";
    });

    setTimeout(() => ghost.remove(), 680);
  } catch { }
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
  const [flash, setFlash] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const content = (
    <div className={`rounded-2xl bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition ${className}`}>
      <div className="rounded-xl bg-neutral-100 overflow-hidden flex items-center justify-center aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={image} alt={title} className="w-full h-full object-contain" />
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
              flyToCartFrom(imgRef.current as unknown as HTMLElement, image);
              setFlash(true);
              setTimeout(() => setFlash(false), 600);
            }}
            className={`mt-3 w-full rounded-full border px-4 py-2 text-xs sm:text-sm font-extrabold tracking-widest transition
              ${flash ? "bg-pink-600 text-white border-pink-600" : "hover:bg-black hover:text-white"}`}
          >
            + ADD TO CART
          </button>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
