// src/app/providers.tsx
"use client";

import { CartProvider } from "@/context/CartContext";
// If you also use AuthProvider etc, import and wrap here too.

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      {children}
    </CartProvider>
  );
}
