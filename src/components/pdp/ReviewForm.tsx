// src/components/pdp/ReviewForm.tsx
"use client";

import { useState } from "react";
import Stars from "./Stars";
import { useAuth } from "@/context/AuthContext";

type SubmitPayload = {
  rating: number;
  body: string;
  images: File[];            // local files (for preview only)
  uploadedUrls?: string[];   // URLs returned by /api/reviews/upload
};

export default function ReviewForm({
  productId,         
  onCancel,
  onSubmit,
  disabled = false,
}: {
  productId: string;
  onCancel: () => void;
  onSubmit: (data: SubmitPayload) => void;
  disabled?: boolean;
}) {
  const { user } = useAuth() as any;

  const [rating, setRating] = useState(4);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<"idle" | "uploading" | "submitting">("idle");
  const isDisabled = disabled || busy !== "idle";

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files || []);
    setFiles((prev) => [...prev, ...list].slice(0, 6));
    e.currentTarget.value = ""; // allow same file to be re-selected
  };

  const removeAt = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  async function uploadSelected(files: File[]): Promise<string[]> {
    if (!files.length) return [];
    if (!productId) throw new Error("Missing productId");

    const tok = await user?.getIdToken?.();
    if (!tok) throw new Error("Unauthorized");

    setBusy("uploading");
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f, f.name));
    fd.append("productId", productId); // 👈 REQUIRED by your upload API

    const res = await fetch("/api/reviews/upload", {
      method: "POST",
      headers: { authorization: `Bearer ${tok}` },
      body: fd,
    });

    if (!res.ok) {
      const msg = (await res.json().catch(() => null))?.error || "Image upload failed";
      throw new Error(msg);
    }

    const data = await res.json().catch(() => ({}));
    return Array.isArray(data?.urls) ? data.urls : [];
  }

  async function doSubmit() {
    try {
      if (!rating || !body.trim()) return;

      setBusy(files.length ? "uploading" : "submitting");
      const uploadedUrls = await uploadSelected(files); // [] if no files

      setBusy("submitting");
      onSubmit({ rating, body: body.trim(), images: files, uploadedUrls });

      // reset UI after parent persists
      setBusy("idle");
      setBody("");
      setFiles([]);
      setRating(4);
    } catch (e: any) {
      console.error("[review] submit failed:", e);
      alert(e?.message || "Could not submit review. Please try again.");
      setBusy("idle");
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-gray-200 p-4">
      <div className="text-xl font-extrabold">Add a review</div>

      {/* Stars (pink) */}
      <div className="mt-3 flex items-center gap-2 text-pink-600 text-2xl">
        {Array.from({ length: 5 }).map((_, i) => (
          <button
            key={i}
            className="leading-none"
            onClick={() => setRating(i + 1)}
            aria-label={`Set rating ${i + 1}`}
            type="button"
            disabled={isDisabled}
          >
            {i < rating ? "★" : "☆"}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        className="mt-3 w-full rounded-2xl border border-gray-300 p-4 text-sm outline-none focus:border-black"
        rows={5}
        placeholder="Write your review"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={isDisabled}
      />

      {/* Images */}
      <div className="mt-3">
        <div className="text-sm text-gray-700">Add images (optional)</div>
        <label className="mt-2 flex h-12 w-full cursor-pointer items-center justify-center rounded-full border border-gray-300 text-sm">
          📷
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFiles}
            disabled={isDisabled}
          />
        </label>

        {files.length > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            {files.map((f, i) => {
              const url = URL.createObjectURL(f);
              return (
                <div key={i} className="relative overflow-hidden rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-32 w-full object-cover"
                    onLoad={() => URL.revokeObjectURL(url)}
                  />
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white"
                    disabled={isDisabled}
                    aria-label="Remove image"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-5 flex gap-3">
        <button
          onClick={doSubmit}
          disabled={isDisabled || !rating || !body.trim()}
          className="flex-1 rounded-full bg-black px-6 py-3 text-xs font-extrabold uppercase tracking-widest text-white disabled:opacity-60"
        >
          {busy === "uploading" ? "Uploading…" : busy === "submitting" ? "Submitting…" : "Submit"}
        </button>
        <button
          onClick={onCancel}
          disabled={isDisabled}
          className="rounded-full border border-gray-300 px-6 py-3 text-xs font-extrabold uppercase tracking-widest disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
