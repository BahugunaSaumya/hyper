import { useEffect, useRef, useState } from "react";

export default function Hero() {
  // refs to the wrappers (their clientWidth == a single tile width)
  const backWrapRef = useRef<HTMLDivElement>(null);
  const frontWrapRef = useRef<HTMLDivElement>(null);

  // Y-offsets to align the second image with the end of the first
  const [backJoinY, setBackJoinY] = useState(0);   // angle ≈ -7deg
  const [frontJoinY, setFrontJoinY] = useState(0); // angle ≈ -8deg

  useEffect(() => {
    const recompute = () => {
      const wBack = backWrapRef.current?.clientWidth ?? 0;
      const wFront = frontWrapRef.current?.clientWidth ?? 0;

      // Δy = tan(θ) * width; θ in radians
      const dyBack = Math.tan((-7.75 * Math.PI) / 180) * wBack;   // negative -> up
      const dyFront = Math.tan((-7.75 * Math.PI) / 180) * wFront;  // negative -> up

      setBackJoinY(dyBack);
      setFrontJoinY(dyFront);
    };

    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

  return (
    <section
      id="heroSection"
      className="relative bg-black text-white overflow-hidden"
      style={{ paddingTop: "calc(var(--nav-h, 88px) + 16px)" }}
    >
      {/* === TOP CONTENT === */}
      <div className="max-w-6xl mx-auto px-6 pt-8 pb-2 text-center relative z-20">
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

      {/* === SOFT LIGHTING / VEIL === */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 15%, rgba(255,255,255,0.07) 0%, rgba(0,0,0,0) 55%), linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,.25) 100%)",
        }}
      />

      {/* === BACK TAPE (Scroll Right) — wrapper unchanged === */}
      <div
        ref={backWrapRef}
        className="
    absolute left-1/2 -translate-x-1/2 pointer-events-none select-none
    z-20 rotate-[-7deg]
    w-[180vw] sm:w-[150vw] md:w-[140vw] lg:w-[135vw]
    bottom-[20vh] sm:bottom-[18vh] md:bottom-[20vh] lg:bottom-[22vh]
    overflow-hidden
  "
      >
        <div className="hero-ribbon-track hero-anim-right">
          <img src="/assets/back.png" alt="Back tape" className="w-1/2 object-contain" />
          <img
            src="/assets/back.png"
            alt="Back tape duplicate"
            className="w-1/2 object-contain"
            style={{ transform: `translateY(${backJoinY}px)` }}
          />
        </div>
      </div>


      {/* === MODELS === */}
      <div className="relative z-30 max-w-7xl mx-auto px-4">
        <img
          src="/assets/cage-bg.png"
          alt="Athletes"
          className="w-full h-[58vh] sm:h-[64vh] md:h-[68vh] lg:h-[70vh] object-contain object-bottom"
        />
      </div>

      {/* === GOLDEN SHADOW UNDER MODELS === */}
      <div className="absolute bottom-0 left-0 w-full pointer-events-none select-none z-10">
        <img src="/assets/shadow.png" alt="Floor shadow" className="w-full h-auto object-cover" />
      </div>

      {/* === FRONT TAPE (Scroll Left) — wrapper unchanged === */}
      <div
        ref={frontWrapRef}
        className="
    absolute left-1/2 -translate-x-1/10 pointer-events-none select-none
    z-40 rotate-[-8deg]
    w-[180vw] sm:w-[150vw] md:w-[140vw] lg:w-[135vw]
    bottom-[12vh] sm:bottom-[11vh] md:bottom-[12vh] lg:bottom-[13vh]
    overflow-hidden
  "
      >
        <div className="hero-ribbon-track hero-anim-left">
          <img src="/assets/front.png" alt="Front tape" className="w-1/2 object-contain" />
          <img
            src="/assets/front.png"
            alt="Front tape duplicate"
            className="w-1/2 object-contain"
            style={{ transform: `translateY(${frontJoinY}px)` }}
          />
        </div>
      </div>
    </section>
  );
}
