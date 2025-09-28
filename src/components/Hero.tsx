"use client";

export default function Hero() {
  return (
    <section
      id="hero"
      className="relative w-full text-white"
      style={{
        /* ===== DESKTOP KNOBS (unchanged) ===== */
        ["--x" as any]: "40.5rem",
        ["--y" as any]: "44%",
        ["--w" as any]: "44rem",
        ["--btn-nudge" as any]: "8.01em",

        /* ===== MOBILE KNOBS (defaults) ===== */
        ["--mx" as any]: "3rem",     // side margin on small screens
        ["--my" as any]: "83%",      // vertical anchor for the copy block
        ["--mw" as any]: "44rem",    // text max width cap
        ["--mbtn" as any]: "1.25rem" // gap between text and button
      }}
    >
      {/* Background image with mobile fallback */}
      <picture>
        <source media="(max-width: 640px)" srcSet="/assets/hero-mobile.png" />
        <img
          src="/assets/hero.png"
          alt="Athlete training — Hyper Gear"
          /* 👉 mobile uses object-cover to remove side gaps; desktop stays the same */
          className="w-full h-[100svh] lg:h-[130vh] object-cover"
          style={{ objectPosition: "center" }}
          fetchPriority="high"
        />
      </picture>

      {/* Subtle overlay for contrast */}
      <div className="pointer-events-none absolute inset-0 bg-black/8 lg:bg-black/5" />

      {/* === Desktop Content (unchanged) === */}
      <div className="absolute inset-0">
        <div
          className="absolute translate-y-[-50%] right-[var(--x)] top-[var(--y)] hidden lg:block"
          style={{ width: "min(var(--w), 90vw)" }}
        >
          <div className="grid grid-cols-[1fr_auto] items-center gap-8">
            <h1 className="font-extrabold tracking-wide text-[4.85rem] leading-[1.1] drop-shadow-[0_3px_12px_rgba(0,0,0,0.35)] whitespace-nowrap">
              <div>FORGED BY PRECISION,</div>
              <div>DRIVEN BY ENDURANCE</div>
            </h1>

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

        {/* === Mobile Content (tuned) === */}
        <div
          className="lg:hidden absolute left-[var(--mx)] translate-y-[-50%]"
          style={{
            top: "var(--my)",
            width: "min(var(--mw), calc(100vw - 2*var(--mx)))"
          }}
        >
          {/* clamp keeps type proportional across 12 Pro (390w) and 15 Pro (393w) */}
          <h1 className="font-extrabold tracking-wide drop-shadow-[0_3px_12px_rgba(0,0,0,0.45)] leading-[1.1] text-[clamp(1.30rem,4.2vw,1.55rem)]">
            <span className="block">FORGED BY PRECISION,</span>
            <span className="block">DRIVEN BY ENDURANCE</span>
          </h1>

          <a
            href="#products"
            className="mt-[var(--mbtn)] inline-flex w-full items-center justify-center rounded-full px-6 py-3 text-[clamp(.95rem,3.5vw,1.05rem)] font-semibold bg-pink-500 hover:bg-pink-400 active:scale-[.99] transition shadow-lg"
          >
            Place your Order
          </a>
        </div>
      </div>

      {/* Mobile-specific tuning for common widths/heights */}
      <style jsx>{`
        :global(header) {
          background: linear-gradient(to bottom, rgba(0, 0, 0, 0.35), rgba(0, 0, 0, 0));
        }

        /* Slightly tighter on small phones (iPhone 12/13/14/15 widths) */
        @media (max-width: 420px) {
          #hero { --mx: 1.5rem; --my: 87%; }
        }

        /* iPhone 12 Pro width is 390px: nudge copy a bit lower and closer in */
        @media (max-width: 392px) {
          #hero { --mx: 1.25rem; --my: 88%; }
        }

        /* Very short viewports (keyboard up / notch compression etc.) */
        @media (max-height: 740px) and (max-width: 420px) {
          #hero { --my: 89%; }
        }
      `}</style>
    </section>
  );
}
