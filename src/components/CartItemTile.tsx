"use client";

import { useRouter } from "next/navigation";

type Props = {
  id: string;
  title: string;
  slug: string;
  image: string;
  unitPrice: string | number;
  size?: string;
  qty: number;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
  newLaunch: boolean;
};

export default function CartItemTile({
  id,
  title,
  slug,
  image,
  unitPrice,
  size,
  qty,
  onIncrease,
  onDecrease,
  onRemove,
  newLaunch
}: Props) {
  const router = useRouter();
  const imageUrl = slug ?? encodeURIComponent(title); 
  const open = () => router.push(`/product/${imageUrl}`);
  const today = new Date();
  const newLaunchCutoff = new Date("2025-12-11T00:00:00"); // Dec 11, 2025
  return (
    <div className="py-6 border-b border-black/10 last:border-b-0">
      {newLaunch && today < newLaunchCutoff &&  (
          <div className="mb-4 flex text-pink-700 font-bold">
            <span className="mr-1">✨ New Launch</span> products available from 
            <span className="ml-1">Dec 11, 2025! 🎉</span>
          </div>
      )}
      <div className="flex items-start gap-6 sm:gap-8">
        {/* LEFT: Product Image */}
        <button
          onClick={open}
          className="flex-shrink-0 rounded-2xl bg-neutral-100 p-4 
                     w-[160px] h-[130px] sm:w-[200px] sm:h-[150px] 
                     flex items-center justify-center hover:shadow transition"
          aria-label={`Open ${imageUrl}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt={title}
            className="max-h-full max-w-full object-contain"
          />
        </button>

        {/* RIGHT: Product Details */}
        <div className="flex-1 flex flex-col justify-between">
          <div>
            <button
              onClick={open}
              className="text-left text-lg sm:text-xl md:text-2xl font-semibold leading-snug hover:underline"
              aria-label={`Open ${imageUrl}`}
            >
              {title}
            </button>

            {size && (
              <div className="mt-1 text-sm text-gray-500">
                Size: <span className="font-medium">{size}</span>
              </div>
            )}

            <div className="mt-2 text-lg sm:text-xl font-bold">
              {String(unitPrice).startsWith("₹") ? unitPrice : `₹ ${unitPrice}`}
            </div>
          </div>

          {/* Quantity Controls */}
          <div className="mt-4 inline-flex items-center rounded-full border px-2 py-1 sm:px-3 sm:py-1.5 w-fit">
            <button
              className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center text-lg font-bold"
              onClick={onDecrease}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span className="mx-3 text-sm sm:text-base font-semibold w-7 text-center">
              {qty}
            </span>
            <button
              className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center text-lg font-bold"
              onClick={onIncrease}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        {/* Trash Button */}
        <button
          onClick={onRemove}
          className="text-gray-650 hover:text-black self-start mt-1 transition pr-2"
          title="Remove item"
          aria-label="Remove item"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-7 h-7 sm:w-6 sm:h-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            {/* Dustbin icon */}
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 6h18M8 6V4h8v2m-9 4v8a2 2 0 002 2h6a2 2 0 002-2v-8"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
