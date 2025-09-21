// src/components/ProductDetailView.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import FaqSection from "@/components/FaqSection";
import ContactSection from "@/components/ContactSection";
import YouMayAlsoLike from "./YouMayAlsoLike";

/* ---------- lightweight ProductModel shape ---------- */
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
  category?: string;
  rating?: number;

  // prices (string or number acceptable; we render them)
  mrp?: any;
  discountedPrice?: any;
  presalePrice?: any;
  price?: any;

  // badges
  discountPct?: string | number;
  presalePct?: string | number;

  // sizes can be array or csv string
  sizes?: string[] | string;
};

/* ---------- helpers (unchanged visual logic) ---------- */
const toAbs = (s?: string) => (!s ? "" : s.startsWith("/") ? s : `/${s}`);
const dirFrom = (p: ProductModel) => (p.slug || p.title || "").trim();

const NAMES = ["1", "2", "3", "4", "5", "6"];
function galleryCandidates(dir: string) {
  const base = `/assets/models/products/${dir}`;
  return NAMES.map((n) => `${base}/${n}.jpg`);
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

/* prefer a price in this order */
const pickPrice = (p: ProductModel) =>
  p.price || p.discountedPrice || p.presalePrice || p.mrp || "";

/* normalize sizes */
const coerceSizes = (sizes: ProductModel["sizes"]) => {
  if (Array.isArray(sizes)) return sizes.filter(Boolean);
  return String(sizes || "XS,S,M,L,XL").split(/[\s,\/|]+/).filter(Boolean);
};

/* tiny stars component */
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

/* ---------- map Firestore doc to our model (no image reliance) ---------- */
function mapDoc(doc: any): ProductModel {
  const title = (doc?.title ?? doc?.name ?? doc?.slug ?? doc?.id ?? "").toString();
  const numToStr = (v: any) => (typeof v === "number" ? v : typeof v === "string" ? v : undefined);
  const mrp = doc?.mrp ?? doc?.MRP;
  const discounted = doc?.discountedPrice ?? doc?.["discounted price"];
  const presale = doc?.presalePrice ?? doc?.["presale price"];

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
    category: doc?.category,
    rating: typeof doc?.rating === "number" ? doc.rating : undefined,

    mrp: numToStr(mrp),
    discountedPrice: numToStr(discounted),
    presalePrice: numToStr(presale),
    price: numToStr(doc?.price),

    discountPct: doc?.discountPct ?? doc?.["discount percentage"],
    presalePct: doc?.presalePct ?? doc?.["presale price percentage"],
    sizes,
  };
}

/* ================================================== */

