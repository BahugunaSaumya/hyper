"use client";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import Cookies from "js-cookie";

export function useAddToCart() {
  const { refreshCart } = useCart();
  const { user } = useAuth() as any;

  async function addProduct({
    product,
    variantId,
    qty = 1,
    image,
    sourceEl,
  }: {
    product: { id: number; mrp: number; price: number };
    variantId: number;
    qty?: number;
    image: string;
    sourceEl?: HTMLElement | null;
  }) {
    if (!variantId) return false;

    // 1. Prepare Identification
    const token = user ? await user.getIdToken() : null;
    let guestId = Cookies.get("guest_id");
    
    if (!user && !guestId) {
      guestId = Math.random().toString(36).substring(2, 15);
      Cookies.set("guest_id", guestId, { expires: 7 });
    }

    // 2. Build Headers
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (guestId) headers["x-guest-id"] = guestId;

    // 3. Request
    const res = await fetch("/api/cart/add", {
      method: "POST",
      headers,
      body: JSON.stringify({
        product_id: product.id,
        variant_id: variantId,
        price: product.price,
        quantity: qty,
        mrp: product.mrp
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to update cart");
    }

    await refreshCart();

    if (sourceEl && image) {
      import("./FlyToCart").then((m) => m.flyToCartFrom(sourceEl, image));
    }

    return true;
  }

  return { addProduct };
}