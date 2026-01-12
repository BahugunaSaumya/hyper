"use client";

import { useRef } from "react";
import Link from "next/link";

type Props = {
  href?: string;               // PDP link (if present)
  title: string;
  slug: string;
  image: string;
  price: number;
  className?: string;
  newLaunch: boolean;
  bestseller: boolean;
  color: string;
};

export default function ProductTile({
  href,
  title,
  image,
  price,
  newLaunch,
  bestseller,
  color
}: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);

  const content = (
    <div className={`rounded-2xl bg-white transition`}>
      <div className="bg-neutral-100 overflow-hidden flex items-center justify-center max-h-[270px] sm:max-h-[320px] md:max-h-[380px] lg:max-h-[450px]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={image} alt={title} className="max-h-full w-auto object-contain" />
      </div>

      <div className="mt-1">
        <span className="text-[#757575] text-[9px] sm:text-[12px] whitespace-nowrap">
          {bestseller ? ('Best Seller  •  ') : newLaunch ? ('New Arrival  •  ') : null}  {color}
        </span> 
        <div className="font-bold">{title}</div>

        <div className="flex items-center gap-3">
          {price !== undefined && (
            <div className="text-sm sm:text-base font-bold">
              {`₹ ${price}`}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
