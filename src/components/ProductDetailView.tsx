"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { mapProducts, parseCSV, type ProductModel } from "@/lib/csv";
import { useCart } from "@/context/CartContext";
import FaqSection from "@/components/FaqSection";
import ContactSection from "@/components/ContactSection";
import ProductTile from "@/components/ProductTile";

/* ---------- helpers (unchanged behavior) ---------- */
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
  const norm = normalizeCsvImage(p.image, dir);
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

/* tiny stars component to match the SS */
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

/* ================================================== */

export default function ProductDetailView({ product }: { product: ProductModel }) {
  const { add } = useCart();

  /* 1) HYDRATE product from CSV so desc/sizes/price always show */
  const [full, setFull] = useState<ProductModel>(product);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/assets/hyper-products-sample.csv", { cache: "no-cache" });
        const txt = await res.text();
        const all = mapProducts(parseCSV(txt));
        const meTitle = (product.title || "").toLowerCase();
        const meSlug = (product.slug || "").toLowerCase();
        const found =
          all.find(
            (p) =>
              (p.title || "").toLowerCase().trim() === meTitle ||
              (p.slug || "").toLowerCase().trim() === meSlug
          );

        setFull((prev) => {
          if (!found) return prev;

          // sizes can be array or CSV string
          const sizes =
            Array.isArray(found.sizes)
              ? found.sizes.filter(Boolean)
              : String(found.sizes || "")
                .split(/[\s,\/|]+/)
                .map((s) => s.trim())
                .filter(Boolean);

          // rating may be string/number/null
          const rating =
            prev.rating ?? (found.rating !== undefined && found.rating !== null
              ? Number(found.rating as any)
              : null);

          return {
            // keep everything you already had on state
            ...prev,

            // hydrate every ProductModel field from CSV if missing
            title: prev.title || found.title || "",
            desc: prev.desc || (found as any).desc || (found as any).description || "",
            // also provide 'description' alias so your UI that reads full.description works
            description:
              (prev as any).description ||
              (found as any).description ||
              (found as any).desc ||
              "",

            mrp: prev.mrp || (found as any).mrp || "",
            discountedPrice:
              prev.discountedPrice || (found as any).discountedPrice || "",
            discountPct: prev.discountPct || (found as any).discountPct || "",
            presalePrice: prev.presalePrice || (found as any).presalePrice || "",
            presalePct: prev.presalePct || (found as any).presalePct || "",
            category: prev.category || (found as any).category || "",
            image: prev.image || (found as any).image || "",
            rating,

            // sizes normalized
            sizes: prev.sizes && prev.sizes.length ? prev.sizes : sizes,

            // keep slug if your helpers use it
            slug: (prev as any).slug || (found as any).slug || (prev as any).title || "",

            // keep your existing price preference chain working downstream
            price:
              (prev as any).price ||
              (found as any).price ||
              (found as any).discountedPrice ||
              (found as any).presalePrice ||
              (found as any).mrp ||
              "",
          } as typeof prev;
        });
      } catch (e) {
        // if CSV fails, keep incoming product as-is
        setFull(product);
      }
    })();
  }, [product]);

  const title = full.title || product.title || "";
  const subtitle = full.subtitle || product.subtitle || "";
  const mrp = full.mrp || "";
  const rating = (full as any).rating ?? 4.6;
  const sizes = useMemo(() => coerceSizes(full.sizes), [full.sizes]);
  const displayPrice = pickPrice(full);

  /* 2) old image viewer (main + thumbs) */
  const dir = useMemo(() => dirFrom(full), [full.slug, full.title]);
  const [images, setImages] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const prime = normalizeCsvImage(full.image, dir);
    const extras = galleryCandidates(dir);
    const list = Array.from(new Set([prime, ...extras].filter(Boolean))).map(toAbs);
    setImages(list);
    setActive(0);
  }, [dir, full.image]);

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

  /* 4) YMAL (unchanged) */
  const [also, setAlso] = useState<ProductModel[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/assets/hyper-products-sample.csv", { cache: "no-cache" });
        const txt = await res.text();
        const all = mapProducts(parseCSV(txt));
        const me = (title || "").toLowerCase();
        setAlso(all.filter((p) => (p.title || "").toLowerCase() !== me).slice(0, 8));
      } catch (e) {
        // ignore
      }
    })();
  }, [title]);

  return (
    <div className="w-full px-4 md:px-10 py-10">
      <div className="grid md:grid-cols-2 gap-12 w-full">
        {/* ========= GALLERY ========= */}
        <div className="w-full">
          <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-white shadow">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {hero ? (
              <img src={hero} alt={title} className="h-full w-full object-contain" />
            ) : (
              <div className="grid h-full w-full place-items-center text-gray-400">No image</div>
            )}
          </div>

          <div className="mt-4 flex gap-3 overflow-x-auto">
            {images.map((src, i) => (
              <button
                key={`${src}__${i}`}
                onClick={() => setActive(i)}
                className={`flex-shrink-0 h-20 w-20 overflow-hidden rounded-xl border transition ${i === active ? "border-black" : "border-gray-200"
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

        {/* ========= INFO ========= */}
        <div className="w-full">
          {/* breadcrumb + title + rating to mimic SS */}
          <div className="text-xs uppercase tracking-widest text-gray-500">Shop / product</div>
          <h1 className="mt-2 text-3xl md:text-4xl font-extrabold">{title}</h1>

          <div className="mt-3 flex items-center gap-4">
            <span className="text-xl font-bold">{displayPrice}</span>
            <Stars rating={rating} />
          </div>

          {/* Sizes */}
          {/* {console.log(full)} */}
          {sizes.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-600">
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

          {/* Qty pill + ADD TO CART pill (styled like your SS) */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex w-40 items-center justify-between rounded-full border px-3 py-2">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-3 text-xl"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <div className="text-base font-semibold">{qty}</div>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="px-3 text-xl"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAdd}
              className="flex-1 rounded-full bg-black px-6 py-4 text-sm font-extrabold uppercase tracking-widest text-white shadow-lg transition hover:bg-pink-600"
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

          {/* Description from CSV (now hydrated) */}
          {full.description && (
            <div
              className="prose prose-sm md:prose mt-8 max-w-none text-gray-700"
              dangerouslySetInnerHTML={{ __html: full.description }}
            />
          )}
        </div>
      </div>

      {/* ========= YOU MAY ALSO LIKE ========= */}
      <div className="mt-16">
        <div className="text-center">
          <img src="/assets/ymal-header.png" alt="You may also like" className="mx-auto mb-6 w-72 md:w-80" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6">
  {also.map((p) => (
    <ProductTile
      key={p.title}
      href={`/product/${encodeURIComponent(p.title)}`}
      image={toAbs(coverFor(p))}
      title={p.title}
      price={pickPrice(p)}
      className="p-3 sm:p-4"   // slightly tighter inside YMAL
    />
  ))}
</div>
      </div>

      {/* ========= FAQ + Contact ========= */}
      <div className="mt-16">
        <FaqSection />
      </div>
      <div className="mt-16">
        <ContactSection />
      </div>
    </div>
  );
}
