// src/components/FooterSection.tsx
"use client";

export default function FooterSection() {
  return (
    <section
      className="
        bleed-x bg-black text-white font-sans
        py-10 sm:py-12 px-4 sm:px-12
        overflow-x-clip overflow-hidden 
        isolate
      "
    >
      <div className="mx-auto w-full max-w-7xl">
        {/* Edge-to-edge hero logo (match section padding with negative margins) */}
        <div className="-mx-4 sm:-mx-12 mb-8 sm:mb-10">
          <img
            src="/assets/hyper-gear.png"
            alt="HYPER GEAR"
            className="block w-full h-auto max-w-none select-none"
            draggable={false}
          />
        </div>

        {/* Divider */}
        <div className="mb-6 sm:mb-8">
          <img src="/assets/Line 3.png" alt="" className="block w-full max-w-none" />
          {/* Or CSS line:
          <div className="h-px w-full bg-white/30" /> */}
        </div>

        {/* Top bars row */}
        <div className="flex items-center justify-between mb-8 sm:mb-10">
          <img
            src="/assets/hyper-left.png"
            alt=""
            className="w-24 sm:w-28 md:w-32 max-w-full select-none"
            draggable={false}
          />
          <img
            src="/assets/hyper-right.png"
            alt=""
            className="w-24 sm:w-28 md:w-32 max-w-full select-none"
            draggable={false}
          />
        </div>

        {/* Nav + Instagram */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Nav */}
          <nav
            aria-label="Footer"
            className="
              flex flex-row flex-nowrap items-center
              justify-center md:justify-between
              w-full max-w-4xl mx-auto
              text-base sm:text-lg md:text-xl font-extrabold tracking-wide
              space-x-[28px] sm:space-x-[40px] md:space-x-[50px]
            "
          >
            <a href="#about" className="hover:underline underline-offset-4 whitespace-nowrap">About</a>
            <a href="#products" className="hover:underline underline-offset-4 whitespace-nowrap">Products</a>
            <a href="#blogs" className="hover:underline underline-offset-4 whitespace-nowrap">Blogs</a>
            <a href="/contact" className="hover:underline underline-offset-4 whitespace-nowrap">Contact</a>
          </nav>

          {/* Instagram CTA */}
          <div className="w-full flex justify-center sm:justify-end">
            <a
              href="https://www.instagram.com/hyperfitness.in/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded font-bold pl-[20px]"
              aria-label="Hyper on Instagram"
            >
              <img
                src="/assets/instagram-icon.png"
                alt=""
                className="w-5 h-5"
                draggable={false}
              />
              Hyper
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
