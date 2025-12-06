"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useCart } from "@/context/CartContext";
import FaqSection from "@/components/FaqSection";
import FooterSection from "@/components/FooterSection";
import YouMayAlsoLike from "./YouMayAlsoLike";

/* ===========================
   GLOBAL LAYOUT VARIABLES
   =========================== */

const PAGE_SIDE_PADDING = "px-[8px] sm:px-4 md:px-10";
const PAGE_OVERFLOW_FIX = true;

const THUMB_SCROLL_GAP = "gap-[6.5px] sm:gap-3";
const THUMB_SCROLL_HEIGHT = "h-16 w-16 sm:h-20 sm:w-20";
const THUMB_SCROLL_ANIMATION = true;

const HERO_FULLBLEED_MOBILE = true;
const HERO_ASPECT_RATIO = "aspect-[12/14] sm:aspect-square lg:aspect-[4/5]";
const HERO_MIN_H_MOBILE = "min-h-[300px]";
const HERO_MIN_H_TABLET = "sm:min-h-[400px]";
const HERO_MIN_H_DESKTOP = "lg:min-h-[500px]";

const TITLE_SIZE = "text-3xl sm:text-4xl md:text-5xl";
const PRICE_SIZE = "text-2xl sm:text-3xl md:text-4xl";

const STACK_QTY_AND_BUTTON = true;
const STACK_SPACING = "gap-3";
const QTY_WIDTH = "w-33 sm:w-25";
const QTY_FULL_WIDTH = "w-full max-w-[410px]";

const DESC_USE_BULLETS = true;
const DESC_LIST_SPACE = "space-y-2 sm:space-y-3";
const DESC_ICON_CLASS = "mt-1 inline-block h-2 w-2 rounded-full bg-pink-500";
const DESC_TEXT_CLASS = "leading-relaxed";

/* ---------- types ---------- */
type ProductModel = {
  id?: string;
  title?: string;
  slug?: string;
  name?: string;
  subtitle?: string;
  desc?: string;
  description?: string;
  image?: string;
  images?: string[];
  gender?: string;
  rating?: number;
  mrp?: any;
  discountedPrice?: any;
  presalePrice?: any;
  price?: any;
  discountPct?: string | number;
  presalePct?: string | number;
  sizes?: string[] | string;
  new_launch?: boolean;
  categories?: string[] | string;
};

/* ---------- helpers ---------- */
const toAbs = (s?: string) => (!s ? "" : s.startsWith("/") ? s : `/${s}`);
const dirFrom = (p: ProductModel) => (p.slug || p.title || "").trim();
const NAMES = ["1", "2", "3", "4", "5", "6"];

function galleryCandidates(dir: string) {
  const base = `/assets/models/products/${dir}`;
  return NAMES.map((n) => `${base}/${n}.avif`);
}
function normalizeCsvImage(img: string | undefined, dir: string) {
  if (!img) return "";
  if (img.startsWith("/assets/models/products")) return img;
  if (/^\d+\.(jpe?g)$/i.test(img)) return `/assets/models/products/${dir}/${img}`;
  if (/^assets\//i.test(img)) return `/${img}`;
  return img.startsWith("/") ? img : `/${img}`;
}
function coverFor(p: ProductModel) {
  const dir = dirFrom(p);
  const norm = normalizeCsvImage(p.image as any, dir);
  return norm || galleryCandidates(dir)[0] || "";
}
const pickPrice = (p: ProductModel) =>
  p.price || p.discountedPrice || p.presalePrice || p.mrp || "";

const coerceSizes = (sizes: ProductModel["sizes"]) => {
  if (Array.isArray(sizes)) return sizes.filter(Boolean);
  return String(sizes || "XS,S,M,L,XL").split(/[\s,\/|]+/).filter(Boolean);
};

/* ---------- Stars ---------- */
function Stars({ rating = 4.6 }: { rating?: number }) {
  const r = Math.round(rating);
  return (
    <div className="flex items-center gap-1 text-pink-600 text-sm" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i}>{i < r ? "★" : "☆"}</span>
      ))}
    </div>
  );
}

