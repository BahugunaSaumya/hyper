"use client";
import useEmblaCarousel from "embla-carousel-react";
import AutoScroll from "embla-carousel-auto-scroll";
import { useCallback, useEffect, useRef } from "react";

const proFighterStatements = [
  { image: "/assets/riya-thapa.avif", title: "Riya Thapa" },
  { image: "/assets/digambar-singh.avif", title: "Digamber Singh Rawat" },
  // { image: "/assets/Aminder-Singh-Bisht.avif", title: "Aminder Singh Bisht" },
  { image: "/assets/sagar-thapa.avif", title: "Sagar Thapa" },
  { image: "/assets/tribhuvan.avif", title: "Tribhuvan Issar" },
  { image: "/assets/satyam.avif", title: "Satyam Kumar" },
  { image: "/assets/abhishek-negi.avif", title: "Abhishek Negi" },
];

export default function ProFighterSection() {
  const autoScroll = useRef(null);
  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
      dragFree: true,
      align: "start",
    },
    [
      AutoScroll({
        speed: 1.2,
        stopOnInteraction: true,
        stopOnMouseEnter: true, 
      }),
    ]
  );

  useEffect(() => {
    if (emblaApi) {
      // @ts-ignore
      autoScroll.current = emblaApi.plugins().autoScroll;
    }
  }, [emblaApi]);

  // Handler to STOP scrolling (Desktop: mouse enter, Mobile: touch start)
  const handleStopScrolling = useCallback(() => {
    if (autoScroll.current) {
      // @ts-ignore
      autoScroll.current.stop();
    }
  }, []);

  // Handler to RESUME scrolling (Desktop: mouse leave, Mobile: touch end)
  const handleResumeScrolling = useCallback(() => {
    if (autoScroll.current) {
      // @ts-ignore
      autoScroll.current.play();
    }
  }, []);

  return (
    <section className="relative bg-black text-white pt-13 pb-13">
      <h2 className="text-lg md:text-2xl font-bold px-6 sm:px-8 text-center">
        LOVED BY TOP PRO FIGHTERS
      </h2>

      <div
        className="relative max-w-7xl mx-auto mt-8 overflow-hidden"
        // Desktop Events
        onMouseEnter={handleStopScrolling}
        onMouseLeave={handleResumeScrolling}
        // Mobile/Touch Events
        onTouchStart={handleStopScrolling}
        onTouchEnd={handleResumeScrolling}
      >
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex select-none gap-6 px-6">
            {proFighterStatements.map((s) => (
              <div key={s.title} className="flex-none">
                <img
                  src={s.image}
                  className="rounded-lg h-[350px]"
                  alt={s.title}
                  draggable={false}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}