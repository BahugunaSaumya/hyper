"use client";

import { useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ErrorMessage from "./ui/ErrorMessage";
import SuccessMessage from "./ui/SuccessMessage";
import { useAddToCart } from "./UseAddToCart";

type Props = {
  productId: number
  href?: string;
  title: string;
  slug: string;
  image: string;
  mrp: number;
  price: number;
  className?: string;
  newLaunch: boolean;
  bestseller: boolean;
  color: string;
  variantId: number;
  size: string;
  showWishlist?: boolean;
  wishlistId?: number;
  onDeleteSuccess?: (id: number) => void;
};

export default function ProductTile({
  productId,
  href,
  title,
  slug,
  image,
  mrp,
  price,
  newLaunch,
  bestseller,
  color,
  variantId,
  size,
  showWishlist = true,
  wishlistId,
  onDeleteSuccess,
}: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const { user } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { addProduct } = useAddToCart();
  const [isWishlisted, setIsWishlisted] = useState(!!wishlistId);
  const [wishlistIdState, setWishlistId] = useState<number | undefined>(wishlistId);

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ variantId }),
      });

      if (res.ok) {
        setSuccess(`Success! ${title} added to wishlist!`);
        const data = await res.json();
        setWishlistId(data.wishlist_id);
        setIsWishlisted(true);
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError("Something went wrong");
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const result = await addProduct({
        product: {
          id: productId,
          mrp: mrp,
          price: price,
        },
        variantId: variantId,
        qty: 1,
        image: image,
        sourceEl: imgRef.current
      });

      if (result) {
        setSuccess(`Success! ${title} added to bag.`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to add to cart");
    }
  };
  const deleteWishlistItem = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !wishlistIdState) return;

    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/wishlist/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ wishlistId: wishlistIdState }),
      });

      if (res.ok) {
        setIsWishlisted(false);
        setSuccess("Removed from wishlist");
        if (onDeleteSuccess) onDeleteSuccess(wishlistIdState);
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (err) {
      setError("Failed to delete item.");
    }
  };

  useEffect(() => {
    const checkWishlist = async () => {
      if (!user) return;

      try {
        const token = await user.getIdToken();

        const res = await fetch("/api/wishlist", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) return;

        const data = await res.json();

        const item = data.wishlist?.find(
          (item: any) => item.variant_id === variantId
        );

        if (item) {
          setIsWishlisted(true);
          setWishlistId(item.wishlist_id);
        }

      } catch (err) {
        setError("Wishlist check failed " + err);
      }
    };

    checkWishlist();
  }, [user, variantId]);

  const content = (
    <>
    <ErrorMessage message={error || ""} onClose={() => setError(null)} />
    <SuccessMessage message={success || ""} onClose={() => setSuccess(null)} />
      <div className={`rounded-2xl bg-white transition`}>
      <div className="relative bg-neutral-100 overflow-hidden flex items-center justify-center max-h-[270px] sm:max-h-[320px] md:max-h-[380px] lg:max-h-[450px]">
        {showWishlist && 
          <button 
            onClick={isWishlisted ? deleteWishlistItem : handleWishlist}
            className="absolute top-3 left-3 z-10 rounded-full hover:bg-white transition-colors shadow-sm">
            <img
              src={
                isWishlisted
                  ? "/assets/wishlist-filled.png"
                  : "/assets/heart-icon.avif"
              }
              alt="wishlist icon"
              className={isWishlisted ? "h-5 w-5 sm:h-7 sm:w-7 object-contain" : 'h-6 w-6 sm:h-8 sm:w-8 object-contain'}
            />
          </button>
        }
        {!showWishlist && 
          <button 
            onClick={deleteWishlistItem}
            className="absolute top-3 left-3 z-10 rounded-full hover:bg-white transition-colors shadow-sm">
            <img
              src='/assets/trash.png'
              alt='trash icon'
              className="h-6 w-6 sm:h-8 sm:w-8 object-contain"
            />
          </button>
        }
        {size?.length &&
        <button 
          onClick={handleAddToCart}
          className="absolute top-3 right-3 z-10 rounded-full hover:bg-white transition-colors shadow-sm">
          <img
            src='/assets/add-to-cart.avif'
            alt='add to bag icon'
            className="h-6 w-6 sm:h-8 sm:w-8 object-contain"
          />
        </button>
        }
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={imgRef} src={image} alt={title} className="max-h-full w-auto object-contain" />
      </div>

      <div className="mt-1">
        <span className="text-[#757575] text-[9px] sm:text-[12px] whitespace-nowrap">
          {bestseller ? ('Best Seller  •  ') : newLaunch ? ('New Arrival  •  ') : null}  {color}
        </span> 
        <div className="font-bold">{title}</div>

        <div className="flex items-center gap-3">
          {price !== undefined && (
            <div className="text-sm sm:text-base font-bold">
              {`₹ ${price}`}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  );

  return href ? <Link href={href}>{content}</Link> : content;
}
