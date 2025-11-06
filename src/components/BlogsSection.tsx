"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Image from "next/image";
import { useRouter } from "next/navigation";

const BLOGS = [
  {
    slug: "winning-the-cage-hyper-athletes-shine-at-mfn",
    date: "07 July, 2025",
    image: "/assets/winning-the-cage.avif",
    title: "Winning the Cage: Hyper Athletes Shine at MFN",
  },
  {
    slug: "elevate-your-game-with-hyper",
    date: "07 July, 2025",
    image: "/assets/elevate-your-game.avif",
    title: "Elevate Your Game with Hyper—Worn by the Country’s Elite Fighters",
  },
  {
    slug: "team-hyper-power-passion-and-pure-energy",
    date: "07 July, 2025",
    image: "/assets/team-hyper.avif",
    title: "Team Hyper: Power, Passion, and Pure Energy",
  },
];

export default function BlogsSection() {
  const router = useRouter();

  // Initialize Embla
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    skipSnaps: false,
    loop: false, // no loop — match your previous behavior
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  // Handle arrow states
  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
  }, [emblaApi, onSelect]);

  // Navigation functions
  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  return (
    <section id="blogs" className="relative bg-white text-black px-6 sm:px-8">
      <div className="text-center pt-10 sm:pt-12">
        <img
          src="/assets/our-blogs-heading.png"
          alt="Our Blogs"
          className="mx-auto mb-5 w-64 sm:w-80"
        />
      </div>

      <div className="relative max-w-7xl mx-auto mt-4">
        {/* Left Arrow */}
        <button
          onClick={scrollPrev}
          disabled={!canScrollPrev}
          className={`absolute top-1/2 -translate-y-1/2 left-0 z-20 disabled:opacity-40`}
        >
          <Image
            src="/assets/left-arrow.avif"
            alt="Previous"
            width={40}
            height={40}
            className="rounded-full shadow cursor-pointer"
          />
        </button>

        {/* Embla Carousel */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex items-start gap-6">
            {BLOGS.map((b) => (
              <button
                key={b.slug}
                onClick={() => router.push(`/blog/${b.slug}`)}
                className="flex-shrink-0 text-left focus:outline-none"
              >
                <p className="font-bold mb-2">{b.date}</p>
                <div className="h-[350px] flex items-center justify-start">
                  <img
                    src={b.image}
                    alt={b.title}
                    className="h-full w-auto rounded-lg"
                    draggable={false}
                  />
                </div>
                <p className="pt-2 mb-8 flex text-wrap">{b.title}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right Arrow */}
        <button
          onClick={scrollNext}
          disabled={!canScrollNext}
          className={`absolute top-1/2 -translate-y-1/2 right-0 z-20 disabled:opacity-40`}
        >
          <Image
            src="/assets/right-arrow.avif"
            alt="Next"
            width={40}
            height={40}
            className="rounded-full shadow cursor-pointer"
          />
        </button>
      </div>
    </section>
  );
}
