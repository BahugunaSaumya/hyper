// src/components/VideoSection.tsx
"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSpring, animated, easings } from "@react-spring/web";
import dynamic from "next/dynamic";
import "plyr-react/plyr.css";
import type { APITypes, SourceInfo } from "plyr-react";

const PlyrComponent = dynamic(() => import("plyr-react"), { ssr: false });

export default function VideoSection() {
  const playerRef = useRef<APITypes | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const [mounted, setMounted] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Geometry state
  const [{ small, W, H }, setDims] = useState({ small: 120, W: 1280, H: 720 });
  const [expanded, setExpanded] = useState(false);

  /* Mount */
  useEffect(() => setMounted(true), []);

  /* Resize dynamically */
  useLayoutEffect(() => {
    const calc = () => {
      const vw = Math.max(320, window.innerWidth);
      const vh = Math.max(480, window.innerHeight);

      const small = Math.round(Math.min(260, vw * 0.26));
      let W = vw;
      let H = Math.round((W * 9) / 16);
      const maxH = Math.round(vh * 0.92);

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

  /* Detect visibility without scrolling into view */
  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.intersectionRatio >= 0.5;
        setExpanded(visible);

        const api = playerRef.current?.plyr;
        if (!api) return;
        if (!visible) {
          api.pause();
          setIsPlaying(false);
        }
      },
      {
        root: null,
        rootMargin: "0px",
        threshold: [0, 0.5, 1],
      }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Spring animation */
  const spring = useSpring({
    from: { w: 0, h: 0, r: 999, s: 0.6, o: 0.9, blur: 6 },
    to: {
      w: expanded ? W : small,
      h: expanded ? H : small,
      r: expanded ? 2 : small / 2,
      s: expanded ? 1 : 0.95,
      o: 1,
      blur: expanded ? 0 : 2,
    },
    config: { duration: 1200, easing: easings.easeInOutCubic },
  });

  /* Plyr config */
  const source = useMemo<SourceInfo>(
    () => ({
      type: "video",
      sources: [{ src: "/assets/video.mp4", type: "video/mp4" as const }],
      poster: "/assets/video-preview.jpg",
    }),
    []
  );

  const options = useMemo(
    () => ({
      controls: ["play", "mute", "volume", "fullscreen"],
      ratio: "16:9",
      clickToPlay: false, // we handle taps manually
      hideControls: true,
      fullscreen: { enabled: true, fallback: true, iosNative: true },
      keyboard: { global: false },
      tooltips: { controls: false },
    }),
    []
  );

  /* Helpers */
  const playVideo = () => {
    setIsPlaying(true);
    playerRef.current?.plyr?.play().catch(() => setIsPlaying(false));
  };

  const pauseVideo = () => {
    playerRef.current?.plyr?.pause();
    setIsPlaying(false); // ensure immediate update
  };

  return (
    <section
      id="about"
      className="bleed-x relative bg-white text-black overflow-x-visible overflow-y-hidden"
    >
      {/* Intro text */}
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
          <p>India’s MMA scene is growing fast — but the gear hasn’t kept up…</p>
          <p>Our unique apparel has been precision engineered to endure mixed martial arts…</p>
          <p>We know that India has the power to compete on the global stage…</p>
        </div>
      </div>

      {/* Video container */}
      <div className="mt-14 md:mt-16 mb-10">
        <div className="flex justify-center">
          <animated.div
            ref={frameRef}
            className="relative overflow-hidden bg-black shadow-xl will-change-transform"
            style={{
              width: spring.w.to((v) => `${v}px`),
              height: spring.h.to((v) => `${v}px`),
              borderRadius: spring.r.to((v) => `${v}px`),
              transform: spring.s.to((s) => `scale(${s})`),
              opacity: spring.o,
              filter: spring.blur.to((b) => `blur(${b}px)`),
            }}
          >
            {/* Prevent video from interfering with scroll */}
            <style jsx global>{`
              .plyr--video video {
                object-fit: cover !important;
                width: 100% !important;
                height: 100% !important;
                pointer-events: auto !important;
              }
              .plyr__poster {
                background-size: cover !important;
              }
              .plyr--video, .plyr__video-wrapper {
                width: 100% !important;
                height: 100% !important;
              }
            `}</style>

            {/* Plyr */}
            <div className="absolute inset-0">
              {mounted && (
                <PlyrComponent
                  ref={playerRef}
                  source={source}
                  options={options}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  playsInline
                  muted
                  preload="metadata"
                  crossOrigin="anonymous"
                />
              )}
            </div>

            {/* Tap overlay to pause when video is playing */}
            {isPlaying && (
              <button
                type="button"
                aria-label="Pause video"
                className="absolute inset-0 z-20 bg-transparent"
                onClick={pauseVideo}
                style={{
                  touchAction: "manipulation",
                  WebkitTapHighlightColor: "transparent",
                }}
              />
            )}

            {/* Center play button when paused */}
            {!isPlaying && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-30">
                <button
                  type="button"
                  aria-label="Play video"
                  onClick={playVideo}
                  className="relative pointer-events-auto"
                >
                  <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                    {/* Spinning text ring */}
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

                    {/* Center play icon */}
                    <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/90 rounded-full grid place-items-center shadow-md">
                      <svg
                        className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                </button>
              </div>
            )}
          </animated.div>
        </div>
      </div>
    </section>
  );
}
