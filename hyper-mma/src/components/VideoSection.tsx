"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function VideoSection() {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const thumbRef = useRef<HTMLImageElement | null>(null);
  const playRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Click-to-play (ported from main.js)
  useEffect(() => {
    const wrap = wrapRef.current;
    const video = videoRef.current;
    const thumb = thumbRef.current;
    const playBtn = playRef.current;
    if (!wrap || !video || !thumb || !playBtn) return;

    const onClick = () => {
      if (!playing) {
        video.classList.remove("opacity-0", "pointer-events-none");
        thumb.classList.add("opacity-0");
        playBtn.classList.add("hidden");
        video.play().catch(() => { });
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

  // Scroll-to-expand (ported from main.js; uses IntersectionObserver)
  useEffect(() => {
    const wrap = wrapRef.current;
    const video = videoRef.current;
    const thumb = thumbRef.current;
    const playBtn = playRef.current;
    if (!wrap || !video || !thumb || !playBtn) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setExpanded(true);
        } else {
          setExpanded(false);
          // reset to initial
          video.pause();
          setPlaying(false);
          video.classList.add("opacity-0", "pointer-events-none");
          thumb.classList.remove("opacity-0");
          playBtn.classList.remove("hidden");
        }
      },
      { threshold: 0.45,
    rootMargin: "-10% 0px -10% 0px",
       }
    );

    io.observe(wrap);
    return () => io.disconnect();
  }, []);

  return (
    <section id="about" className="relative bg-white text-black py-20 overflow-hidden">
      {/* Heading */}
      <div className="text-center px-4">
        <h3 className="text-sm tracking-widest uppercase font-semibold">Welcome to Hyper</h3>
        <div className="w-full flex justify-center my-1">
          <div className="flex space-x-1 text-lg">| | | | | | | |</div>
        </div>
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold uppercase mt-4">Why We Created Hyper</h2>
      </div>

      {/* Video container (IDs/classes preserved) */}
      <div className="mt-12 flex justify-center">
        <motion.div
          id="videoWrapper"
          ref={wrapRef}
          className="transition-all duration-[1150ms] ease-in-out rounded-full overflow-hidden relative shadow-lg max-w-full mx-auto"
          initial={false}
          animate={{
            width: expanded ? "100%" : "15rem",   // 15rem = Tailwind w-60
            height: expanded ? "min(80vh, 1020px)" : "15rem",
            borderRadius: expanded ? "0px" : "9999px",
          }}
          transition={{ duration: 1.15, ease: [0.22, 0.61, 0.36, 1] }}
        >

          <img
            id="videoThumbnail"
            ref={thumbRef}
            src="/assets/video-preview.jpg"
            alt="Preview"
            className="w-full h-full object-cover absolute inset-0 z-0 transition-opacity duration-500"
          />

          <video
            id="mainVideo"
            ref={videoRef}
            className="w-full h-full object-cover absolute inset-0 z-10 opacity-0 pointer-events-none"
            muted
            playsInline
          >
            <source src="/assets/video.mp4" type="video/mp4" />
          </video>

          {/* Play button + rotating text (unchanged styles) */}
          <div id="playButton" ref={playRef} className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
              <svg className="absolute w-full h-full animate-spin-slow" viewBox="0 0 100 100">
                <defs>
                  <path id="circlePath" d="M 50, 50 m -40, 0 a 40,40 0 1,1 80,0 a 40,40 0 1,1 -80,0" />
                </defs>
                <text fill="white" fontSize="13" fontFamily="Arial" fontWeight="bold">
                  <textPath xlinkHref="#circlePath" startOffset="0%">How to be so fresh || How to be fresh ||</textPath>
                </text>
              </svg>
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-white/80 rounded-full flex items-center justify-center shadow-md z-10">
                <svg className="w-6 h-6 sm:w-7 sm:h-7 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
