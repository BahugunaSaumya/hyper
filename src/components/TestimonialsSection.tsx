// src/components/TestimonialsSection.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
type Testimonial = {
  id: string;
  photo: string;        // 1:1 or portrait works best
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
    photo: "/assets/testimonials/rahul.jpg",
    quote:
      "I’ve washed them several times already, no fading at all. Quality feels premium.",
    name: "RAHUL S.",
    title: "Amateur Featherweight",
  },
  {
    id: "t3",
    photo: "/assets/testimonials/anjali.jpg",
    quote:
      "Mobility is insane—kicks feel free and sharp. Stitching is solid with zero irritation.",
    name: "ANJALI M.",
    title: "Muay Thai Practitioner",
  },
  {
    id: "t4",
    photo: "/assets/testimonials/samir.jpg",
    quote:
      "True to size and the grip on the waist stays during intense grappling. Love the look.",
    name: "SAMIR KHAN",
    title: "BJJ Blue Belt",
  },
  {
    id: "t5",
    photo: "/assets/testimonials/maya.jpg",
    quote:
      "Light, tough, and actually stylish. I’ve started wearing them outside training too.",
    name: "MAYA R.",
    title: "Kickboxing Coach",
  },
  {
    id: "t6",
    photo: "/assets/testimonials/abhi.jpg",
    quote:
      "30% launch discount was a steal. Easily the best shorts I’ve owned for sparring.",
    name: "ABHINAV T.",
    title: "Boxing Enthusiast",
  },
];

export default function TestimonialsSection() {
  const [active, setActive] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  // responsive “card width” (used to compute centered translateX)
  const cardWidth = useCardWidth();
  const total = TESTIMONIALS.length;

  // center active card with a subtle peek on the sides
  const translateX = useMemo(() => {
    // gap between cards must match `gap-x-6` (1.5rem) -> 24px
    const GAP = 24;
    return -(active * (cardWidth + GAP));
  }, [active, cardWidth]);

  // autoplay (pause on hover)
  const hoverRef = useRef(false);
  useEffect(() => {
    const id = setInterval(() => {
      if (!hoverRef.current) {
        setActive((i) => (i + 1) % total);
      }
    }, 4500);
    return () => clearInterval(id);
  }, [total]);

  // keyboard arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function next() {
    setActive((i) => (i + 1) % total);
  }
  function prev() {
    setActive((i) => (i - 1 + total) % total);
  }

  return (
    <section
      id="testimonials"
      className="py-20 bg-black px-6"
      aria-label="What our fighters are saying"
    >
      <div className="text-center mb-12">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase text-white tracking-tight">
          WHAT OUR FIGHTERS ARE SAYING
        </h2>
      </div>

      <div
        className="relative max-w-6xl mx-auto"
        onMouseEnter={() => (hoverRef.current = true)}
        onMouseLeave={() => (hoverRef.current = false)}
      >
        {/* Track wrapper */}
        <div className="overflow-hidden">
          <div
            ref={trackRef}
            className="flex gap-6 will-change-transform transition-transform duration-700 ease-[cubic-bezier(.22,.61,.36,1)]"
            style={{
              transform: `translateX(calc(50% - ${cardWidth / 2}px + ${translateX}px))`,
            }}
          >
            {TESTIMONIALS.map((t, idx) => (
              <Card
                key={t.id}
                t={t}
                cardWidth={cardWidth}
                active={idx === active}
              />
            ))}
          </div>
        </div>

        {/* Arrows */}
        <button
          aria-label="Previous"
          onClick={prev}
          className="absolute -left-2 md:-left-6 top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          ‹
        </button>
        <button
          aria-label="Next"
          onClick={next}
          className="absolute -right-2 md:-right-6 top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          ›
        </button>

        {/* Dots */}
        <div className="flex justify-center mt-8 gap-3">
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-2 w-2 rounded-full transition ${
                i === active ? "bg-pink-500 scale-110" : "bg-white/30 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function Card({
  t,
  cardWidth,
  active,
}: {
  t: Testimonial;
  cardWidth: number;
  active: boolean;
}) {
  return (
    <article
      className={`
        relative shrink-0 rounded-3xl border border-white/10 bg-[linear-gradient(180deg,#111,_#0b0b0b)]
        text-white/90 shadow-[0_10px_40px_rgba(0,0,0,.5)]
        transition-[transform,opacity,box-shadow] duration-500 ease-out
        ${active ? "scale-[1.0] opacity-100" : "scale-[.96] opacity-70"}
      `}
      style={{ width: cardWidth }}
    >
      {/* subtle inset highlight */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/5" />
      <div className="p-6 md:p-8 flex items-center gap-6">
        {/* photo */}
        <div className="relative w-[220px] max-w-[40%]">
          <img
            src={t.photo}
            alt={t.name}
            className="w-full h-[260px] object-cover rounded-2xl grayscale"
          />
        </div>

        {/* quote + name */}
        <div className="flex-1 min-w-0">
          <div className="text-pink-400 text-3xl mb-2 leading-none">“</div>
          <p className="text-sm sm:text-[15px] leading-relaxed text-white/85">
            {t.quote}
          </p>
          <div className="mt-5">
            <div className="font-extrabold tracking-wide">{t.name}</div>
            <div className="text-xs text-white/60">{t.title}</div>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Compute a nice responsive card width that allows side peeks */
function useCardWidth() {
  const [w, setW] = useState<number>(getWidth());

  useEffect(() => {
    const on = () => setW(getWidth());
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  return w;

  function getWidth() {
    const vw = typeof window === "undefined" ? 1200 : window.innerWidth;
    // card = container(= ~1100px max) minus side peeks
    // breakpoints tuned to resemble your mock
    if (vw < 480) return Math.min(360, vw - 48);          // small phones
    if (vw < 768) return Math.min(520, vw - 72);          // phones
    if (vw < 1024) return 620;                            // tablets
    if (vw < 1280) return 760;                            // small desktop
    return 820;                                           // large desktop
  }
}
