// src/components/ProductsSection.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { type ProductModel } from "@/lib/csv"; // type only, for shape compatibility
import { useRouter } from "next/navigation";

type Mode = "presale" | "discounted";
const CAMPAIGN_DEFAULT: Mode = "presale";

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** INR formatter for numeric values that might come from Firestore/CSV */
function fmtINR(v: unknown): string {
  if (typeof v === "number") return "₹ " + v.toLocaleString("en-IN");
  if (typeof v === "string") return v; // already formatted in CSV style
  return "";
}

/** Map one Firestore/CSV product object into the minimal ProductModel used here */
function mapDocToModel(doc: any): ProductModel {
  // Title fallbacks: prefer title → name → slug → id
  const title: string =
    (doc?.title || doc?.name || doc?.slug || doc?.id || "").toString();

  // Choose a single image (ProductsSection shows one)
  const image: string =
    (Array.isArray(doc?.images) && doc.images[0]) ||
    doc?.image ||
    "/assets/placeholder.png";

  // Accept both CSV headers and normalized Firestore fields
  const mrp = doc?.mrp ?? doc?.MRP;
  const discounted = doc?.discountedPrice ?? doc?.["discounted price"];
  const presale = doc?.presalePrice ?? doc?.["presale price"];
  const discountPct = doc?.discountPct ?? doc?.["discount percentage"];
  const presalePct = doc?.presalePct ?? doc?.["presale price percentage"];

  return {
    // fields your old CSV ProductModel expected/used here
    title,
    image,
    mrp: fmtINR(mrp),
    discountedPrice: fmtINR(discounted),
    presalePrice: fmtINR(presale),
    // keep badges as short strings if present
    discountPct:
      typeof discountPct === "number" ? `${discountPct}%` : (discountPct || ""),
    presalePct:
      typeof presalePct === "number" ? `${presalePct}%` : (presalePct || ""),
  } as ProductModel;
}

function getActivePrice(p: ProductModel, mode: Mode) {
  if (mode === "discounted") {
    return {
      label: "Discounted",
      value: p.discountedPrice || p.presalePrice || p.mrp || "",
      badge: p.discountPct || "",
    };
  }
  return {
    label: "Presale",
    value: p.presalePrice || p.discountedPrice || p.mrp || "",
    badge: p.presalePct || "",
  };
}

function classFromRel(rel: number, total: number) {
  if (rel === 0) return "carousel-center";
  if (rel === 1) return "carousel-right";
  if (rel === 2) return "carousel-far-right";
  if (rel === total - 1) return "carousel-left";
  if (rel === total - 2) return "carousel-far-left";
  return "carousel-off";
}

