"use client";

export default function Stars({ rating = 0 }: { rating?: number }) {
  const r = Math.round(rating);
  return (
    <div
      className="flex items-center gap-1 text-pink-600 text-sm"
      aria-label={`${rating} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>{i < r ? "★" : "☆"}</span>
      ))}
    </div>
  );
}