/* ---------- map Firestore doc ---------- */
function mapDoc(doc: any): ProductModel {
  const title = (doc?.title ?? doc?.name ?? doc?.slug ?? doc?.id ?? "").toString();
  const numToStr = (v: any) => (typeof v === "number" ? v : typeof v === "string" ? v : undefined);

  const sizes =
    Array.isArray(doc?.sizes)
      ? doc.sizes
      : typeof doc?.sizes === "string"
        ? doc.sizes.split(/[\s,\/|]+/).map((s: string) => s.trim()).filter(Boolean)
        : undefined;

  return {
    id: doc?.id,
    title,
    slug: doc?.slug ?? title,
    subtitle: doc?.subtitle,
    desc: doc?.desc ?? doc?.description ?? "",
    description: doc?.description ?? doc?.desc ?? "",
    gender: doc?.gender,
    rating: typeof doc?.rating === "number" ? doc.rating : undefined,
    mrp: numToStr(doc?.mrp ?? doc?.MRP),
    discountedPrice: numToStr(doc?.discountedPrice ?? doc?.["discounted price"]),
    presalePrice: numToStr(doc?.presalePrice ?? doc?.["presale price"]),
    price: numToStr(doc?.price),
    discountPct: doc?.discountPct ?? doc?.["discount percentage"],
    presalePct: doc?.presalePct ?? doc?.["presale price percentage"],
    new_launch: ["1", 1, true, "true"].includes(doc?.new_launch),
    categories: doc?.categories ?? [],
    sizes,
  };
}

/* ------------------ fly-to-cart helper (no external deps) ----------------- */
function flyToCartFrom(sourceEl: HTMLElement | null, imgSrc: string) {
  try {
    if (!sourceEl || !imgSrc) return;
    const rect = sourceEl.getBoundingClientRect();

    const ghost = document.createElement("img");
    ghost.src = imgSrc;
    ghost.alt = "";
    Object.assign(ghost.style, {
      position: "fixed",
      left: `${rect.left + rect.width / 2 - 40}px`,
      top: `${rect.top + rect.height / 2 - 40}px`,
      width: "80px",
      height: "80px",
      objectFit: "cover",
      borderRadius: "12px",
      zIndex: "9999",
      pointerEvents: "none",
      opacity: "0.95",
      transition: "transform 700ms cubic-bezier(.22,.61,.36,1), opacity 700ms",
      transform: "translate3d(0,0,0) scale(1)",
      boxShadow: "0 10px 30px rgba(0,0,0,.35)",
      background: "#fff",
    } as CSSStyleDeclaration);

    document.body.appendChild(ghost);

    // end position (simulate cart at top-right)
    const endX = window.innerWidth - 40; // a bit off screen right
    const endY = 24;                     // near top bar
    // translate relative to current
    const dx = endX - (rect.left + rect.width / 2);
    const dy = endY - (rect.top + rect.height / 2);

    // next frame for transition
    requestAnimationFrame(() => {
      ghost.style.transform = `translate3d(${dx}px, ${dy}px, 0) scale(.1)`;
      ghost.style.opacity = "0.15";
    });

    setTimeout(() => {
      ghost.remove();
      // optional: emit a small event other components could listen to
      window.dispatchEvent(new CustomEvent("cart:ping"));
    }, 740);
  } catch { }
}

/* ================================================== */

