// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Header from "@/components/Header";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import "plyr-react/plyr.css";
import ClientWrapper from "@/components/ClientWrapper";

export const metadata: Metadata = {
  title: "HYPER MMA",
  description: "Hyper MMA store",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
