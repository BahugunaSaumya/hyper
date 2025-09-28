"use client";

import { useEffect, useMemo, useState } from "react";

const MESSAGES = [
  "lacing up your gear…",
  "warming up the canvas…",
  "dialing in the fit…",
  "checking sizes & stock…",
  "tightening the straps…",
];

export default function LoadingScreen({
  message,
  showSpinner = true,
}: {
  message?: string;
  showSpinner?: boolean;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % MESSAGES.length), 2000);
    return () => clearInterval(t);
  }, []);

  const msg = useMemo(() => message || MESSAGES[idx], [message, idx]);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black text-white flex flex-col items-center justify-center overflow-hidden"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* Background grid and overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[radial-gradient(#fff_1px,transparent_1px)] bg-[length:18px_18px]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-screen bg-gradient-to-b from-white/15 to-transparent" />

      {/* Brand area */}
      <div className="w-full max-w-sm px-8 text-center">
        <img
          src="/assets/hyper-gear.png"
          alt="HYPER GEAR"
          className="block w-full h-auto select-none mb-3"
          draggable={false}
        />

        {/* Accent bars */}
        <div className="flex items-center justify-center gap-5 mb-6">
          <img
            src="/assets/hyper-left.png"
            alt=""
            className="w-16 md:w-20 animate-pulse"
          />
          <img
            src="/assets/hyper-right.png"
            alt=""
            className="w-16 md:w-20 animate-pulse"
          />
        </div>

        {/* Progress bar */}
        <div className="relative h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <span className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-pink-400/90 animate-[loader_1.6s_ease-in-out_infinite]" />
        </div>

        {/* Message */}
        <p className="mt-4 text-center text-sm text-gray-300 tracking-wide">{msg}</p>

        {/* Spinner fallback */}
        {showSpinner && (
          <div className="mx-auto mt-5 h-10 w-10 rounded-full border-4 border-pink-500/70 border-t-transparent animate-spin" />
        )}
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes loader {
          0% {
            transform: translateX(-30%);
            width: 30%;
          }
          50% {
            transform: translateX(40%);
            width: 45%;
          }
          100% {
            transform: translateX(120%);
            width: 30%;
          }
        }
      `}</style>
    </div>
  );
}

/** Overlay variant for client-side actions */
export function PageLoaderOverlay({
  show,
  message,
}: {
  show: boolean;
  message?: string;
}) {
  if (!show) return null;
  return <LoadingScreen message={message} />;
}