export default function ProductDetailView({ product }: { product: ProductModel }) {
  const { add } = useCart();
  const [full, setFull] = useState<ProductModel>(product);

  /* hydrate product */
  useEffect(() => {
    const key = (product.title || product.slug || product.id || "").toString();
    if (!key) return;
    (async () => {
      try {
        const res = await fetch("/api/products?limit=200", { cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(body?.products)) return;
        const list = body.products as any[];
        const found =
          list.find((d) => (d?.title ?? d?.name ?? d?.slug ?? d?.id) === key) ||
          list.find((d) => d?.slug === key) ||
          list.find((d) => d?.id === key);
        if (!found) return;
        const mapped = mapDoc(found);
        setFull((prev) => ({ ...prev, ...mapped }));
      } catch { }
    })();
  }, [product]);

  const title = full.title || product.title || "";
  const subtitle = full.subtitle || product.subtitle || "";
  const rating = full.rating ?? 4.6;
  const sizes = useMemo(() => coerceSizes(full.sizes), [full.sizes]);
  const displayPrice = pickPrice(full);

  /* gallery */
  const dir = useMemo(() => dirFrom(full), [full.slug, full.title]);
  const [images, setImages] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  const heroImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const prime = normalizeCsvImage("", dir);
    const extras = galleryCandidates(dir);
    const list = Array.from(new Set([prime, ...extras].filter(Boolean))).map(toAbs);
    setImages(list);
    setActive(0);
  }, [dir]);

  const onThumbError = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setActive((a) => (a >= idx ? Math.max(0, a - 1) : a));
  };

  const hero = images[active] || toAbs(coverFor(full));

  /* cart logic */
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);
  const [flash, setFlash] = useState(false); // brief color change

  const handleAdd = (btnEl?: HTMLButtonElement | null) => {
    if (!selectedSize) {
      setNotice("Please select a size to continue.");
      setTimeout(() => setNotice(null), 2000);
      return;
    }

    add({
      id: full.id ?? `${title}__${selectedSize}`,
      name: title,
      slug : full.slug ?? title,
      size: selectedSize,
      price: String(displayPrice),
      image: hero,
      quantity: qty,
      newLaunch: full.new_launch ?? false
    });

    // visual feedback
    flyToCartFrom(heroImgRef.current as unknown as HTMLElement, hero);
    setFlash(true);
    setTimeout(() => setFlash(false), 650);
  };

  /* description bullets */
  const bulletPoints = useMemo(() => {
    const raw = String(full.description || "").trim();
    if (!raw) return [];
    return raw
      .split(/(?:\u2022|•|\r?\n)+/g)
      .map((s) => s.replace(/^[\s•\-–]+/, "").trim())
      .filter(Boolean);
  }, [full.description]);

  /* ===== TOUCH SWIPE on HERO only ===== */
  const tStartX = useRef(0);
  const tDX = useRef(0);
  const tDragging = useRef(false);
  const SWIPE_THRESHOLD = 23; // px

  const onTouchStartHero = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    tDragging.current = true;
    tStartX.current = e.touches[0].clientX;
    tDX.current = 0;
  };
  const onTouchMoveHero = (e: React.TouchEvent) => {
    if (!tDragging.current) return;
    tDX.current = e.touches[0].clientX - tStartX.current;
  };
  const onTouchEndHero = () => {
    if (!tDragging.current) return;
    const dx = tDX.current;
    tDragging.current = false;
    tDX.current = 0;

    if (Math.abs(dx) > SWIPE_THRESHOLD && images.length > 1) {
      if (dx < 0) setActive((i) => (i + 1) % images.length); // left -> next
      else setActive((i) => (i - 1 + images.length) % images.length); // right -> prev
    }
  };

  return (
    <><div
      className={`w-full max-w-6xl mx-auto py-6 sm:py-8 md:py-10 ${PAGE_OVERFLOW_FIX ? "overflow-x-clip" : ""}`}
    >
      <div className="grid md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 w-full">
        {/* ========= GALLERY ========= */}
        <div className="w-full min-w-0">
          <div className="grid md:grid-cols-[5rem_1fr] lg:grid-cols-[6rem_1fr] gap-3 md:gap-5">
            {/* HERO IMAGE */}
            <div className="order-1 md:order-2 min-w-0">
              <div
                className={`relative w-full max-w-full overflow-hidden ${HERO_FULLBLEED_MOBILE ? "rounded-none bg-transparent shadow-none" : "rounded-2xl sm:rounded-3xl bg-white shadow"} ${HERO_ASPECT_RATIO} ${HERO_MIN_H_MOBILE} ${HERO_MIN_H_TABLET} ${HERO_MIN_H_DESKTOP}`}
                style={{ touchAction: "pan-y" }}
                onTouchStart={onTouchStartHero}
                onTouchMove={onTouchMoveHero}
                onTouchEnd={onTouchEndHero}
                onTouchCancel={onTouchEndHero}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {hero ? (
                  <img
                    ref={heroImgRef}
                    src={hero}
                    alt={title}
                    className="block h-full w-full max-w-full object-contain transition-all duration-300"
                    loading="eager"
                    draggable={false} />
                ) : (
                  <div className="grid h-full w-full place-items-center text-gray-400">No image</div>
                )}
              </div>

              {/* MOBILE THUMB STRIP */}
              <div
                className={`mt-3 px-1 flex ${THUMB_SCROLL_GAP} overflow-x-auto md:hidden ${THUMB_SCROLL_ANIMATION ? "snap-x snap-mandatory overscroll-x-contain scroll-smooth touch-pan-x no-scrollbar" : ""}`}
              >
                {images.map((src, i) => (
                  <button
                    key={`${src}__m${i}`}
                    onClick={() => setActive(i)}
                    className={`flex-shrink-0 ${THUMB_SCROLL_HEIGHT} overflow-hidden rounded-lg border transition ${i === active ? "border-black" : "border-gray-200"} snap-start`}
                    aria-label={`View ${title} image ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`${title} ${i + 1}`}
                      className="block h-full w-full object-cover"
                      onError={() => onThumbError(i)}
                      draggable={false} />
                  </button>
                ))}
              </div>
            </div>

            {/* DESKTOP VERTICAL THUMBS */}
            <div className="order-2 md:order-1 hidden md:flex md:flex-col gap-2 md:gap-3 overflow-y-auto md:max-h-[min(80vh,40rem)] pr-1 min-w-0">
              {images.map((src, i) => (
                <button
                  key={`${src}__d${i}`}
                  onClick={() => setActive(i)}
                  className={`h-16 w-16 lg:h-20 lg:w-20 overflow-hidden rounded-lg border transition ${i === active ? "border-black" : "border-gray-200"}`}
                  aria-label={`View ${title} image ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${title} ${i + 1}`}
                    className="block h-full w-full object-cover"
                    onError={() => onThumbError(i)}
                    draggable={false} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={`${PAGE_SIDE_PADDING}`}>
          {/* ========= INFO ========= */}
          <div className="w-full md:ml-2 min-w-0">
            <div className="text-[11px] sm:text-xs uppercase tracking-widest text-gray-500">Shop / product</div>
            <h1 className={`mt-2 ${TITLE_SIZE} font-extrabold tracking-tight`}>{title}</h1>
            {subtitle && <div className="mt-1 text-xs sm:text-sm text-gray-500">{subtitle}</div>}

            <div className="mt-3 flex items-center md:ml-1 gap-4 sm:gap-4">
              <span className={`${PRICE_SIZE} font-extrabold leading-tight`}>{"₹" + String(displayPrice)}</span>
              <Stars rating={rating} />
            </div>

            {/* Sizes */}
            {sizes.length > 0 && (
              <div className="mt-5 sm:mt-6">
                <div className="mb-2 text-[11px] sm:text-xs font-semibold uppercase tracking-widest text-gray-600">
                  Select Size
                </div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSelectedSize(s)}
                      className={`rounded-md border px-3 py-2 text-sm font-medium transition ${selectedSize === s ? "border-pink-500 bg-pink-50 text-pink-600" : "border-gray-300"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Qty + Add to Cart */}
            <div className={`mt-5 sm:mt-6 ${STACK_QTY_AND_BUTTON ? `flex flex-col ${STACK_SPACING}` : "flex items-center gap-3"}`}>
              <div
                className={`${STACK_QTY_AND_BUTTON ? QTY_FULL_WIDTH : QTY_WIDTH} flex items-center justify-between rounded-full border px-2.5 sm:px-3 py-1.5 sm:py-2`}
              >
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-2 sm:px-3 text-lg sm:text-xl"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <div className="text-sm sm:text-base font-semibold">{qty}</div>
                <button
                  onClick={() => setQty((q) => q + 1)}
                  className="px-2 sm:px-3 text-lg sm:text-xl"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <button
                onClick={(e) => handleAdd(e.currentTarget)}
                className={`${STACK_QTY_AND_BUTTON ? QTY_FULL_WIDTH : "flex-1"} rounded-full px-5 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-extrabold uppercase tracking-widest text-white shadow-lg transition
                  ${flash ? "bg-pink-600" : "bg-black hover:bg-pink-600"}`}
              >
                Add to Cart
              </button>
            </div>

            {notice && (
              <div className="mt-3 rounded-md bg-pink-50 px-4 py-2 text-center text-pink-700">
                {notice}
              </div>
            )}

            {/* Description */}
            {DESC_USE_BULLETS ? (
              bulletPoints.length > 0 ? (
                <ul className={`mt-6 sm:mt-8 ${DESC_LIST_SPACE} text-gray-700`}>
                  {bulletPoints.map((line, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span aria-hidden className={DESC_ICON_CLASS} />
                      <span className={DESC_TEXT_CLASS}>{line}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                full.description && (
                  <div
                    className="prose prose-xs sm:prose-sm md:prose mt-6 sm:mt-8 max-w-none text-gray-700"
                    dangerouslySetInnerHTML={{ __html: full.description as string }} />
                )
              )
            ) : (
              full.description && (
                <div
                  className="prose prose-xs sm:prose-sm md:prose mt-6 sm:mt-8 max-w-none text-gray-700"
                  dangerouslySetInnerHTML={{ __html: full.description as string }} />
              )
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 mb-3 sm:mt-14 md:mt-16">
        <YouMayAlsoLike excludeTitle="" limit={4} />
      </div>
    </div><FaqSection /><FooterSection /></>
  );
}
