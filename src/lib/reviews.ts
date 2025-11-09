// src/lib/reviews.ts
export async function saveReviewWithImages(opts: {
  productId: string;
  rating: number;
  body: string;
  files: File[];
  getToken: () => Promise<string | undefined>;
}) {
  const { productId, rating, body, files, getToken } = opts;

  const tok = await getToken();
  if (!tok) throw new Error("Please log in to add a review.");

  // 1) upload images (if any)
  let imageUrls: string[] = [];
  if (files && files.length) {
    const fd = new FormData();
    fd.append("productId", productId);
    files.forEach((f) => fd.append("images", f));
    const up = await fetch("/api/reviews/upload", {
      method: "POST",
      headers: { authorization: `Bearer ${tok}` },
      body: fd,
    });
    const upj = await up.json().catch(() => null);
    if (!up.ok) throw new Error(upj?.error || "Image upload failed");
    imageUrls = Array.isArray(upj?.urls) ? upj.urls : [];
  }

  // 2) post review (upsert by productId+user)
  const res = await fetch("/api/reviews", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: `Bearer ${tok}` },
    body: JSON.stringify({ productId, rating, body, images: imageUrls }),
  });
  const j = await res.json().catch(() => null);
  if (!res.ok) throw new Error(j?.error || "Failed to save review");

  // { average, count } are persisted to product doc too
  return { id: j?.id as string, aggregates: j?.aggregates as { average: number; count: number } | undefined };
}
