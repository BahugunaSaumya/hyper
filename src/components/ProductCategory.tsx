"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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

  const [emblaRef] = useEmblaCarousel({
    dragFree: true,
    align: "start",
  });

  // Preload natural image widths BEFORE render
  useEffect(() => {
    const loadAll = async () => {
      const data: Record<string, number> = {};

      const promises = productCategories.map(cat => {
        return new Promise<void>(resolve => {
          const img = new window.Image();
          img.src = cat.image;

          img.onload = () => {
            const naturalW = img.naturalWidth;
            const naturalH = img.naturalHeight;
            const renderedWidth = (naturalW / naturalH) * 280;
            data[cat.slug] = renderedWidth;
            resolve();
          };
        });
      });

      await Promise.all(promises);
      setWidths(data);
    };

    loadAll();
  }, []);

  return (
    <section
      id="productCategory"
      className="relative bg-white text-black pt-10 sm:pt-12 pb-10 sm:pb-12"
    >
      <h2 className="text-2xl md:text-2xl font-bold px-6 sm:px-8 md:text-center text-left">
        PRODUCT CATEGORIES
      </h2>

      <div className="relative max-w-7xl mx-auto mt-8">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex items-start md:justify-center gap-6">
            {productCategories.map((category, loop) => {
              const isFirst = loop === 0;
              const isLast = loop === productCategories.length - 1;
              return (
                <div
                  key={category.slug}
                  onClick={() =>
                    router.push(`/listing/category/${category.slug}`)
                  }
                  className={`flex-shrink-0 cursor-pointer text-left transition-transform ${
                    isFirst ? "pl-6" : isLast ? "pr-6" : ""
                  }`}
                >
                  {/* IMAGE */}
                  <div
                    className="h-[280px] flex items-center"
                    style={{
                      width: widths[category.slug] || 400, // used instantly
                    }}
                  >
                    <Image
                      src={category.image}
                      alt={category.title}
                      width={400}
                      height={280}
                      className="h-full w-auto rounded-lg"
                      draggable={false}
                      priority={loop === 0}
                      unoptimized
                    />
                  </div>
                  <div
                    className="pt-2"
                    style={{
                      width: widths[category.slug] || 400,
                    }}
                  >
                    <h3 className="font-semibold">{category.title}</h3>
                    <p className="text-sm text-gray-700">{category.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}