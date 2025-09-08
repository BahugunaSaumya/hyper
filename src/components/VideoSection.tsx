// src/components/VideoSection.tsx
"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export default function VideoSection() {
  const wrapRef  = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const thumbRef = useRef<HTMLImageElement | null>(null);
  const playRef  = useRef<HTMLDivElement | null>(null);

  const [expanded, setExpanded] = useState(false);
  const [playing,  setPlaying]  = useState(false);

  // ---------- numeric targets so Motion can tween ----------
  const [{ small, W, H }, setDims] = useState({ small: 180, W: 1280, H: 720 });

  useLayoutEffect(() => {
    const calc = () => {
      const vw = Math.max(320, window.innerWidth);
      const vh = Math.max(480, window.innerHeight);

      // circle size at rest
      const small = Math.round(Math.min(260, vw * 0.26));

      // full-bleed width and 16:9 height
      let W = vw;                       // full viewport width
      let H = Math.round((W * 9) / 16); // 16:9

      // never exceed ~80% viewport height (prevents giant video on short screens)
      const maxH = Math.round(vh * 0.8);
      if (H > maxH) {
        H = maxH;
        W = Math.round((H * 16) / 9);
      }

      setDims({ small, W, H });
    };

    calc();
    window.addEventListener("resize", calc);
    return () => window.removeEventListener("resize", calc);
  }, []);

  // ---------- click to play / pause (your behavior kept) ----------
  useEffect(() => {
    const wrap = wrapRef.current, video = videoRef.current,
          thumb = thumbRef.current, playBtn = playRef.current;
    if (!wrap || !video || !thumb || !playBtn) return;

    const onClick = () => {
      if (!playing) {
        video.classList.remove("opacity-0", "pointer-events-none");
        thumb.classList.add("opacity-0");
        playBtn.classList.add("hidden");
        video.play().catch(() => {});
        setPlaying(true);
      } else {
        video.pause();
        playBtn.classList.remove("hidden");
        setPlaying(false);
      }
    };
    wrap.addEventListener("click", onClick);
    return () => wrap.removeEventListener("click", onClick);
  }, [playing]);

  // ---------- scroll into view -> expand ----------
  useEffect(() => {
    const el = wrapRef.current, video = videoRef.current,
          thumb = thumbRef.current, playBtn = playRef.current;
    if (!el || !video || !thumb || !playBtn) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setExpanded(true);
        else {
          setExpanded(false);
          video.pause();
          setPlaying(false);
          video.classList.add("opacity-0", "pointer-events-none");
          thumb.classList.remove("opacity-0");
          playBtn.classList.remove("hidden");
        }
      },
      { threshold: 0.2, rootMargin: "-10% 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section id="about" className="relative bg-white text-black overflow-hidden">
      {/* Heading + copy to match your mock */}
      <div className="max-w-5xl mx-auto px-6 pt-16">
        <h3 className="text-[14px] md:text-[16px] tracking-[0.28em] uppercase font-semibold">
          Welcome to Hyper
        </h3>
        <div className="mt-3 flex gap-2 text-black">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className="text-2xl leading-none select-none">|</span>
          ))}
        </div>
        <h2 className="mt-5 text-[34px] sm:text-[46px] md:text-[58px] leading-[1.05] font-extrabold uppercase tracking-tight">
          Why We Created Hyper
        </h2>

        <div className="mt-5 space-y-3 max-w-5xl text-[13px] md:text-[14px] leading-relaxed text-black/80">
          <p>
            India’s MMA scene is growing fast — but the gear hasn’t kept up…
          </p>
          <p>
            Our unique apparel has been precision engineered to endure mixed martial arts…
          </p>
          <p>
            We know that India has the power to compete on the global stage…
          </p>
        </div>
      </div>

      {/* Full-bleed container (so the expanded rectangle spans edge-to-edge) */}
      <div className="relative left-1/2 -translate-x-1/2 w-screen mt-14 md:mt-16 pb-20">
        <div className="flex justify-center">
          <motion.div
            ref={wrapRef}
            className="relative overflow-hidden bg-black shadow-xl will-change-transform"
            initial={{ width: 0, height: 0, borderRadius: 9999, scale: 0.6, opacity: 0.9, filter: "blur(4px)" }}
            animate={
              expanded
                ? { width: W, height: H, borderRadius: 0,   scale: 1,   opacity: 1, filter: "blur(0px)" }
                : { width: small, height: small, borderRadius: small/2, scale: 0.95, opacity: 1, filter: "blur(2px)" }
            }
            transition={{ duration: 1.0, ease: [0.22, 0.61, 0.36, 1] }}
          >
            {/* media fills container with object-cover so it looks like your screenshot */}
            <div className="absolute inset-0">
              <img
                ref={thumbRef}
                src="/assets/video-preview.jpg"
                alt="HYPER preview"
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
              />
              <video
                ref={videoRef}
                className="absolute inset-0 h-full w-full object-cover opacity-0 pointer-events-none transition-opacity duration-500"
                muted
                playsInline
              >
                <source src="/assets/video.mp4" type="video/mp4" />
              </video>
            </div>

            {/* Rotating ring + play */}
            <div
              ref={playRef}
              className="absolute inset-0 flex items-center justify-center z-10 transition-opacity duration-300"
            >
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                <svg className="absolute w-full h-full animate-spin-slow" viewBox="0 0 100 100">
                  <defs>
                    <path id="circlePath" d="M 50, 50 m -40, 0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" />
                  </defs>
                  <text fill="white" fontSize="12" fontFamily="Arial" fontWeight="bold">
                    <textPath xlinkHref="#circlePath" startOffset="0%">
                      SEE HYPER IN ACTION • SEE HYPER IN ACTION •
                    </textPath>
                  </text>
                </svg>
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/85 rounded-full grid place-items-center shadow-md">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
