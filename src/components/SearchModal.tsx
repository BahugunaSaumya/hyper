"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  title: string;
  slug: string;
  image: string;
  mrp?: string;
  discountedPrice?: string;
};

function normalize(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "");
}

export default function SearchModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [all, setAll] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Fetch all products once (shows all when query is empty)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/products?limit=1000", {next: { revalidate: 36000 }});
        const body = await res.json().catch(() => null);
        const items: Product[] = Array.isArray(body?.products)
          ? body.products.map((p: any) => ({
              title: String(p?.title || p?.name || ""),
              image:
                (Array.isArray(p?.images) && p.images[0]) ||
                p?.image ||
                "assets/placeholder.png",
              mrp: p?.mrp ?? p?.MRP,
              slug: p.slug ?? p.title,
              discountedPrice: p?.discountedPrice ?? p?.["discounted price"],
            }))
          : [];
        setAll(items);
      } catch {
        setAll([]);
      }
    })();
  }, []);

  // Filter (simple inclusive match on title)
  const results = useMemo(() => {
    const n = normalize(q.trim());
    if (!n) return all;
    return all.filter((p) => normalize(p.title).includes(n));
  }, [q, all]);

  // Focus the input when modal opens
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on ESC; Enter -> open selection; Arrow keys move selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((i) => (i + 1) % Math.max(1, results.length));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((i) => (i - 1 + Math.max(1, results.length)) % Math.max(1, results.length));
      }
      if (e.key === "Enter") {
        const p = results[idx];
        if (p) open(p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [results, idx, onClose]);

  // Keep active row in view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-i="${idx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [idx, results.length]);

  function open(p: Product) {
    onClose();
    router.push(`/product/${p.slug}`);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full sm:max-w-2xl mx-auto mt-20 sm:mt-0 px-4">
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-neutral-900 text-white">
          {/* Search bar */}
          <div className="flex items-center gap-3 px-4 sm:px-5 py-3 border-b border-white/10">
            <svg className="w-5 h-5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => { setQ(e.target.value); setIdx(0); }}
              placeholder="Search Hyper shorts…"
              className="flex-1 bg-transparent outline-none text-base placeholder-white/50"
            />
            <button onClick={onClose} className="text-white/70 hover:text-white">Esc</button>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="max-h-[60vh] overflow-auto divide-y divide-white/5"
          >
            {results.length === 0 && (
              <div className="px-5 py-6 text-white/70">No results.</div>
            )}

            {results.map((p, i) => {
              const active = i === idx;
              return (
                <button
                  key={p.title + i}
                  data-i={i}
                  onMouseEnter={() => setIdx(i)}
                  onClick={() => open(p)}
                  className={`w-full flex items-center gap-4 px-4 sm:px-5 py-3 text-left transition ${
                    active ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
               
                  <img
                    src={"../"+p.image}
                    alt=""
                    className="w-12 h-12 rounded object-cover bg-white/10"
                    draggable={false}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{p.title}</div>
                    <div className="text-xs text-white/60">
                      {p.discountedPrice || p.mrp || ""}
                    </div>
                  </div>
                  <div className="text-pink-400 text-sm font-bold hidden sm:block">View</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* mobile close hit-area on top-right */}
        <button
          onClick={onClose}
          aria-label="Close search"
          className="absolute -top-10 right-6 sm:hidden text-white/90"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
