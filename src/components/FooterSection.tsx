// src/components/FooterSection.tsx
"use client";

export default function FooterSection() {
  return (
    <section className="bleed-x bg-black text-white font-sans py-10 sm:py-12 px-4 sm:px-12 mb-3">
      <div className="mx-auto w-full max-w-7xl">
        {/* ===== Edge-to-edge hero logo =====
            Pull the logo out to the section edges using negative x-margins,
            so it visually touches the padding just like your other full-bleed parts. */}
        <div className="-mx-2 sm:-mx-12 mb-8 sm:mb-10">
          <img
            src="/assets/hyper-gear.png"
            alt="HYPER GEAR"
            className="block w-full h-auto select-none"
            draggable={false}
          />
        </div>

        {/* Divider */}
        <div className="mb-6 sm:mb-8">
          {/* Use the asset if you prefer, or switch to a CSS line by uncommenting below */}
          <img src="/assets/Line 3.png" alt="" className="w-full max-w-none" />
          {/* <div className="h-px w-full bg-white/30" /> */}
        </div>

        {/* Top bars row */}
        <div className="flex items-center justify-between mb-8 sm:mb-10">
          <img
            src="/assets/hyper-left.png"
            alt=""
            className="w-24 sm:w-28 md:w-32 select-none"
            draggable={false}
          />
          <img
            src="/assets/hyper-right.png"
            alt=""
            className="w-24 sm:w-28 md:w-32 select-none"
            draggable={false}
          />
        </div>

        {/* Nav + Instagram */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Nav */}
          <nav
            aria-label="Footer"
            className="flex flex-col sm:flex-row justify-between items-center w-full max-w-4xl mx-auto gap-y-3 text-base sm:text-lg md:text-xl font-extrabold tracking-wide"
          >
            <a href="#about" className="hover:underline underline-offset-4">
              About
            </a>
            <a href="#products" className="hover:underline underline-offset-4">
              Products
            </a>
            <a href="#blogs" className="hover:underline underline-offset-4">
              Blogs
            </a>
            <a href="/contact" className="hover:underline underline-offset-4">
              Contact
            </a>
          </nav>


          {/* Instagram CTA */}
          <div className="w-full flex justify-center">
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
