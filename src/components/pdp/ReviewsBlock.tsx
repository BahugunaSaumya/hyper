// src/components/pdp/ReviewsBlock.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import ReviewsList, { Review } from "./ReviewsList";
import ReviewForm from "./ReviewForm";

export default function ReviewsBlock({
  productKey, // same string you use to load reviews (slug/id)
}: {
  productKey: string;
}) {
  const { user } = useAuth() as any;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState<number>(0);
  const [count, setCount] = useState<number>(0);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/reviews?productId=${encodeURIComponent(productKey)}`, { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) return;
    setReviews(Array.isArray(data.reviews) ? data.reviews : []);
    setAvg(Number(data.average || 0));
    setCount(Number(data.count || 0));
  }, [productKey]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(payload: { rating: number; body: string; uploadedUrls?: string[] }) {
    try {
      setBusy(true);
      const tok = await user?.getIdToken?.();
      if (!tok) {
        alert("Please log in to submit a review.");
        return;
      }

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${tok}`,
        },
        body: JSON.stringify({
          productId: productKey,
          rating: payload.rating,
          body: payload.body,
          images: payload.uploadedUrls || [], // 👈 save uploaded URLs
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to save review");

      setShowForm(false);
      await load(); // refresh list/average/count
    } catch (e: any) {
      console.error("[reviews] submit error:", e);
      alert(e?.message || "Could not submit review.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(reviewId: string) {
    try {
      const tok = await user?.getIdToken?.();
      if (!tok) {
        alert("Please log in.");
        return;
      }

      const res = await fetch(`/api/reviews/${encodeURIComponent(reviewId)}`, {
        method: "DELETE",
        headers: { authorization: `Bearer ${tok}` },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to delete review");

      await load();
    } catch (e: any) {
      console.error("[reviews] delete error:", e);
      alert(e?.message || "Could not delete review.");
    }
  }

  return (
    <div className="mt-6">
      {!showForm ? (
        <ReviewsList
          productKey={productKey}
          reviews={reviews}
          average={avg}
          count={count}
          currentUserId={user?.uid || null}
          onAddReview={() => setShowForm(true)}
          onDelete={(id) => handleDelete(id)}
        />
      ) : (
        <ReviewForm
          productId={productKey}   // 👈 pass into form for upload API
          onCancel={() => setShowForm(false)}
          onSubmit={(p) => handleSubmit({ rating: p.rating, body: p.body, uploadedUrls: p.uploadedUrls })}
          disabled={busy}
        />
      )}
    </div>
  );
}
