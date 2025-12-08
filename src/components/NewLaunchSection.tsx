"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type ProductModel } from "@/lib/csv";
import { useRouter } from "next/navigation";
import Image from "next/image";

const RING_VARS = {
  height: {
    base: "clamp(420px, 48vh, 860px)",
    sm: "clamp(420px, 50vh, 880px)",
    md: "clamp(460px, 52vh, 920px)",
    lg: "clamp(480px, 54vh, 980px)",
  },
  near: { base: "50vw", sm: "26vw", md: "20vw", lg: "18vw" },
  far: { base: "52vw", sm: "48vw", md: "36vw", lg: "32vw" },
  itemGap: { base: "0px", sm: "2px", md: "4px", lg: "6px" },
  headingGap: { base: "-50px", sm: "-64px", md: "-24px", lg: "20px" },
};

const SPACING_VARS = {
  ringPadBottom: { base: "180px", sm: "200px", md: "220px", lg: "240px" },
  overlayOffset: { base: "30px", sm: "-24px", md: "-28px", lg: "-32px" },
};

/* Hook for responsive ring sizing */
function useRingVars() {
  const [w, setW] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setW(window.innerWidth);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  const bp = w == null ? "base" : w >= 1024 ? "lg" : w >= 768 ? "md" : w >= 640 ? "sm" : "base";
  return {
    "--ring-height": RING_VARS.height[bp],
    "--ring-near": RING_VARS.near[bp],
    "--ring-far": RING_VARS.far[bp],
    "--ring-item-gap": RING_VARS.itemGap[bp],
    "--heading-gap": RING_VARS.headingGap[bp],
    "--ring-pad-bottom": SPACING_VARS.ringPadBottom[bp],
    "--overlay-offset": SPACING_VARS.overlayOffset[bp],
  } as Record<string, string>;
}

/* ---- money helpers ---- */
function fmtINR(v: unknown): string {
  if (typeof v === "number") return "₹ " + v.toLocaleString("en-IN");
  if (typeof v === "string") return v;
  return "";
}
function toNumber(v: unknown): number | null {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v.replace(/[^\d.]/g, ""));
    return isNaN(n) ? null : n;
  }
  return null;
}

/* ---- map product ---- */
function mapDocToModel(doc: any): ProductModel & { _mrpNum: number | null; _discNum: number | null } {
  const title: string = (doc?.title || doc?.name || doc?.slug || doc?.id || "").toString();
  const slug: string = (doc?.slug || "").toString();
  const image: string =
    (Array.isArray(doc?.images) && doc.images[0]) || doc?.image || "/assets/placeholder.png";
  const mrp = doc?.mrp ?? doc?.MRP;
  const discounted = doc?.discountedPrice ?? doc?.["discounted price"];
  const discountPct = doc?.discountPct ?? doc?.["discount percentage"];
  const mrpNum = toNumber(mrp);
  const discNum = toNumber(discounted);

  return {
    title,
    slug,
    image,
    mrp: fmtINR(mrp),
    discountedPrice: fmtINR(discounted),
    discountPct: typeof discountPct === "number" ? `${discountPct}%` : (discountPct || ""),
    _mrpNum: mrpNum,
    _discNum: discNum,
  } as ProductModel & { _mrpNum: number | null; _discNum: number | null };
}

/* ---- relative positioning for carousel ---- */
function classFromRel(rel: number, total: number) {
  if (rel === 0) return "carousel-center";
  if (rel === 1) return "carousel-right";
  if (rel === 2) return "carousel-far-right";
  if (rel === total - 1) return "carousel-left";
  if (rel === total - 2) return "carousel-far-left";
  return "carousel-off";
}
const mod = (n: number, m: number) => ((n % m) + m) % m;

function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const set = () => setIsTouch(mq.matches);
    set();
    mq.addEventListener?.("change", set);
    return () => mq.removeEventListener?.("change", set);
  }, []);
  return isTouch;
}

