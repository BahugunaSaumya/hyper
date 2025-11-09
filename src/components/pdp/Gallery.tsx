"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const NAMES = ["1", "2", "3", "4", "5", "6"];
const toAbs = (s?: string) => (!s ? "" : s.startsWith("/") ? s : `/${s}`);

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

export default function Gallery({
  dir,
  title,
  coverImage,
  onHeroRef,
}: {
  dir: string;
  title: string;
  coverImage?: string;
  onHeroRef?: (imgEl: HTMLImageElement | null) => void;
}) {
  const [images, setImages] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const heroRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
  if (typeof onHeroRef === "function") onHeroRef(heroRef.current);
  // no cleanup to return
}, [onHeroRef]);

  useEffect(() => {
    const prime = normalizeCsvImage(coverImage, dir);
    const extras = galleryCandidates(dir);
    const list = Array.from(new Set([prime, ...extras].filter(Boolean))).map(toAbs);
    setImages(list);
    setActive(0);
  }, [dir, coverImage]);

  const hero = images[active];

  const onThumbError = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setActive((a) => (a >= idx ? Math.max(0, a - 1) : a));
  };

  // swipe
  const startX = useRef(0);
  const dx = useRef(0);
  const dragging = useRef(false);
  const SWIPE = 23;
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    dragging.current = true;
    startX.current = e.touches[0].clientX;
    dx.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return;
    dx.current = e.touches[0].clientX - startX.current;
  };
  const onTouchEnd = () => {
    if (!dragging.current) return;
    const d = dx.current;
    dragging.current = false;
    dx.current = 0;
    if (Math.abs(d) > SWIPE && images.length > 1) {
      if (d < 0) setActive((i) => (i + 1) % images.length);
      else setActive((i) => (i - 1 + images.length) % images.length);
    }
  };

  return (
    <div className="grid md:grid-cols-[5rem_1fr] lg:grid-cols-[6rem_1fr] gap-3 md:gap-5">
      {/* HERO */}
      <div className="order-1 md:order-2">
        <div
          className="relative w-full aspect-[12/14] sm:aspect-square lg:aspect-[4/5] min-h-[300px] sm:min-h-[400px] lg:min-h-[500px] overflow-hidden"
          style={{ touchAction: "pan-y" }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchEnd}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {hero ? (
            <img
              ref={heroRef}
              src={hero}
              alt={title}
              className="h-full w-full object-contain"
              draggable={false}
            />
          ) : (
            <div className="grid h-full w-full place-items-center text-gray-400">
              No image
            </div>
          )}
        </div>

        {/* MOBILE THUMBS */}
        <div className="mt-3 px-1 flex gap-[6.5px] sm:gap-3 overflow-x-auto md:hidden snap-x snap-mandatory overscroll-x-contain scroll-smooth touch-pan-x no-scrollbar">
          {images.map((src, i) => (
            <button
              key={`${src}__m${i}`}
              onClick={() => setActive(i)}
              className={`flex-shrink-0 h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-lg border transition ${
                i === active ? "border-black" : "border-gray-200"
              } snap-start`}
              aria-label={`View ${title} image ${i + 1}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`${title} ${i + 1}`}
                className="h-full w-full object-cover"
                onError={() => onThumbError(i)}
                draggable={false}
              />
            </button>
          ))}
        </div>
      </div>

      {/* DESKTOP THUMBS */}
      <div className="order-2 md:order-1 hidden md:flex md:flex-col gap-2 md:gap-3 overflow-y-auto md:max-h-[min(80vh,40rem)] pr-1">
        {images.map((src, i) => (
          <button
            key={`${src}__d${i}`}
            onClick={() => setActive(i)}
            className={`h-16 w-16 lg:h-20 lg:w-20 overflow-hidden rounded-lg border transition ${
              i === active ? "border-black" : "border-gray-200"
            }`}
            aria-label={`View ${title} image ${i + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={`${title} ${i + 1}`}
              className="h-full w-full object-cover"
              onError={() => onThumbError(i)}
              draggable={false}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
