// src/components/TestimonialsSection.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Testimonial = {
  id: string;
  photo: string;
  quote: string;
  name: string;
  title: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    id: "t1",
    photo: "/assets/testimonials/satyam.png",
    quote:
      "These shorts are lightweight but surprisingly durable. I’ve worn them for MMA training and casual use, and they’re comfortable either way. The waistband and drawstring keep them perfectly in place.",
    name: "SATYAM KUMAR",
    title: "Professional MMA Fighter",
  },
  {
    id: "t2",
    photo: "/assets/testimonials/paramveer.png",
    quote:
      "I was worried about sizing, but I ordered my regular size and it fits perfectly. Secure fit during sparring, plus they look great outside the gym.",
    name: "Paramveer SIngh.",
    title: "MMA Gym Owner",
  },
  {
    id: "t3",
    photo: "/assets/testimonials/anjali.png",
    quote:
      "Absolutely love the print! I’ve washed them several times already, and there’s no fading or peeling at all. Quality feels premium.",
    name: "Kanishka Malik.",
    title: "Student",
  },
];

/* Responsive card width (px) for precise arrow alignment */
function useCardWidth() {
  const [w, setW] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setW(window.innerWidth);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);

  return useMemo(() => {
    if (w == null) return 340; // SSR fallback
    if (w >= 1280) return 900; // xl+
    if (w >= 1024) return 820; // lg
    if (w >= 768) return 680;  // md
    if (w >= 640) return 380;  // sm
    return 340;                // base
  }, [w]);
}

