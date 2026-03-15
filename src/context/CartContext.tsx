"use client";
import { CartItem, AddToCartInput } from "@/lib/cart";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type CartMap = Record<string, CartItem>;

type CartCtx = {
  items: CartMap;
  list: CartItem[];
  add: (item: AddToCartInput) => Promise<void>;
  increase: (cartItemId: number) => Promise<any>;
  decrease: (cartItemId: number) => Promise<any>;
  remove: (cartItemId: number) => Promise<any>;
  hydrateFromApi: (rows: any[]) => void;
  refreshCart: () => Promise<any>;
  totalItems: number;
  isLoaded: boolean;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartMap>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("cart");
    if (raw) setItems(JSON.parse(raw));
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) localStorage.setItem("cart", JSON.stringify(items));
  }, [items, isLoaded]);

  // ADD: Uses product_id + variant_id as temporary key
  const add = async (item: AddToCartInput) => {
    setItems((prev): CartMap => { 
      const key = `temp_${item.id}_${item.size}`;
      const existing = prev[key];
      const newItem: CartItem = {
        id: existing?.id || 0,
        productId: item.id,
        size: item.sizeLabel, 
        name: item.name,
        slug: item.slug,
        mrp: item.mrp,
        price: item.price,
        quantity: (existing?.quantity || 0) + item.quantity,
        newLaunch: item.newLaunch,
      };

      return {
        ...prev,
        [key]: newItem,
      };
    });
    await refreshCart();
  };

  const increase = async (cartItemId: number) => {
    const key = String(cartItemId);
    setItems(prev => prev[key] ? {
      ...prev,
      [key]: { ...prev[key], quantity: prev[key].quantity + 1 }
    } : prev);

    try {
      await fetch("/api/cart/item/update", {
        method: "PATCH",
        body: JSON.stringify({ cartItemId, action: "inc" }),
      });
      return await refreshCart();
    } catch (err) {
      return await refreshCart();
    }
  };

  const decrease = async (cartItemId: number) => {
    const key = String(cartItemId);
    if (!items[key] || items[key].quantity <= 1) return;
    setItems(prev => ({
      ...prev,
      [key]: { ...prev[key], quantity: prev[key].quantity - 1 }
    }));
    try {
      await fetch("/api/cart/item/update", {
        method: "PATCH",
        body: JSON.stringify({ cartItemId, action: "dec" }),
      }); 
      return await refreshCart();
    } catch {
      return await refreshCart();
    }
  };

  const remove = async (cartItemId: number) => {
    const key = String(cartItemId);
    setItems(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
    try {
      await fetch("/api/cart/item/delete", {
        method: "DELETE",
        body: JSON.stringify({ cartItemId }),
      }); 
      return await refreshCart();
    } catch {
      return await refreshCart();
    }
  };

  const hydrateFromApi = (rows: any[]) => {
    const map: CartMap = {};
    rows.forEach((row) => {
      map[String(row.id)] = {
        id: Number(row.id),
        productId: Number(row.productId),
        size: row.size,
        name: row.name,
        slug: row.slug,
        mrp: Number(row.mrp),
        price: Number(row.price),
        quantity: Number(row.quantity),
        newLaunch: Boolean(row.newLaunch),
      };
    });
    setItems(map);
  };

  const refreshCart = async () => {
    try {
      const res = await fetch("/api/cart");
      const data = await res.json();

      if (data?.items) {
        hydrateFromApi(data.items);
      }

      return data;
    } catch (err) {
      console.error("Cart refresh failed", err);
      return null;
    }
  };

  const list = useMemo(() => Object.values(items), [items]);
  const totalItems = useMemo(() => list.reduce((s, i) => s + i.quantity, 0), [list]);

  return (
    <Ctx.Provider value={{ items, list, add, increase, decrease, remove, hydrateFromApi, refreshCart, totalItems, isLoaded }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart context missing");
  return c;
};