export default function ProductDetailView({ product }: { product: ProductModel }) {
  const { add } = useCart();

  /* 1) HYDRATE product from Firebase (not CSV) */
  const [full, setFull] = useState<ProductModel>(product);

  useEffect(() => {
    const key = (product.title || product.slug || product.id || "").toString();
    if (!key) return;

    (async () => {
      try {
        // Pull a reasonable page; server reads Firestore first
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
        setFull((prev) => ({
          ...prev,
          title: prev.title || mapped.title,
          slug: prev.slug || mapped.slug,
          subtitle: prev.subtitle || mapped.subtitle,
          desc: prev.desc || mapped.desc,
          description: (prev as any).description || mapped.description || "",
          category: prev.category || mapped.category,
          rating: typeof prev.rating === "number" ? prev.rating : mapped.rating,
          sizes:
            (prev.sizes && (Array.isArray(prev.sizes) ? prev.sizes.length : String(prev.sizes).trim().length))
              ? prev.sizes
              : mapped.sizes,
          mrp: prev.mrp ?? mapped.mrp,
          discountedPrice: prev.discountedPrice ?? mapped.discountedPrice,
          presalePrice: prev.presalePrice ?? mapped.presalePrice,
          price: prev.price ?? mapped.price,
        }));
      } catch { }
    })();
  }, [product]);

  const title = full.title || product.title || "";
  const subtitle = full.subtitle || product.subtitle || "";
  const rating = (full as any).rating ?? 4.6;
  const sizes = useMemo(() => coerceSizes(full.sizes), [full.sizes]);
  const displayPrice = pickPrice(full);

  /* 2) image viewer (assets-based: hero + thumbs) */
  const dir = useMemo(() => dirFrom(full), [full.slug, full.title]);
  const [images, setImages] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    // force assets gallery; ignore any doc/CSV image by leaving it empty
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

  /* 3) size required + notice + qty */
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [qty, setQty] = useState(1);
  const [notice, setNotice] = useState<string | null>(null);

  const handleAdd = () => {
    if (!selectedSize) {
      setNotice("Please select a size to continue.");
      setTimeout(() => setNotice(null), 2000);
      return;
    }
    add({
      id: full.id ?? `${title}__${selectedSize}`,
      name: title,
      size: selectedSize,
      price: String(displayPrice),
      image: hero,
      quantity: qty,
    });
  };

  /* 4) YOU MAY ALSO LIKE (from Firestore; images from assets) */
  const [also, setAlso] = useState<ProductModel[]>([]);
  useEffect(() => {
    if (!title) return;
    (async () => {
      try {
        const res = await fetch("/api/products?limit=12", { cache: "no-store" });
        const body = await res.json().catch(() => null);
        if (!res.ok || !Array.isArray(body?.products)) return;
        const docs = body.products as any[];
        const mapped = docs.map(mapDoc).filter((p) => (p.title ?? "") !== title).slice(0, 8);
        setAlso(mapped);
      } catch { }
    })();
  }, [title]);

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 md:px-10 py-6 sm:py-8 md:py-10">
      {/* Two columns on md+: [GALLERY | INFO]. On mobile it stacks. */}
      <div className="grid md:grid-cols-2 gap-6 sm:gap-8 md:gap-12 w-full">
        {/* ========= GALLERY ========= */}
        <div className="w-full">
          {/* Desktop: thumbs LEFT, hero RIGHT. Mobile: hero first, thumbs below */}
          <div className="grid md:grid-cols-[5rem_1fr] lg:grid-cols-[6rem_1fr] gap-3 md:gap-5">
            {/* HERO */}
            <div className="order-1 md:order-2">
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {hero ? (
                  <img src={hero} alt={title} className="h-full w-full object-contain" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-gray-400">No image</div>
                )}
              </div>

              {/* Mobile thumbs: horizontal under hero */}
              <div className="mt-3 flex gap-2 sm:gap-3 overflow-x-auto md:hidden">
                {images.map((src, i) => (
                  <button
                    key={`${src}__m${i}`}
                    onClick={() => setActive(i)}
                    className={`flex-shrink-0 h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-lg border transition ${i === active ? "border-black" : "border-gray-200"
                      }`}
                    aria-label={`View ${title} image ${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`${title} ${i + 1}`}
                      className="h-full w-full object-cover"
                      onError={() => onThumbError(i)}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop thumbs: vertical on the left */}
            <div className="order-2 md:order-1 hidden md:flex md:flex-col gap-2 md:gap-3 overflow-y-auto md:max-h-[min(80vh,40rem)] pr-1">
              {images.map((src, i) => (
                <button
                  key={`${src}__d${i}`}
                  onClick={() => setActive(i)}
                  className={`h-16 w-16 lg:h-20 lg:w-20 overflow-hidden rounded-lg border transition ${i === active ? "border-black" : "border-gray-200"
                    }`}
                  aria-label={`View ${title} image ${i + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`${title} ${i + 1}`}
                    className="h-full w-full object-cover"
                    onError={() => onThumbError(i)}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ========= INFO ========= */}
        <div className="w-full">
          {/* breadcrumb + title + rating */}
          <div className="text-[11px] sm:text-xs uppercase tracking-widest text-gray-500">Shop / product</div>
          <h1 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold">{title}</h1>
          {subtitle ? <div className="mt-1 text-xs sm:text-sm text-gray-500">{subtitle}</div> : null}

          <div className="mt-3 flex items-center gap-3 sm:gap-4">
            <span className="text-lg sm:text-xl font-bold">{String(displayPrice)}</span>
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
                    className={`rounded-md border px-3 py-2 text-sm font-medium transition ${selectedSize === s ? "border-pink-500 bg-pink-50 text-pink-600" : "border-gray-300"
                      }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Qty pill + ADD TO CART */}
          <div className="mt-5 sm:mt-6 flex items-center gap-3">
            <div className="flex w-36 sm:w-40 items-center justify-between rounded-full border px-2.5 sm:px-3 py-1.5 sm:py-2">
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
              onClick={handleAdd}
              className="flex-1 rounded-full bg-black px-5 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-extrabold uppercase tracking-widest text-white shadow-lg transition hover:bg-pink-600"
            >
              Add to Cart
            </button>
          </div>

          {/* pretty notice if size not picked */}
          {notice && (
            <div className="mt-3 rounded-md bg-pink-50 px-4 py-2 text-center text-pink-700">
              {notice}
            </div>
          )}

          {/* Description */}
          {full.description && (
            <div
              className="prose prose-xs sm:prose-sm md:prose mt-6 sm:mt-8 max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: full.description as string }}
            />
          )}
        </div>
      </div>

      {/* ========= YOU MAY ALSO LIKE ========= */}
      <div className="mt-12 sm:mt-14 md:mt-16">
        <YouMayAlsoLike excludeTitle="" limit={4} />
      </div>

      {/* ========= FAQ + Contact ========= */}
      <div className="mt-12 sm:mt-14 md:mt-16">
        <FaqSection />
      </div>
      <div className="mt-12 sm:mt-14 md:mt-16">
        <ContactSection />
      </div>
    </div>
  );
}


