"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useAddToCart } from "./UseAddToCart";
import CompleteTheLook from "./CompleteLook";
import FaqSection from "@/components/FaqSection";
import FooterSection from "@/components/FooterSection";
import YouMayAlsoLike from "./YouMayAlsoLike";
import BadgeRow from "./pdp/BadgeRow";
import Coupons from "./pdp/Coupons";
import ErrorMessage from "./ui/ErrorMessage";

type ProductModel = {
  id: number;
  title: string;
  slug: string;
  description?: string;
  mrp: number;
  price: number;
  discountPercentage?: number;
  bestseller?: boolean;
  new_launch?: boolean;
  sizes: Record<number, string>;
  images: string[],
  gender: string,
  color: string
};

const productImage = (slug: string) => `/assets/models/products/${slug}/1.avif`;

export default function ProductDetailView({
  product,
}: {
  product: ProductModel;
}) {
  const { addProduct } = useAddToCart();

  const heroImgRef = useRef<HTMLImageElement | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<{
    id: number;
    size: string;
  } | null>(null);
  const [active, setActive] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCompleteLook, setShowCompleteLook] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Logic for specific date/time release
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    setImages(product.images || []);
    setActive(0);
  }, [product.images]);

  const price = product.price ?? 0;
  const MRP = product.mrp ?? 0;

  const onThumbError = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setActive((a) => (a >= idx ? Math.max(0, a - 1) : a));
  };

  const handleAdd = async () => {
    if (isLocked) return; 
    if (!selectedVariant) {
      setNotice("Please select a size to continue.");
      setTimeout(() => setNotice(null), 2000);
      return;
    }
    try {
      setError(null);
      await addProduct({
        product: {
          id: product.id,
          mrp: product.mrp,
          price
        },
        variantId: selectedVariant.id,
        image: productImage(product.slug),
        sourceEl: heroImgRef.current,
      });
      setShowCompleteLook(false);
      requestAnimationFrame(() => setShowCompleteLook(true));
    } catch (err: any) {
      setError(err.message);
    }
  };

  const tStartX = useRef(0);
  const tDX = useRef(0);
  const tDragging = useRef(false);
  const SWIPE_THRESHOLD = 23; 

  const onTouchStartHero = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    tDragging.current = true;
    tStartX.current = e.touches[0].clientX;
    tDX.current = 0;
  };
  const onTouchMoveHero = (e: React.TouchEvent) => {
    if (!tDragging.current) return;
    tDX.current = e.touches[0].clientX - tStartX.current;
  };
  const onTouchEndHero = () => {
    if (!tDragging.current) return;
    const dx = tDX.current;
    tDragging.current = false;
    tDX.current = 0;

    if (Math.abs(dx) > SWIPE_THRESHOLD && images.length > 1) {
      if (dx < 0) setActive((i) => (i + 1) % images.length); 
      else setActive((i) => (i - 1 + images.length) % images.length); 
    }
  };

  return (
    <>
      <ErrorMessage message={error || ""} onClose={() => setError(null)} />
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="w-full min-w-0">
          <div className="grid md:grid-cols-[5rem_1fr] lg:grid-cols-[6rem_1fr] gap-3 md:gap-5">
            <div className="order-1 md:order-2 min-w-0">
              <div
                className={`relative w-full max-w-full overflow-hidden rounded-none bg-transparent shadow-none`}
                style={{ touchAction: "pan-y" }}
                onTouchStart={onTouchStartHero}
                onTouchMove={onTouchMoveHero}
                onTouchEnd={onTouchEndHero}
                onTouchCancel={onTouchEndHero}
              >
                {productImage(product.slug) ? (
                  <img
                    ref={heroImgRef}
                    src={images[active] ?? productImage(product.slug)}
                    alt={product.title}
                    className="block h-full w-full max-w-full object-cover object-bottom transition-all duration-300"
                    loading="eager"
                    draggable={false} />
                ) : (
                  <div className="grid h-full w-full place-items-center text-gray-400">No image</div>
                )}
              </div>
              <div
                className={`mt-3 px-1 flex gap-[6.5px] sm:gap-3 overflow-x-auto md:hidden snap-x snap-mandatory overscroll-x-contain scroll-smooth touch-pan-x no-scrollbar`}
              >
                {product.images.map((src, i) => (
                  <button
                    key={`${src}__m${i}`}
                    onClick={() => setActive(i)}
                    className={`flex-shrink-0 h-16 w-16 sm:h-20 sm:w-20 overflow-hidden rounded-lg border transition ${i === active ? "border-black" : "border-gray-200"} snap-start`}
                    aria-label={`View ${product.title} image ${i + 1}`}
                  >
                    <img
                      src={src}
                      alt={`${product.title} ${i + 1}`}
                      className="block h-full w-full object-cover"
                      onError={() => onThumbError(i)}
                      draggable={false} />
                  </button>
                ))}
              </div>
            </div>
            <div className="order-2 md:order-1 hidden md:flex md:flex-col gap-2 md:gap-3 overflow-y-auto md:max-h-[min(80vh,40rem)] pr-1 min-w-0">
              {product.images.map((src, i) => (
                <button
                  key={`${src}__d${i}`}
                  onClick={() => setActive(i)}
                  className={`h-16 w-16 lg:h-20 lg:w-20 overflow-hidden rounded-lg border transition ${i === active ? "border-black" : "border-gray-200"}`}
                  aria-label={`View ${product.title} image ${i + 1}`}
                >
                  <img
                    src={src}
                    alt={`${product.title} ${i + 1}`}
                    className="block h-full w-full object-cover"
                    onError={() => onThumbError(i)}
                    draggable={false} />
                </button>
              ))}
            </div>
          </div>
        </div>
          <div>
            <h1 className="text-3xl font-bold">{product.title}</h1>

            {product.bestseller && (
              <span className="inline-block mt-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs">
                Best Seller
              </span>
            )}

            <BadgeRow />

            <div className="mt-4 flex items-end gap-3">
              <span className="text-3xl font-extrabold">₹{price}</span>
              {price < MRP && (
                <span className="line-through text-gray-400">₹{MRP}</span>
              )}
              {product.discountPercentage && (
                <span className="bg-green-600 text-white px-2 py-1 text-xs rounded-full">
                  {product.discountPercentage}% OFF
                </span>
              )}
              <span className="text-[#757575] text-[12px] sm:text-[12px]">* Inclusive of all taxes</span>
            </div>

            <Coupons productPrice={product.price} />

            {/* Sizes: Hidden if locked */}
            {!isLocked && (
              <div className="mt-6">
                <div className="font-bold mb-2">Available Sizes</div>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(product.sizes).length !== 0 && Object.entries(product.sizes).map(([variantId, size]) => (
                    <button
                      key={variantId}
                      onClick={() =>
                        setSelectedVariant({
                          id: Number(variantId),
                          size,
                        })
                      }
                      className={`px-4 py-2 rounded-md border font-bold
                        ${
                          selectedVariant?.id === Number(variantId)
                            ? "border-pink-500 bg-pink-50 text-pink-600"
                            : "border-black"
                        }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions: Replaced with notice if locked */}
            <div className="mt-6 flex flex-col gap-3">
              {(Object.keys(product.sizes).length === 0) ? (
                <div className="rounded-full py-4 text-center bg-gray-50 text-pink-600 font-bold border-2 border-dashed border-pink-200">
                  Product Out Of Stock
                </div>
              ) : (
                <>
                  <button
                    onClick={handleAdd}
                    className="rounded-full font-title py-4 font-bold border border-black hover:bg-[#FF5CE9] hover:text-white transition"
                  >
                    Add to Cart
                  </button>

                  <Link
                    href="/checkout"
                    className="rounded-full py-4 text-center bg-gray-900 text-white font-title"
                  >
                    Buy Now
                  </Link>
                </>
              )}
            </div>

            {notice && (
              <div className="mt-3 bg-pink-50 text-pink-700 text-center py-2 rounded">
                {notice}
              </div>
            )}
          </div>
        </div>
        <div className="mt-8 border-t pt-8">
          <h2 className="text-xl font-bold mb-4 uppercase tracking-wide">
            Product Details
          </h2>
          <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
            {product.description ? (
              product.description.split('\n').map((paragraph, idx) => (
                <p key={idx} className="mb-4">
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="text-gray-500 italic">No description available for this product.</p>
            )}
          </div>
        
          <div className="mt-6 grid grid-cols-2 gap-4 text-xs border-y py-4 bg-gray-50 px-4 rounded-lg">
            <div>
              <span className="text-gray-500 block uppercase font-semibold">Gender</span>
              <span className="font-bold">{product.gender || 'Unisex'}</span>
            </div>
            <div>
              <span className="text-gray-500 block uppercase font-semibold">Color</span>
              <span className="font-bold">{product.color || 'Original'}</span>
            </div>
          </div>
        </div>
        <CompleteTheLook
          productId={product.id}
          initialData={null}
          visible={showCompleteLook}
          onClose={() => setShowCompleteLook(false)}
        />

        <div className="mt-16">
          <YouMayAlsoLike excludeTitle={product.title} limit={4} />
        </div>
      </div>

      <FaqSection />
      <FooterSection />
    </>
  );
}