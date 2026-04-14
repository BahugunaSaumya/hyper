"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ProductTile from "@/components/ProductTile"; // Adjust path

export default function WishlistPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }

    if (user) {
      (async () => {
        try {
          const token = await user.getIdToken();
          const res = await fetch("/api/wishlist", {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          setItems(data.wishlist || []);
        } catch (err) {
          console.error(err);
        } finally {
          setIsFetching(false);
        }
      })();
    }
  }, [user, loading, router]);

  if (loading || isFetching) return <div className="p-10 text-center">Loading Wishlist...</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6 text-center">Your Wishlist</h1>
      
      {items.length === 0 ? (
        <p className="text-neutral-500">Your wishlist is empty.</p>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <ProductTile
              key={item.product_id}
              productId={item.product_id}
              title={item.title}
              slug={item.product_slug}
              image={item.product_slug ? `/assets/models/products/${item.product_slug}/1.avif` : "/assets/placeholder.png"}
              mrp={item.mrp}
              price={item.price}
              color={item.product_color || ""}
              newLaunch={item.new_launch}
              bestseller={false}
              variantId={item.variant_id}
              size={item.size}
              href={`/product/${item.product_slug}`}
              showWishlist={false}
              wishlistId={item.wishlist_id}
            />
          ))}
        </div>
      )}
    </div>
  );
}