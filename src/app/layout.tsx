// src/app/layout.tsx
import "./globals.css";
import localFont from "next/font/local";
import { Palanquin } from "next/font/google";
import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import Header from "@/components/Header";
import { CartProvider } from "@/context/CartContext";
import ClientWrapper from "@/components/ClientWrapper";

const palanquin = Palanquin({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  weight: "100"
});

const monument = localFont({
  variable: "--font-title",
  display: "swap",
  src: [
    {
      path: "../../public/fonts/monument-extended/MonumentExtended-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/monument-extended/MonumentExtended-Ultrabold.otf",
      weight: "700",
      style: "normal",
    },
  ],
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${palanquin.variable} ${monument.variable}`} suppressHydrationWarning>
      <body className="zoom-90" suppressHydrationWarning>
        <AuthProvider>
          <CartProvider>
            <Header />
            <ClientWrapper>
              <main className="offset-header">
                <div className="page-shell">{children}</div>
              </main>
            </ClientWrapper>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
