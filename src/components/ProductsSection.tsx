// src/components/ProductsSection.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { type ProductModel } from "@/lib/csv";
import { useRouter } from "next/navigation";

type Mode = "presale" | "discounted";
const CAMPAIGN_DEFAULT: Mode = "presale";

const mod = (n: number, m: number) => ((n % m) + m) % m;

/* ---- money ---- */
function fmtINR(v: unknown): string {
  if (typeof v === "number") return "₹ " + v.toLocaleString("en-IN");
  if (typeof v === "string") return v;
  return "";
}

/* ---- map product ---- */
function mapDocToModel(doc: any): ProductModel {
  const title: string =
    (doc?.title || doc?.name || doc?.slug || doc?.id || "").toString();

  const image: string =
    (Array.isArray(doc?.images) && doc.images[0]) ||
    doc?.image ||
    "/assets/placeholder.png";

  const mrp = doc?.mrp ?? doc?.MRP;
  const discounted = doc?.discountedPrice ?? doc?.["discounted price"];
  const presale = doc?.presalePrice ?? doc?.["presale price"];
  const discountPct = doc?.discountPct ?? doc?.["discount percentage"];
  const presalePct = doc?.presalePct ?? doc?.["presale price percentage"];

  return {
    title,
    image,
    mrp: fmtINR(mrp),
    discountedPrice: fmtINR(discounted),
    presalePrice: fmtINR(presale),
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
    const qs = new URLSearchParams(window.location.search).get("price") as Mode | null;
    return (
      (qs === "discounted"
        ? "discounted"
        : (localStorage.getItem("campaignMode") as Mode)) || CAMPAIGN_DEFAULT
    );
  });

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

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("campaignMode", mode);
    }
  }, [mode]);

  // auto-advance (circular)
  const idxRef = useRef(0);
  useEffect(() => { idxRef.current = idx; }, [idx]);
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
      className="bleed-x relative bg-cover bg-center overflow-x-visible overflow-y-hidden
                 scroll-mt-[120px] overflow-anchor-none touch-pan-y
                 pt-14 md:pt-16 pb-16 md:pb-20"
      style={{
        backgroundImage: "url('/assets/design.png')",
        // Slightly taller ring so shorts are prominent (affects global CSS var locally)
        // tweak these numbers to taste
        ["--ring-height" as any]: "clamp(420px, 48vh, 860px)",
      }}
    >
      <div className="absolute inset-0 bg-black/90 z-0 pointer-events-none" />

      <div className="relative z-10 max-w-[1200px] mx-auto">
        {/* Title block — tighter gap to models */}
        <div className="text-center mb-2 md:mb-0">
          <img
            src="/assets/our-products-heading.png"
            alt="Our Products"
            className="mx-auto w-[220px] sm:w-[300px] md:w-[360px] h-auto"
          />
        </div>

        {/* Ring wrapper — nudged up; extra bottom padding for price/CTA */}
        <div
          className="relative -mt-5 sm:-mt-3 md:-mt-4
                     min-h-[600px] sm:min-h-[700px] md:min-h-[820px]
                     flex items-center justify-center overflow-visible
                     px-3 sm:px-0
                     pb-[300px] sm:pb-[310px] md:pb-[390px]"
        >
          {/* RING */}
          <div id="carouselContainer" className="h-full w-full overflow-anchor-none">
            {products.map((p, i) => {
              const total = products.length || 1;
              const relPrev = mod(i - prevIdx, total);
              const relNow = mod(i - idx, total);

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

              const openDetail = () => router.push(`/product/${encodeURIComponent(p.title)}`);

              return (
                <div
                  key={i}
                  className={cls}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    if (i === idx) {
                      openDetail();
                    } else {
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

          {/* Overlay — compact vertical rhythm */}
          <div
            className="absolute z-20 inset-x-0
             bottom-[-57px] sm:bottom-[-67px] md:bottom-[-80px]
             text-center px-4 pointer-events-none"
          >

            <div className="flex items-center justify-center gap-2">
              <button
                id="campaignPresale"
                className={`pointer-events-auto px-3 py-1 rounded-full border border-white/40 text-white/90 text-xs hover:bg-white/10 ${mode === "presale" ? "bg-white/10" : ""}`}
                onClick={() => setMode("presale")}
              >
                Presale
              </button>
              <button
                id="campaignDiscounted"
                className={`pointer-events-auto px-3 py-1 rounded-full border border-white/40 text-white/90 text-xs hover:bg-white/10 ${mode === "discounted" ? "bg-white/10" : ""}`}
                onClick={() => setMode("discounted")}
              >
                Discounted
              </button>
            </div>

            <h2
              id="highlightedTitle"
              className="mt-2 text-white font-extrabold tracking-tight
                         text-3xl sm:text-4xl md:text-5xl
                         drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]"
            >
              {current?.title || ""}
            </h2>

            <div className="mt-2 sm:mt-3 flex items-center justify-center gap-2">
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

            <div className="mt-4">
              <button
                id="highlightedAddToCart"
                className="pointer-events-auto px-6 sm:px-8 md:px-10
                           py-3 sm:py-3.5 rounded-full font-extrabold transition
                           bg-pink-600 text-white hover:bg-pink-500 focus:outline-none
                           focus:ring-2 focus:ring-pink-400/50 shadow-md"
                onClick={() => current ? router.push(`/product/${current.title}`) : null}
              >
                {mode === "presale" ? "Place your Pre-Launch Order" : "+ ADD TO CART"}
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
