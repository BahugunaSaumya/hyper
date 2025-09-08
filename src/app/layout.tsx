// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/Header";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "HYPER MMA",
  description: "Hyper MMA store",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthProvider>
        <CartProvider>
          <Header />
          <main className="offset-header">
           <div className="page-shell">{children}</div>
           </main>
        </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
