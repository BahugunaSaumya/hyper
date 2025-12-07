"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: string;
  name: string;
  slug: string;
  size: string;
  price: string;   // keep the "₹..." string like legacy
  image: string;
  quantity: number;
  newLaunch: boolean;
};

type CartMap = Record<string, CartItem>;

type CartCtx = {
  items: CartMap;
  list: CartItem[];
  add: (item: Omit<CartItem, "quantity"> & { quantity?: number }) => void;
  increase: (id: string) => void;
  decrease: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  totalItems: number;
  isLoaded: boolean;
};

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartMap>({});
  const [isLoaded, setIsLoaded] = useState(false);

  // hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("cart");
      if (raw) setItems(JSON.parse(raw));
    } catch {}
    finally{
      setIsLoaded(true);
    }
  }, []);

  // persist
  useEffect(() => {
    if (isLoaded) { 
      try {
        localStorage.setItem("cart", JSON.stringify(items));
      } catch {}
    }
  }, [items, isLoaded]);

  const add: CartCtx["add"] = (it) => {
    setItems((prev) => {
      const id = it.id;
      const existing = prev[id];
      const qty = existing?.quantity || 0;
      return {
        ...prev,
        [id]: {
          id,
          name: it.name,
          slug: it.slug,
          size: it.size || "M",
          price: it.price,
          image: it.image,
          quantity: qty + (it.quantity ?? 1),
          newLaunch: existing?.newLaunch ?? it.newLaunch ?? false,
        },
      };
    });
  };

  const increase = (id: string) =>
    setItems((prev) =>
      prev[id]
        ? { ...prev, [id]: { ...prev[id], quantity: (prev[id].quantity || 1) + 1 } }
        : prev
    );

  const decrease = (id: string) =>
    setItems((prev) => {
      if (!prev[id]) return prev;
      const next = (prev[id].quantity || 1) - 1;
      if (next <= 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: { ...prev[id], quantity: next } };
    });

  const remove = (id: string) =>
    setItems((prev) => {
      if (!prev[id]) return prev;
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });

  const clear = () => setItems({});

  const list = useMemo(() => Object.values(items || {}), [items]);
  const totalItems = useMemo(
    () => list.reduce((sum, it) => sum + (it.quantity || 0), 0),
    [list]
  );

  return (
    <Ctx.Provider value={{ items, list, add, increase, decrease, remove, clear, totalItems, isLoaded }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
