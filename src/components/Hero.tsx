// src/components/Hero.tsx
"use client";

export default function Hero() {
  return (
    <section
      id="heroSection"
      className="relative bg-black text-white overflow-hidden w-full"
      style={{ paddingTop: "calc(var(--nav-h, 88px) + 16px)" }}
    >
      <style jsx>{`
        /* ======= TUNING KNOBS ======= */
        #heroSection {
          /* stage height & spacing */
          --stage-h: 65vh;
          --stage-gap: 16px;

          /* model scale (1 = original), and max width cap */
          --model-zoom: 0.86;
          --model-max-w: 1400px;

          /* floor glow (strength/size/height) */
          --glow-color: 255, 212, 88; /* warm gold-ish (RGB) */
          --glow-opacity: 0.22;       /* intensity of the glow */
          --glow-height: 28%;         /* thickness of floor glow band */
          --glow-spread: 120%;        /* width of the glow ellipse */
          --glow-fade: 62%;           /* where the glow fades to 0 */

          /* vignette around the whole stage */
          --vignette-intensity: 0.20; /* darker edge */
        }

        @media (max-width: 640px) {
          #heroSection {
            --stage-h: 30vh;
            --stage-gap: 2px;
            --model-zoom: 0.98;

            --glow-opacity: 0.40;
            --glow-height: 39%;
            --glow-spread: 160%;
            --glow-fade: 60%;
          }
        }

        @media (min-width: 1024px) {
          #heroSection {
            --stage-h: 38vh;
            --stage-gap: 18px;
            --model-zoom: 0.88;

            --glow-opacity: 0.24;
            --glow-height: 49%;
            --glow-spread: 110%;
            --glow-fade: 64%;
          }
        }

        /* ======= Layout ======= */
        #heroVeil {
          background:
            /* soft top veil */
            radial-gradient(
              ellipse at 50% 15%,
              rgba(255, 255, 255, 0.06) 0%,
              rgba(0, 0, 0, 0) 55%
            ),
            /* subtle down fade */
            linear-gradient(
              to bottom,
              rgba(0, 0, 0, 0) 0%,
              rgba(0, 0, 0, 0.25) 100%
            );
        }

        #heroStage {
          position: relative;
          height: var(--stage-h);
          margin-top: var(--stage-gap);
          width: 100%;
          overflow: hidden;
          isolation: isolate; /* keep blending tidy */
        }

        /* ======= Painted floor glow (CSS-only) ======= */
        .floorGlow {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;

          /* two layers:
             1) vignette around edges
             2) golden glow ellipse sitting on the floor
           */
          background:
            radial-gradient(
              120% 100% at 50% 40%,
              rgba(0,0,0,0) 0%,
              rgba(0,0,0,var(--vignette-intensity)) 100%
            ),
            radial-gradient(
              /* shape & position of glow ellipse */
              var(--glow-spread) var(--glow-height) at 50% 100%,
              rgba(var(--glow-color), var(--glow-opacity)) 0%,
              rgba(var(--glow-color), calc(var(--glow-opacity) * 0.6)) 35%,
              rgba(var(--glow-color), 0) var(--glow-fade)
            );
        }

        /* ======= Models ======= */
        .models {
          position: absolute;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%) scale(var(--model-zoom));
          transform-origin: center bottom;
          width: 100%;
          max-width: var(--model-max-w);
          height: 100%;
          object-fit: contain; /* keep legs on the floor */
          object-position: center bottom;
          z-index: 1;
        }
      `}</style>

      {/* Copy + CTA */}
      <div className="relative z-20 max-w-6xl mx-auto px-6 pt-8 pb-2 text-center">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-wide">
          PRE–LAUNCH SALE IS LIVE <span className="align-middle">📣</span>
        </h1>
        <p className="mt-4 max-w-3xl mx-auto text-white/80 text-sm sm:text-base leading-relaxed">
          Elevate your game with premium shorts that keep you ahead and set you apart.
          Get yours today and own the gear made for champions.
        </p>

        <div className="mt-6 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-xs font-extrabold tracking-wide uppercase text-white/90">
            <span className="text-lg">⏱</span>
            <span>Last Minute Offer</span>
          </div>
          <a
            href="#products"
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-base font-semibold bg-pink-500 hover:bg-pink-400 active:scale-[.99] transition shadow-lg"
          >
            Place your Order
          </a>
        </div>
      </div>

      {/* Soft veil over the whole hero */}
      <div id="heroVeil" className="pointer-events-none absolute inset-0 z-0" />

      {/* Stage: models + CSS floor glow */}
      <div id="heroStage" className="relative z-10">
        <div className="floorGlow" />
        <img
          src="/assets/cage-bg.png"
          alt="Athletes"
          className="models"
        />
      </div>
    </section>
  );
}
