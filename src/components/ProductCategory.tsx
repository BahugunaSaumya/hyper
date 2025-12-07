"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";

const productCategories = [
  {
    slug: "male-mma-shorts",
    image: "/assets/male-mma-shorts.avif",
    title: "Male MMA Shorts",
    description:
      "Built for performance and power — designed to handle intense training, sparring, and competition.",
  },
  {
    slug: "female-mma-shorts",
    image: "/assets/female-mma-shorts.avif",
    title: "Female MMA Shorts",
    description:
      "Engineered for comfort, flexibility, and strength — made to move with you through every session.",
  },
  {
    slug: "male-compressions",
    image: "/assets/male-compressions.avif",
    title: "Male Compressions",
    description:
      "High-performance compression wear that enhances mobility, boosts recovery, and keeps you fight-ready.",
  },
];

export default function ProductCategorySection() {
  const router = useRouter();
  const [widths, setWidths] = useState<Record<string, number>>({});

  const imageRefs = useRef<Record<string, HTMLImageElement | null>>({});

  // Initialize Embla Carousel
  const [emblaRef] = useEmblaCarousel({
    dragFree: true,
    align: "start",
  });

  // Measure image widths once they load
  useEffect(() => {
    const handleResize = () => {
      const newWidths: Record<string, number> = {};
      for (const cat of productCategories) {
        const img = imageRefs.current[cat.slug];
        if (img) {
          newWidths[cat.slug] = img.offsetWidth;
        }
      }
      setWidths(newWidths);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section
      id="productCategory"
      className="relative bg-white text-black pt-10 sm:pt-12 pb-10 sm:pb-12"
    >
      <h2 className="text-2xl md:text-2xl font-bold px-6 sm:px-8 text-center">
        PRODUCT CATEGORIES
      </h2>

      <div className="relative max-w-7xl mx-auto mt-8">
        {/* Embla Viewport */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex items-start md:justify-center gap-6">
            {productCategories.map((category , loop) => {
              const isFirst = loop === 0; const isLast = loop === productCategories.length - 1;
              return(<div
                key={category.slug}
                onClick={() =>
                  router.push(`/listing/category/${category.slug}`)
                }
                className={`flex-shrink-0 cursor-pointer text-left focus:outline-none transition-transform ${ isFirst ? "pl-6" : isLast ? "pr-6" : "" }`}
              >
                {/* Image */}
                <div className="h-[280px] flex items-center justify-start">
                  <img
                    ref={(el) => (imageRefs.current[category.slug] = el)}
                    src={category.image}
                    alt={category.title}
                    className="h-full w-auto rounded-lg"
                    draggable={false}
                    onLoad={() => {
                      if (imageRefs.current[category.slug]) {
                        setWidths((prev) => ({
                          ...prev,
                          [category.slug]:
                            imageRefs.current[category.slug]?.offsetWidth || 0,
                        }));
                      }
                    }}
                  />
                </div>

                {/* Text below image — matches image width */}
                <div
                  className="pt-2"
                  style={{
                    maxWidth: widths[category.slug]
                      ? `${widths[category.slug]}px`
                      : "100%",
                  }}
                >
                  <h3 className="font-semibold">{category.title}</h3>
                  <p className="text-sm text-gray-700">{category.description}</p>
                </div>
              </div>
              )}
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
