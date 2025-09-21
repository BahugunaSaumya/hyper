// src/components/TestimonialsSection.tsx
"use client";

import { useEffect, useRef, useState } from "react";

type Testimonial = {
  id: string;
  photo: string;  // 1:1 or portrait works best
  quote: string;
  name: string;
  title: string;
};

const TESTIMONIALS: Testimonial[] = [
  {
    id: "t1", photo: "/assets/testimonials/satyam.png",
    quote: "These shorts are lightweight but surprisingly durable. I’ve worn them for MMA training and casual use, and they’re comfortable either way. The waistband and drawstring keep them perfectly in place.",
    name: "SATYAM KUMAR", title: "Professional MMA Fighter"
  },
  {
    id: "t2", photo: "/assets/testimonials/rahul.jpg",
    quote: "I’ve washed them several times already, no fading at all. Quality feels premium.",
    name: "RAHUL S.", title: "Amateur Featherweight"
  },
  {
    id: "t3", photo: "/assets/testimonials/anjali.jpg",
    quote: "Mobility is insane—kicks feel free and sharp. Stitching is solid with zero irritation.",
    name: "ANJALI M.", title: "Muay Thai Practitioner"
  },
  {
    id: "t4", photo: "/assets/testimonials/samir.jpg",
    quote: "True to size and the grip on the waist stays during intense grappling. Love the look.",
    name: "SAMIR KHAN", title: "BJJ Blue Belt"
  },
  {
    id: "t5", photo: "/assets/testimonials/maya.jpg",
    quote: "Light, tough, and actually stylish. I’ve started wearing them outside training too.",
    name: "MAYA R.", title: "Kickboxing Coach"
  },
  {
    id: "t6", photo: "/assets/testimonials/abhi.jpg",
    quote: "30% launch discount was a steal. Easily the best shorts I’ve owned for sparring.",
    name: "ABHINAV T.", title: "Boxing Enthusiast"
  },
];

export default function TestimonialsSection() {
  const [active, setActive] = useState(0);
  const total = TESTIMONIALS.length;

  // Pause autoplay while hovering the carousel container
  const hoverRef = useRef(false);

  // Refs for each card so we can center it with scrollIntoView (no inline transform)
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rowRef = useRef<HTMLDivElement | null>(null);


  // Autoplay
  useEffect(() => {
    const id = setInterval(() => {
      if (!hoverRef.current) setActive(i => (i + 1) % total);
    }, 4500);
    return () => clearInterval(id);
  }, [total]);

  // Keyboard arrows
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Center the active card (horizontal only)
  useEffect(() => {
    const row = rowRef.current;
    const el = itemRefs.current[active];
    if (!row || !el) return;
    const elCenter = el.offsetLeft + el.offsetWidth / 2;
    const target = elCenter - row.clientWidth / 2;
    row.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [active]);

  function next() { setActive(i => (i + 1) % total); }
  function prev() { setActive(i => (i - 1 + total) % total); }

  return (
    <section
      id="testimonials"
      className="py-20 bg-black px-6 overflow-x-hidden"  // contain page horizontally
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
          {/* Scroll-snap row: keep overflow-x-auto at ALL sizes (don’t switch to visible) */}
          <div
           ref={rowRef}
            className="
              flex gap-6 snap-x snap-mandatory overflow-x-auto scroll-smooth
              justify-center md:justify-start
              overscroll-x-contain
              [-webkit-overflow-scrolling:touch]
              pb-2
            "
            aria-live="polite"
          >
            {TESTIMONIALS.map((t, idx) => (
              <div
                key={t.id}
                ref={(el) => (itemRefs.current[idx] = el)}
                className="snap-center shrink-0"
                style={{ scrollMarginInline: "24px" }}
              >
                <Card t={t} active={idx === active} />
              </div>
            ))}
          </div>
        </div>

        {/* Arrows (positioned relative to the container; don’t spill outside) */}
        <button
          aria-label="Previous"
          onClick={prev}
          className="absolute left-0 md:-left-6 top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white"
        >
          ‹
        </button>
        <button
          aria-label="Next"
          onClick={next}
          className="absolute right-0 md:-right-6 top-1/2 -translate-y-1/2 h-10 w-10 grid place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white"
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
              className={`h-2 w-2 rounded-full transition ${i === active ? "bg-pink-500 scale-110" : "bg-white/30 hover:bg-white/60"}`}
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
        // Widths are CSS-only via breakpoints (SSR-safe)
        "w-[300px] sm:w-[360px] md:w-[620px] lg:w-[760px] xl:w-[820px]",
        "relative shrink-0 rounded-3xl border border-white/10",
        "bg-[linear-gradient(180deg,#111,_#0b0b0b)] text-white/90",
        "shadow-[0_10px_40px_rgba(0,0,0,.5)]",
        "transition-[transform,opacity,box-shadow] duration-500 ease-out",
        active ? "scale-100 opacity-100" : "scale-95 opacity-70",
      ].join(" ")}
    >
      {/* subtle inset highlight */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl ring-1 ring-white/5" />
      <div className="p-6 md:p-8 flex items-center gap-6">
        {/* photo */}
        <div className="relative w-[180px] sm:w-[200px] md:w-[220px] max-w-[40%]">
          <img
            src={t.photo}
            alt={t.name}
            className="w-full h-[220px] sm:h-[240px] md:h-[260px] object-cover rounded-2xl grayscale"
          />
        </div>

        {/* quote + name */}
        <div className="flex-1 min-w-0">
          <div className="text-pink-400 text-2xl sm:text-3xl mb-2 leading-none">“</div>
          <p className="text-sm sm:text-[15px] leading-relaxed text-white/85">{t.quote}</p>
          <div className="mt-5">
            <div className="font-extrabold tracking-wide">{t.name}</div>
            <div className="text-xs text-white/60">{t.title}</div>
          </div>
        </div>
      </div>
    </article>
  );
}
