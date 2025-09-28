// src/components/BlogsSection.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/** Your 3 blog cards */
const BLOGS = [
  {
    slug: "team-hyper-power-passion-and-pure-energy",
    date: "07 July, 2025",
    image: "/assets/blog-1.png",
    title: "Team Hyper: Power, Passion, and Pure Energy",
  },
  {
    slug: "elevate-your-game-with-hyper",
    date: "07 July, 2025",
    image: "/assets/blog-2.png",
    title: "Elevate Your Game with Hyper—Worn by the Country’s Elite Fighters",
  },
  {
    slug: "winning-the-cage-hyper-athletes-shine-at-mfn",
    date: "07 July, 2025",
    image: "/assets/blog-3.png",
    title: "Winning the Cage: Hyper Athletes Shine at MFN",
  },
];

function useCardWidth() {
  const [w, setW] = useState<number | null>(null);
  useEffect(() => {
    const u = () => setW(window.innerWidth);
    u();
    window.addEventListener("resize", u, { passive: true });
    return () => window.removeEventListener("resize", u);
  }, []);
  // One width per breakpoint -> identical proportions
  return useMemo(() => {
    if (w == null) return 320; // SSR fallback
    if (w >= 1280) return 420;
    if (w >= 1024) return 380;
    if (w >= 768) return 340;
    return 300;
  }, [w]);
}

export default function BlogsSection() {
  const router = useRouter();
  const railRef = useRef<HTMLDivElement | null>(null);

  const cardW = useCardWidth();
  const GAP = 24;                   // space-x-6
  const STEP = cardW + GAP;         // one-card stride
  const MAX_INDEX = BLOGS.length - 1;

  const [index, setIndex] = useState(0);

  /** Scroll rail to a specific, clamped index */
  const goTo = (i: number, smooth = true) => {
    const el = railRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(MAX_INDEX, i));
    setIndex(clamped);
    el.scrollTo({
      left: clamped * STEP,
      behavior: smooth ? "smooth" : "auto",
    });
  };

  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  // Keep position when the card width changes (resize)
  useEffect(() => {
    goTo(index, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardW]);

  // Keyboard support
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, STEP]);

  /* ===== Drag / swipe with snap-to-nearest ===== */
  const downX = useRef(0);
  const startLeft = useRef(0);
  const dragging = useRef(false);

  const onPointerDown = (e: React.PointerEvent) => {
    const el = railRef.current;
    if (!el) return;
    dragging.current = true;
    el.setPointerCapture?.(e.pointerId);
    downX.current = e.clientX;
    startLeft.current = el.scrollLeft;
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = railRef.current;
    if (!el || !dragging.current) return;
    const dx = e.clientX - downX.current;
    el.scrollLeft = startLeft.current - dx;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const el = railRef.current;
    if (!el) return;
    dragging.current = false;
    el.releasePointerCapture?.(e.pointerId);
    // // snap to nearest card
    // const nearest = Math.round(el.scrollLeft / STEP);
    // goTo(nearest);
  };

  /* Round arrows like Testimonials */
  const roundArrow =
    "absolute top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-full " +
    "bg-black/10 hover:bg-black/15 text-black shadow backdrop-blur-sm z-20";

  return (
    <section id="blogs" className="relative bg-white text-black px-6 sm:px-8 no-scrollbar">
      {/* Header — reduced white space */}
      <div className="text-center pt-10 sm:pt-12">
        <img
          src="/assets/our-blogs-heading.png"
          alt="Our Blogs"
          className="mx-auto mb-4 w-64 sm:w-80"
        />
   
      </div>

      <div className="relative max-w-7xl mx-auto mt-4 no-scrollbar">


        {/* Big round arrows — disable at ends */}
        <button
          className={`${roundArrow} disabled:opacity-100`}
          style={{ left: "-6px" }}
          onClick={prev}
          disabled={index === 0}
          aria-label="Previous"
        >
          ‹
        </button>
        <button
          className={`${roundArrow} disabled:opacity-100`}
          style={{ right: "-6px" }}
          onClick={next}
          disabled={index === MAX_INDEX}
          aria-label="Next"
        >
          ›
        </button>

        {/* Scroll rail with snap + fixed card sizes */}
        <div
          ref={railRef}
          className="
          no-scrollbar
            flex overflow-x-auto scroll-smooth pb-4 select-none
            space-x-6 snap-x snap-mandatory
            [-webkit-overflow-scrolling:touch]
          "
      
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {BLOGS.map((b, i) => (
            <button
              key={b.slug}
              className="flex-none snap-start text-left focus:outline-none"
              style={{ width: cardW }}
              onClick={() => router.push(`/blog/${b.slug}`)}
              aria-label={`Open blog: ${b.title}`}
            >
              <p className="text-sm font-bold mb-1">{b.date}</p>
              <img
                src={b.image}
                alt={b.title}
                className="rounded-lg w-full h-[280px] object-cover mb-2"
                draggable={false}
              />
              <p className="text-gray-800">{b.title}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
