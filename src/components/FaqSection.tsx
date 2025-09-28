// src/components/FaqSection.tsx
"use client";

import { useId, useState, useRef, useEffect } from "react";

type QA = { q: string; a: string };

const QAS: QA[] = [
  {
    q: "How comfortable are these shorts for MMA competition or sparring?",
    a: "These shorts are made from premium, lightweight and durable materials, perfect for MMA fights and comfortable for everyday wear.",
  },
  {
    q: "Do the shorts have a waistband grip or a velcro belt ?",
    a: "They feature a secure waistband with an internal drawcord for a locked-in feel during grappling and striking.",
  },
  {
    q: "Will the print fade or peel after a few washes?",
    a: "No—sublimated artwork is bonded into the fabric to resist fading, peeling, and cracking with regular washing.",
  },
  {
    q: "Should I order my usual size?",
    a: "Yes. The fit is true-to-size. If you’re between sizes or prefer a roomier fit, size up.",
  },
  {
    q: "Do you offer exchanges if the size doesn’t fit?",
    a: "Absolutely. If sizing isn’t right, you can request a quick exchange within the return window.",
  },
];

export default function FaqSection() {
  // first item open by default
  const [openIdx, setOpenIdx] = useState(0);

  return (
    <section id="faq" className="bg-black text-white px-6 sm:px-8 py-16">
      {/* Heading image */}
      <div className="text-center mb-10 md:mb-12">
        <img
          src="/assets/frequently-asked-heading.png"
          alt="Frequently Asked Questions"
          className="mx-auto w-[350px] sm:w-[320px] md:w-[420px] h-auto"
        />
      </div>

      {/* List */}
      <div className="max-w-5xl mx-auto">
        {/* top divider to match screenshot */}
        <div className="border-t border-white/15" />
        {QAS.map((item, i) => (
          <Row
            key={i}
            index={i}
            qa={item}
            open={openIdx === i}
            onToggle={() => setOpenIdx((p) => (p === i ? -1 : i))}
            // bottom divider on every row
            showDivider
          />
        ))}
      </div>
    </section>
  );
}

function Row({
  qa,
  index,
  open,
  onToggle,
  showDivider,
}: {
  qa: QA;
  index: number;
  open: boolean;
  onToggle: () => void;
  showDivider?: boolean;
}) {
  const btnId = useId();
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [maxH, setMaxH] = useState<number>(open ? 200 : 0);

  // measure answer height for smooth open/close
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (open) {
      const h = el.scrollHeight;
      // set twice to ensure transition on first open
      requestAnimationFrame(() => setMaxH(h));
    } else {
      setMaxH(0);
    }
  }, [open, qa.a]);

  return (
    <div className={showDivider ? "border-b border-white/15" : ""}>
      <button
        id={btnId}
        aria-controls={panelId}
        aria-expanded={open}
        onClick={onToggle}
        className="w-full text-left py-5 md:py-6 flex items-center gap-4"
      >
        <span className="text-lg md:text-xl font-extrabold tracking-tight flex-1">
          {qa.q}
        </span>

        {/* + / × icon at right */}
        <span
          className="ml-4 grid h-6 w-6 place-items-center text-white/90"
          aria-hidden="true"
        >
          {open ? (
            // ×
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            // +
            <svg viewBox="0 0 24 24" className="h-5 w-5">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </span>
      </button>

      {/* Answer panel (animated height) */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={btnId}
        className="overflow-hidden transition-[max-height] duration-300 ease-out"
        style={{ maxHeight: `${maxH}px` }}
      >
        <div ref={panelRef} className="pb-5 md:pb-6 pr-10">
          <p className="text-sm md:text-base text-white/75">
            {qa.a}
          </p>
        </div>
      </div>
    </div>
  );
}
