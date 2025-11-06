"use client";
import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";

const proFighterStatements = [
  { image: "/assets/riyathapa.avif", title: "Riya Thapa" },
  { image: "/assets/Digamber-Singh-Rawat.avif", title: "Digamber Singh Rawat" },
  { image: "/assets/Aminder-Singh-Bisht.avif", title: "Aminder Singh Bisht" },
  { image: "/assets/Sagar-Thapa.avif", title: "Sagar Thapa" },
  { image: "/assets/Tribhuvan-Issar.avif", title: "Tribhuvan Issar" },
  { image: "/assets/Satyam-Kumar.avif", title: "Satyam Kumar" },
  { image: "/assets/Abhishek-Negi.jpg", title: "Abhishek Negi" },
];

export default function ProFighterSection() {
  const [imageWidths, setImageWidths] = useState<Record<string, number>>({});
  const autoplay = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  const [emblaRef] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
      dragFree: true,
    },
    [autoplay.current]
  );

  // Load image widths dynamically
  useEffect(() => {
    const loadWidths = async () => {
      const widths: Record<string, number> = {};
      await Promise.all(
        proFighterStatements.map(
          (s) =>
            new Promise<void>((resolve) => {
              const img = new Image();
              img.src = s.image;
              img.onload = () => {
                widths[s.image] = img.width;
                resolve();
              };
              img.onerror = () => resolve();
            })
        )
      );
      setImageWidths(widths);
    };
    loadWidths();
  }, []);

  return (
    <section className="relative bg-black text-white pt-13 pb-13">
      <h2 className="text-lg md:text-2xl font-bold px-6 sm:px-8 text-center">
        LOVED BY TOP PRO FIGHTERS
      </h2>

      <div className="relative max-w-7xl mx-auto mt-8 overflow-hidden">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex select-none gap-6 px-6">
            {proFighterStatements.map((statement) => (
              <div
                key={statement.title}
                className="flex-none"
              >
                <div className="rounded-lg overflow-hidden">
                  <img
                    src={statement.image}
                    alt={statement.title}
                    className="rounded-lg h-[350px]"
                    draggable={false}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