export default function ProductsSection() {
  const router = useRouter();

  const [products, setProducts] = useState<ProductModel[]>([]);
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return CAMPAIGN_DEFAULT;
    const qs = new URLSearchParams(window.location.search).get("price") as
      | Mode
      | null;
    return (
      (qs === "discounted"
        ? "discounted"
        : (localStorage.getItem("campaignMode") as Mode)) || CAMPAIGN_DEFAULT
    );
  });

  // Load from Firebase-backed API (falls back to CSV server-side if needed)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/products?limit=12`, { cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (res.ok && Array.isArray(body?.products)) {
          const mapped = body.products.map(mapDocToModel);
          setProducts(mapped);
          console.log(
            "[ProductsSection] loaded",
            mapped.length,
            "products from /api/products"
          );
        } else {
          console.warn(
            "[ProductsSection] /api/products failed",
            res.status,
            body
          );
        }
      } catch (e) {
        console.error("[ProductsSection] failed to load products:", e);
      }
    })();
  }, []);

  // Persist mode changes (optional: keeps your previous behavior)
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("campaignMode", mode);
    }
  }, [mode]);

  // auto-advance (circular)
  const idxRef = useRef(0);
  useEffect(() => {
    idxRef.current = idx;
  }, [idx]);
  useEffect(() => {
    if (!products.length) return;
    const t = setInterval(() => {
      setDir(1);
      setPrevIdx(idxRef.current);
      setIdx((idxRef.current + 1) % products.length);
    }, 7000);
    return () => clearInterval(t);
  }, [products.length]);

  const goPrev = () => {
    if (!products.length) return;
    setDir(-1);
    setPrevIdx(idx);
    setIdx((idx - 1 + products.length) % products.length);
  };
  const goNext = () => {
    if (!products.length) return;
    setDir(1);
    setPrevIdx(idx);
    setIdx((idx + 1) % products.length);
  };

  const current = products[idx];
  const active = current ? getActivePrice(current, mode) : null;

  return (
    <section
      id="products"
      className="relative py-24 bg-cover bg-center overflow-hidden scroll-mt-[120px]"
      style={{ backgroundImage: "url('/assets/design.png')" }}
    >
      <div className="absolute inset-0 bg-black/90 z-0 pointer-events-none" />

      <div className="relative z-10 max-w-[1200px] mx-auto">
        <div className="text-center mb-10">
          <img
            src="/assets/our-products-heading.png"
            alt="Our Products"
            className="mx-auto w-[260px] sm:w-[320px] md:w-[360px] h-auto"
          />
        </div>

        <div className="relative min-h-[680px] sm:min-h-[720px] md:min-h-[820px] flex items-center justify-center overflow-visible">
          {/* RING */}
          <div id="carouselContainer" className="h-full w-full">
            {products.map((p, i) => {
              const total = products.length || 1;
              const relPrev = mod(i - prevIdx, total);
              const relNow = mod(i - idx, total);

              // hide the “back row” cross when wrapping
              const teleports =
                (dir === 1 && relPrev === total - 2 && relNow === 2) ||
                (dir === -1 && relPrev === 2 && relNow === total - 2);

              const cls = [
                "carousel-item",
                classFromRel(relNow, total),
                teleports ? "no-transition" : "",
              ]
                .filter(Boolean)
                .join(" ");

              const openDetail = () =>
                router.push(`/product/${encodeURIComponent(p.title)}`);

              return (
                <div
                  key={i}
                  className={cls}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    if (i === idx) {
                      // center image → open
                      openDetail();
                    } else {
                      // side image → move to center, then open
                      setDir(i > idx ? 1 : -1);
                      setPrevIdx(idx);
                      setIdx(i);
                      setTimeout(openDetail, 250);
                    }
                  }}
                >
                  <img
                    src={encodeURI(p.image)}
                    alt={p.title}
                    className="transition hover:scale-105"
                  />
                </div>
              );
            })}
          </div>

          {/* Overlay */}
          <div className="relative z-20 text-center px-4 pt-[760px] sm:pt-[500px] md:pt-[580px] lg:pt-[800px] pointer-events-none">
            <div className="mt-2 flex items-center justify-center gap-2">
              <button
                id="campaignPresale"
                className={`pointer-events-auto px-3 py-1 rounded-full border border-white/40 text-white/90 text-xs hover:bg-white/10 ${mode === "presale" ? "bg-white/10" : ""
                  }`}
                onClick={() => setMode("presale")}
              >
                Presale
              </button>
              <button
                id="campaignDiscounted"
                className={`pointer-events-auto px-3 py-1 rounded-full border border-white/40 text-white/90 text-xs hover:bg-white/10 ${mode === "discounted" ? "bg-white/10" : ""
                  }`}
                onClick={() => setMode("discounted")}
              >
                Discounted
              </button>
            </div>

            <h2
              id="highlightedTitle"
              className="text-white font-extrabold tracking-tight text-3xl sm:text-4xl md:text-5xl drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]"
            >
              {current?.title || ""}
            </h2>

            <div className="mt-4 flex items-center justify-center gap-2">
              {current?.mrp && (
                <span className="text-white text-xl sm:text-2xl line-through opacity-60">
                  {current.mrp}
                </span>
              )}
              {active && (
                <>
                  <span className="text-white text-2xl sm:text-3xl md:text-4xl font-extrabold">
                    {active.value}
                  </span>
                  <span className="ml-2 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-pink-600 text-white uppercase">
                    {active.label}
                    {active.badge ? ` ${active.badge}` : ""}
                  </span>
                </>
              )}
            </div>

            <div className="mt-6">
              <button
                id="highlightedAddToCart"
                className="pointer-events-auto px-6 sm:px-8 md:px-10 py-3 sm:py-3.5 rounded-full font-extrabold transition
                           bg-pink-600 text-white hover:bg-pink-500 focus:outline-none
                           focus:ring-2 focus:ring-pink-400/50 shadow-md"
                onClick={() =>
                  current ? router.push(`/product/${current.title}`) : null
                }
              >
                {mode === "presale"
                  ? "Place your Pre-Launch Order"
                  : "+ ADD TO CART"}
              </button>
            </div>
          </div>

          {/* arrows */}
          <button
            id="productPrev"
            className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white text-black
                       rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center z-30 text-xl md:text-2xl shadow"
            onClick={goPrev}
            aria-label="Previous product"
          >
            ←
          </button>
          <button
            id="productNext"
            className="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 bg-white/85 hover:bg-white text-black
                       rounded-full w-10 h-10 md:w-12 md:h-12 flex items-center justify-center z-30 text-xl md:text-2xl shadow"
            onClick={goNext}
            aria-label="Next product"
          >
            →
          </button>
        </div>
      </div>
    </section>
  );
}
