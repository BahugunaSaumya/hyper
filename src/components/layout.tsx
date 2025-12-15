import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

import { CartProvider } from "@/context/CartContext";

export const metadata: Metadata = { title: "HYPER", description: "MMA Apparel" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.cdnfonts.com/css/palanquin" rel="stylesheet" />
        <link href="https://fonts.cdnfonts.com/css/palanquin-dark" rel="stylesheet" />
        {/* Google tag (gtag.js) */}
        <script async src={`https://www.googletagmanager.com/gtag/js?${process.env.NEXT_PUBLIC_GA_ID}`}></script>
        <script>
          {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
              page_path: window.location.pathname,
            });
          `}
        </script>
      </head>
      
      <body className="overflow-x-hidden bg-white text-black">
        <CartProvider>
        {children}

        {/* Vendor first */}
        <Script src="https://cdn.jsdelivr.net/npm/crypto-js@4.2.0/crypto-js.min.js" strategy="beforeInteractive" />

        {/* Your legacy modules
        <Script src="/auth.js" type="module" strategy="afterInteractive" />
        <Script src="/main.js" strategy="afterInteractive" /> */}

        {/* 🔑 Bootstrap the SPA even if DOMContentLoaded already fired */}
        <Script id="spa-boot" strategy="afterInteractive">
          {`
            (function boot(){
              function go(){
                if (window.navigate) {
                  try { window.navigate(location.pathname + location.search, { push: false }); }
                  catch(e){ console.error('[boot] navigate failed', e); }
                } else {
                  console.warn('[boot] window.navigate missing (main.js not loaded yet)');
                }
              }
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', go, { once: true });
              } else {
                go();
              }
            })();
          `}
        </Script>
        </CartProvider>
      </body>
    </html>
  );
}
