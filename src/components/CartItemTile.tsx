"use client";

import Link from "next/link";

type Props = {
  id: number;
  title: string;
  slug: string;
  unitPrice: string | number;
  size: string;
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
  unitPrice,
  size,
  qty,
  onIncrease,
  onDecrease,
  onRemove,
  newLaunch
}: Props) {
  return (
    <div className="flex items-start gap-3 sm:gap-8 bg-neutral-100 p-3">
      {/* Image */}
      <Link
        href={`/product/${slug}`}
        className="max-w-[160px] h-[130px] sm:w-[200px] sm:h-[150px]"
      >
        <img
          src={`/assets/models/products/${slug}/1.avif`}
          alt={title}
          className="h-full object-contain rounded"
        />
      </Link>

      {/* Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <Link
            href={`/product/${slug}`}
            className="text-lg sm:text-xl font-semibold hover:underline"
          >
            {title}
          </Link>

          {size && (
            <div className="text-sm text-gray-500">
              Size: <span className="font-medium">{size}</span>
            </div>
          )}

          <div className="text-lg font-bold mt-1">
            ₹ {unitPrice}
          </div>
        </div>

        {/* Quantity controls */}
        <div className="mt-2 inline-flex items-center rounded-full border px-3 py-1.5 w-fit">
          <button
            onClick={onDecrease}
            disabled={qty === 1}
            className={`w-8 h-8 text-lg font-bold ${
              qty === 1 ? "opacity-30 cursor-not-allowed" : ""
            }`}
          >
            −
          </button>

          <span className="mx-3 font-semibold w-6 text-center">
            {qty}
          </span>

          <button
            onClick={onIncrease}
            className="w-8 h-8 text-lg font-bold"
          >
            +
          </button>
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="text-gray-500 hover:text-black mt-1"
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
  );
}