export default function NewLaunchSection() {
  const router = useRouter();
  const cssVars = useRingVars();
  const isTouch = useIsTouch();

  const [products, setProducts] = useState<(ProductModel & { _mrpNum: number | null; _discNum: number | null })[]>([]);
  const [idx, setIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/products/new-launch?limit=12`, { next: { revalidate: 7200 }});
        const body = await res.json().catch(() => null);
        if (res.ok && Array.isArray(body?.products)) {
          const mapped = body.products.map(mapDocToModel);
          setProducts(mapped);
        } else {
          console.warn("[ProductsSection] /api/products/new-launch failed", res.status, body);
        }
      } catch (e) {
        console.error("[NewLaunchSection] failed to load products:", e);
      }
    })();
  }, []);

  /* Auto-advance carousel */
  const idxRef = useRef(0);
  const pausedRef = useRef(false);
  useEffect(() => { idxRef.current = idx; }, [idx]);
  useEffect(() => {
    if (!products.length) return;
    const t = setInterval(() => {
      if (pausedRef.current) return;
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

  /* Trackpad wheel — DISABLED on desktop; only for touch devices we rely on swipe */
  useEffect(() => {
    if (!isTouch) return; // do nothing on laptops/desktops
    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < 10) return;
      pausedRef.current = true;
      if (e.deltaX > 0) goNext();
      else goPrev();
      setTimeout(() => (pausedRef.current = false), 300);
    };
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTouch, products.length]);

  const current = products[idx];

  /* Calculate % off */
  const percentOff = useMemo(() => {
    if (!current) return "";
    if (current.discountPct && String(current.discountPct).trim()) return String(current.discountPct);
    if (current._mrpNum && current._discNum && current._mrpNum > 0) {
      const pct = Math.round(((current._mrpNum - current._discNum) / current._mrpNum) * 100);
      return pct > 0 ? `${pct}%` : "";
    }
    return "";
  }, [current]);

  const shownPrice = current?.discountedPrice || current?.mrp || "";

  /* Swipe / Drag — only ATTACHED on touch devices */
  const swipeStartX = useRef(0);
  const swipeDX = useRef(0);
  const dragging = useRef(false);
  const movedEnough = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const SWIPE_THRESHOLD = 40;
  const TAP_TOLERANCE = 8;

  const onPointerDown = (e: React.PointerEvent) => {
    if (!isTouch) return; // ignore on laptops/desktops
    if (!containerRef.current) return;
    containerRef.current.setPointerCapture?.(e.pointerId);
    dragging.current = true;
    movedEnough.current = false;
    swipeDX.current = 0;
    swipeStartX.current = e.clientX;
    pausedRef.current = true;
    (containerRef.current.style as any).cursor = "grabbing";
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isTouch || !dragging.current) return;
    swipeDX.current = e.clientX - swipeStartX.current;
    if (Math.abs(swipeDX.current) > TAP_TOLERANCE) movedEnough.current = true;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!isTouch) return;
    if (!containerRef.current) return;
    containerRef.current.releasePointerCapture?.(e.pointerId);
    (containerRef.current.style as any).cursor = "grab";
    const dx = swipeDX.current;
    dragging.current = false;
    setTimeout(() => { pausedRef.current = false; }, 200);
    if (Math.abs(dx) >= SWIPE_THRESHOLD) {
      if (dx < 0) goNext();
      else goPrev();
    }
  };
  if (!products.length) {
    return null;
  }

  return (
    <section
      id="new-launch-section"
      className="bleed-x relative bg-cover bg-center overflow-x-clip overflow-y-hidden
                overscroll-x-none touch-pan-y
                 pt-14 md:pt-16 pb-1 md:pb-20"
      style={{
        backgroundImage: "url('/assets/design.png')",
        ...cssVars,
        overflowX: "clip",
        overscrollBehaviorX: "none",
      }}
    >
      <div className="absolute inset-0 bg-black/90 z-0 pointer-events-none" />

      <div className="relative z-10 max-w-[1200px] mx-auto">
        {/* Section heading */}
        <div className="text-center" style={{ marginBottom: "var(--heading-gap)" }}>
          <img
            src="/assets/new-launch-logo.svg"
            alt="New Launch Products"
            className="mx-auto w-[220px] sm:w-[300px] md:w-[360px] h-auto"
          />
        </div>

        {/* Ring wrapper */}
        <div
          ref={containerRef}
          className="relative -mt-5 sm:-mt-3 md:-mt-4
                     min-h-[600px] sm:min-h-[700px] md:min-h-[820px]
                     flex items-center justify-center overflow-visible
                     px-3 sm:px-0"
          style={{ paddingBottom: "var(--ring-pad-bottom)", cursor: isTouch ? "grab" : "default" }}
          /* Attach handlers only on touch devices */
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
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

              const cls = ["carousel-item", classFromRel(relNow, total), teleports ? "no-transition" : ""]
                .filter(Boolean)
                .join(" ");

              const openDetail = () => router.push(`/product/${p.slug}`);

              return (
                <div
                  key={i}
                  className={cls}
                  style={{
                    cursor: isTouch ? (movedEnough.current ? "grabbing" : "pointer") : "pointer",
                    marginLeft: "var(--ring-item-gap)",
                    marginRight: "var(--ring-item-gap)",
                  }}
                  onClick={() => {
                    // Ignore click if it was a drag on touch
                    if (isTouch && movedEnough.current) return;
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
                    draggable={false}
                  />
                </div>
              );
            })}
          </div>

          {/* Overlay */}
          <div
            className="absolute z-30 inset-x-0 text-center px-4 pointer-events-none"
            style={{ bottom: "var(--overlay-offset)" }}
          >
            <h2
              id="highlightedTitle"
              className="mt-0 text-white font-extrabold tracking-tight
                         text-3xl sm:text-4xl md:text-5xl
                         drop-shadow-[0_2px_0_rgba(0,0,0,0.25)]"
            >
              {current?.title || ""}
            </h2>

            <div className="mt-2 sm:mt-3 flex items-center justify-center gap-2">
              {!!current?.mrp && current?.mrp !== shownPrice && (
                <span className="text-white text-xl sm:text-2xl line-through opacity-60">
                  {current.mrp}
                </span>
              )}
              <span className="text-white text-2xl sm:text-3xl md:text-4xl font-extrabold">
                {shownPrice}
              </span>
              {!!percentOff && (
                <span className="ml-2 text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-pink-600 text-white uppercase">
                  {percentOff} OFF
                </span>
              )}
            </div>
          </div>

          {/* Arrow buttons — ALWAYS visible & clickable */}
          <button
            id="productPrev"
            className="grid place-items-center absolute left-4 md:left-6 top-1/2 -translate-y-1/2 
                       rounded-full w-10 h-10 md:w-12 md:h-12 z-40
                       pointer-events-auto"
            onClick={goPrev}
            aria-label="Previous product"
          >

            <Image
              src="/assets/left-arrow.avif"
              alt="Previous"
              width={40}
              height={40}
              className="rounded-full shadow cursor-pointer"
              unoptimized
            />
          </button>
          <button
            id="productNext"
            className="grid place-items-center absolute right-4 md:right-6 top-1/2 -translate-y-1/2 
                       rounded-full w-10 h-10 md:w-12 md:h-12 z-40
                       pointer-events-auto"
            onClick={goNext}
            aria-label="Next product"
          >
            <Image
              src="/assets/right-arrow.avif"
              alt="Next"
              width={40}
              height={40}
              className="rounded-full shadow cursor-pointer"
              unoptimized
            />
          </button>
        </div>
      </div>
    </section>
  );
}
