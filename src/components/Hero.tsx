// src/components/Hero.tsx
"use client";

export default function Hero() {
  return (
    <section
      className="relative w-full text-white"
      style={{
        // ===== DESKTOP KNOBS =====
        ["--x" as any]: "40.5rem",     // horizontal offset (from right edge)
        ["--y" as any]: "44%",        // vertical center position
        ["--w" as any]: "44rem",      // max width of text block
        ["--btn-nudge" as any]: "8.01em", // fine-tune button alignment

        // ===== MOBILE KNOBS =====
        ["--mx" as any]: "2.5rem",   // left/right margin
        ["--my" as any]: "85%",       // vertical position
        ["--mw" as any]: "44rem",     // max width for mobile text
        ["--mbtn" as any]: "1.75rem", // space between text and button
      }}
    >
      {/* Background image with mobile fallback */}
      <picture>
        <source media="(max-width: 640px)" srcSet="/assets/hero-mobile.png" />
        <img
          src="/assets/hero.png"
          alt="Athlete training — Hyper Gear"
          className="w-full h-[88vh] lg:h-[130vh] object-contain lg:object-cover"
          style={{ objectPosition: "center" }}
          fetchPriority="high"
        />
      </picture>

      {/* Subtle overlay for contrast */}
      <div className="pointer-events-none absolute inset-0 bg-black/8 lg:bg-black/5" />

      {/* === Desktop Content === */}
      <div className="absolute inset-0">
        <div
          className="absolute translate-y-[-50%] right-[var(--x)] top-[var(--y)] hidden lg:block"
          style={{ width: "min(var(--w), 90vw)" }}
        >
          <div className="grid grid-cols-[1fr_auto] items-center gap-8">

            {/* Title: Each phrase on its own line */}
            <h1 className="font-extrabold tracking-wide text-[4.85rem] leading-[1.1] drop-shadow-[0_3px_12px_rgba(0,0,0,0.35)] whitespace-nowrap">
              <div>FORGED BY PRECISION,</div>
              <div>DRIVEN BY ENDURANCE</div>
            </h1>

            {/* Button Section */}
            <div style={{ transform: "translateY(var(--btn-nudge))" }}>
              <a
                href="#products"
                className="translate-x-[-100%] inline-flex items-center justify-center rounded-full px-44 py-5 mt-20 text-2xl font-bold bg-pink-500 hover:bg-pink-400 active:scale-[.99] transition shadow-lg whitespace-nowrap"
              >
                Place your Order
              </a>
            </div>

          </div>
        </div>

        {/* === Mobile Content === */}
        <div
          className="lg:hidden absolute left-[var(--mx)] translate-y-[-50%]"
          style={{
            top: "var(--my)",
            width: "min(var(--mw), calc(100vw - 2*var(--mx)))",
          }}
        >
          <h1 className="font-extrabold tracking-wide text-[1.3rem] leading-[1.1] drop-shadow-[0_3px_12px_rgba(0,0,0,0.45)]">
            <span className="block">FORGED BY PRECISION,</span>
            <span className="block">DRIVEN BY ENDURANCE</span>
          </h1>

          <a
            href="#products"
            className="mt-[var(--mbtn)] inline-flex w-[9000px] items-center justify-center rounded-full w-full px-6 py-3 text-base font-semibold bg-pink-500 hover:bg-pink-400 active:scale-[10000.99] transition shadow-lg"
          >
            Place your Order
          </a>
        </div>
      </div>

      {/* Gradient for header readability */}
      <style jsx>{`
        :global(header) {
          background: linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0.35),
            rgba(0, 0, 0, 0)
          );
        }
      `}</style>
    </section>
  );
}
