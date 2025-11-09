"use client";

import Stars from "./Stars";

export type Review = {
  id: string;
  rating: number;
  body: string;
  user?: string;         // display name or email (server may send)
  userId?: string;       // owner id (for delete control)
  createdAt?: string;    // ISO
  images?: string[];     // image URLs (optional)
};

export default function ReviewsList({
  productKey,
  reviews,
  onAddReview,
  onDelete,
  average = 0,
  count = 0,
  currentUserId,
  canModerate = false,
}: {
  productKey: string;
  reviews: Review[];
  onAddReview: () => void;
  onDelete?: (reviewId: string) => void;
  average?: number;
  count?: number;
  currentUserId?: string | null;
  canModerate?: boolean;
}) {
  const canDelete = (r: Review) => {
    if (!onDelete) return false;
    if (canModerate) return true;
    if (currentUserId && r.userId && currentUserId === r.userId) return true;
    return false;
  };

  return (
    <div className="mt-4">
      {/* Header: average + count */}
      <div className="flex items-center gap-3">
        <Stars rating={average} />
        <div className="text-sm text-gray-700">
          {average ? average.toFixed(1) : "—"}{" "}
          <span className="text-gray-400">({count} reviews)</span>
        </div>
      </div>

      {/* Empty state */}
      {(!reviews || reviews.length === 0) ? (
        <div className="mt-5 rounded-xl border border-gray-200 p-4 text-sm text-gray-600">
          No reviews yet. Be the first!
          <div className="mt-3">
            <button
              onClick={onAddReview}
              className="rounded-full bg-black px-6 py-3 text-xs font-extrabold uppercase tracking-widest text-white"
            >
              Add a review
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-6">
            {reviews.map((r) => (
              <div key={r.id} className="border-b border-gray-100 pb-4">
                <div className="flex items-center justify-between">
                  <Stars rating={r.rating} />
                  {(canDelete(r)) && (
                    <button
                      onClick={() => onDelete?.(r.id)}
                      className="text-xs rounded-full border px-3 py-1 hover:bg-black hover:text-white transition"
                      aria-label="Delete review"
                      title="Delete review"
                    >
                      Delete
                    </button>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-gray-500">
                  {r.user || "Anonymous"} {r.createdAt ? "· " + new Date(r.createdAt).toLocaleDateString() : ""}
                </div>

                <p className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{r.body}</p>

                {Array.isArray(r.images) && r.images.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {r.images.map((src, i) => (
                      <div key={i} className="relative overflow-hidden rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={src} alt="" className="h-32 w-full object-cover" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5">
            <button
              onClick={onAddReview}
              className="rounded-full bg-black px-6 py-3 text-xs font-extrabold uppercase tracking-widest text-white"
            >
              Add a review
            </button>
          </div>
        </>
      )}
    </div>
  );
}
