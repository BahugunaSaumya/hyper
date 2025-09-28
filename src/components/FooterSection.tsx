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
      <div className="mx-auto w-full max-w-7xl flex flex-col items-center">
        {/* Edge-to-edge logo */}
        <div className="-mx-4 sm:-mx-12 mb-8 sm:mb-10 w-full">
          <img
            src="/assets/hyper-gear.png"
            alt="HYPER GEAR"
            className="block w-full h-auto max-w-none select-none"
            draggable={false}
          />
        </div>

        {/* Divider */}
        <div className="mb-6 sm:mb-8 w-full">
          <img src="/assets/Line 3.png" alt="" className="block w-full max-w-none" />
        </div>

        {/* Bars (kept side-by-side but centered) */}
        <div className="mb-8 sm:mb-10 w-full flex flex-row items-center justify-center gap-34">
          <img
            src="/assets/hyper-left.png"
            alt=""
            className="w-29 sm:w-28 md:w-32 max-w-full select-none"
            draggable={false}
          />
          <img
            src="/assets/hyper-right.png"
            alt=""
            className="w-29 sm:w-28 md:w-32 max-w-full select-none"
            draggable={false}
          />
        </div>

        {/* Everything below is stacked vertically & centered */}
        <div className="w-full max-w-4xl flex flex-col items-center gap-6">
          {/* Nav (vertical) */}
          <nav
            aria-label="Footer"
            className="
              w-full flex flex-col items-center
              text-base sm:text-lg md:text-xl font-extrabold tracking-wide
              gap-3 sm:gap-3.5
            "
          >
            <a href="/#about" className="hover:underline underline-offset-4">About</a>
            <a href="/#products" className="hover:underline underline-offset-4">Products</a>
            <a href="/#blogs" className="hover:underline underline-offset-4">Blogs</a>
            <a href="/contact" className="hover:underline underline-offset-4">Contact</a>
          </nav>

          {/* Instagram CTA (centered below nav) */}
          <a
            href="https://www.instagram.com/get_hypergear?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-white text-black px-4 py-2 rounded font-bold"
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
    </section>
  );
}