export default function TestimonialsSection() {
  const [active, setActive] = useState(0);
  const total = TESTIMONIALS.length;
  const cardW = useCardWidth();

  const hoverRef = useRef(false);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rowRef = useRef<HTMLDivElement | null>(null);

  // dynamic spacer width so first/last cards can be centered
  const [spacerW, setSpacerW] = useState(0);

  // compute spacer when container or card width changes
  useEffect(() => {
    const calc = () => {
      const row = rowRef.current;
      if (!row) return;
      const rowW = row.clientWidth;
      const s = Math.max(0, Math.round((rowW - cardW) / 2));
      setSpacerW(s);
    };
    calc();

    // watch container size changes too
    const ro = new ResizeObserver(calc);
    if (rowRef.current) ro.observe(rowRef.current);
    window.addEventListener("resize", calc, { passive: true });

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", calc);
    };
  }, [cardW]);

  /** Scroll to a specific index immediately */
  const scrollToIndex = (index: number) => {
    const row = rowRef.current;
    const el = itemRefs.current[index];
    if (!row || !el) return;
    const elCenter = el.offsetLeft + el.offsetWidth / 2;
    const target = elCenter - row.clientWidth / 2;
    row.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  };

  /** Combined function for updating index + scrolling */
  const goToIndex = (index: number) => {
    const newIndex = (index + total) % total;
    setActive(newIndex);
    scrollToIndex(newIndex);
  };

  const next = () => goToIndex(active + 1);
  const prev = () => goToIndex(active - 1);

  // Autoplay
  useEffect(() => {
    const id = setInterval(() => {
      if (!hoverRef.current) next();
    }, 4500);
    return () => clearInterval(id);
  }, [active, total]); // keep moving

  // // Keyboard arrows
  // useEffect(() => {
  //   const onKey = (e: KeyboardEvent) => {
  //     if (e.key === "ArrowRight") next();
  //     if (e.key === "ArrowLeft") prev();
  //   };
  //   window.addEventListener("keydown", onKey);
  // //   return () => window.removeEventListener("keydown", onKey);
  // // }, [active]); // depend on active so handlers always call latest next/prev

  // // recenter on spacer/card changes
  // useEffect(() => {
  //   scrollToIndex(active);
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [spacerW, cardW]);

  const arrowCommon =
    "absolute top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-full bg-white/12 hover:bg-white/20 text-white backdrop-blur-sm shadow";
  const arrowOffset = 22;

  return (
    <section
      id="testimonials"
      className="bg-black px-5 sm:px-6 md:px-8 py-14 md:py-16 overflow-x-hidden"
      aria-label="What our fighters are saying"
      style={
        {
          ["--card-w" as any]: `${cardW}px`,
          ["--arrow-offset" as any]: `${arrowOffset}px`,
        } as React.CSSProperties
      }
    >
      <div className="text-center mb-8 md:mb-10">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase text-white tracking-tight">
          WHAT OUR FIGHTERS ARE SAYING
        </h2>
      </div>

      <div
        className="relative max-w-6xl mx-auto"
        onMouseEnter={() => (hoverRef.current = true)}
        onMouseLeave={() => (hoverRef.current = false)}
      >
        <div className="overflow-hidden">
          <div
            ref={rowRef}
            className="
              flex gap-4 sm:gap-5 snap-x snap-mandatory overflow-x-auto scroll-smooth
              justify-start
              overscroll-x-contain
              [-webkit-overflow-scrolling:touch]
              pb-1
            "
            aria-live="polite"
          >
            {/* LEFT SPACER to allow first card centering */}
            <div
              aria-hidden
              className="shrink-0"
              style={{ width: spacerW }}
            />
            {TESTIMONIALS.map((t, idx) => (
              <div
                key={t.id}
                ref={(el) => (itemRefs.current[idx] = el)}
                className="snap-center shrink-0"
                style={{ width: cardW, scrollMarginInline: "24px" }}
              >
                <Card t={t} active={idx === active} />
              </div>
            ))}
            {/* RIGHT SPACER to allow last card centering */}
            <div
              aria-hidden
              className="shrink-0"
              style={{ width: spacerW }}
            />
          </div>
        </div>

        {/* Navigation Arrows pinned to centered card edges */}
        <button
          aria-label="Previous"
          onClick={prev}
          className={arrowCommon}
          style={{
            left: "calc(50% - var(--card-w) / 2 - var(--arrow-offset))",
          }}
        >
          ‹
        </button>
        <button
          aria-label="Next"
          onClick={next}
          className={arrowCommon}
          style={{
            right: "calc(50% - var(--card-w) / 2 - var(--arrow-offset))",
          }}
        >
          ›
        </button>

        {/* Dots */}
        <div className="flex justify-center mt-5 gap-2.5">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => goToIndex(i)}
              className={`h-2 w-2 rounded-full transition ${i === active
                  ? "bg-pink-500 scale-110"
                  : "bg-white/30 hover:bg-white/60"
                }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({ t, active }: { t: Testimonial; active: boolean }) {
  return (
    <article
      className={[
        "relative h-full rounded-3xl border border-white/10",
        "bg-[linear-gradient(180deg,#111,_#0b0b0b)] text-white/90",
        "shadow-[0_10px_40px_rgba(0,0,0,.5)]",
        "transition-[transform,opacity,box-shadow] duration-500 ease-out no-scrollbar",
        active ? "scale-100 opacity-100" : "scale-[0.98] opacity-80",
      ].join(" ")}
      style={{ minHeight: 280 }}
    >
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/5" />
      <div className="p-5 sm:p-6 md:p-7 flex items-center gap-4 sm:gap-5">
        <div className="relative w-[34%] max-w-[220px]">
          <img
            src={t.photo}
            alt={t.name}
            className="w-full h-[230px] sm:h-[240px] md:h-[250px] object-cover rounded-2xl grayscale"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-pink-400 text-2xl sm:text-3xl mb-1 leading-none">“</div>
          <p className="text-[13.5px] sm:text-[14.5px] leading-relaxed text-white/85">
            {t.quote}
          </p>
          <div className="mt-4">
            <div className="font-extrabold tracking-wide">{t.name}</div>
            <div className="text-xs text-white/60">{t.title}</div>
          </div>
        </div>
      </div>
    </article>
  );
}
