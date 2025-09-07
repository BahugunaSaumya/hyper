"use client";

import { useRef } from "react";

export default function BlogsSection() {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const scrollBlogs = (dir: number) => {
    const el = scrollRef.current;
    if (!el) return;
    // keep same behavior: horizontal scroll, no style change to markup
    const step = 360; // approx card width + gap; adjust if needed
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <section id="blogs" className="py-16 relative bg-white text-black px-6">
      {/* Header Image (kept same structure as your HTML) */}
      <section className="py-20 bg-white text-black">
        <div className="text-center">
          <img src="/assets/our-blogs-heading.png" alt="Our Blogs" className="mx-auto mb-6 w-64 sm:w-80" />
          <img
            src="/assets/bars.png"
            alt="Bars Graphic"
            className="w-24 sm:w-32 md:w-40 ml-[.3rem] sm:ml-[.3rem] md:ml-[12rem] z-10"
          />
        </div>

        {/* Blog Carousel */}
        <div className="relative max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6 px-2">
            <div></div>
            <div className="flex gap-4">
              <button className="text-2xl hover:text-pink-500 transition" onClick={() => scrollBlogs(-1)}>←</button>
              <button className="text-2xl hover:text-pink-500 transition" onClick={() => scrollBlogs(1)}>→</button>
            </div>
          </div>

          <div
            style={{ fontFamily: "'Palanquin', sans-serif" }}
            id="blogScroll"
            ref={scrollRef}
            className="flex overflow-x-auto space-x-6 scroll-smooth scroll-container pb-4"
          >
            {/* Blog Card 1 */}
            <div className="min-w-[300px] flex-shrink-0">
              <p className="text-sm font-bold mb-1">07 July, 2025</p>
              <img src="/assets/blog-1.png" alt="" className="rounded-lg w-full h-[280px] object-cover mb-2" />
              <p className="text-gray-800">
                Team Hyper: Power, Passion, and Pure Energy
              </p>
            </div>

            {/* Blog Card 2 */}
            <div className="min-w-[300px] flex-shrink-0">
              <p className="text-sm font-bold mb-1">07 July, 2025</p>
              <img src="/assets/blog-2.png" alt="" className="rounded-lg w-full h-[280px] object-cover mb-2" />
              <p className="text-gray-800">
                Elevate Your Game with Hyper—Worn by the Country’s Elite Fighters
              </p>
            </div>

            {/* Blog Card 3 */}
            <div className="min-w-[300px] flex-shrink-0">
              <p className="text-sm font-bold mb-1">07 July, 2025</p>
              <img src="/assets/blog-3.png" alt="" className="rounded-lg w-full h-[280px] object-cover mb-2" />
              <p className="text-gray-800">
                Winning the Cage: Hyper Athletes Shine at MFN
              </p>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}
