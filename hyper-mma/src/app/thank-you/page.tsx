// src/app/thank-you/page.tsx
"use client";
import Header from "@/components/Header";
import { useSearchParams } from "next/navigation";

export default function ThankYou() {
  const qs = useSearchParams();
  const paymentId = qs.get("payment_id") || "";
  const orderRef = qs.get("order") || ""; // keep compatibility if you pass ?order=

  const hasRef = Boolean(paymentId || orderRef);

  return (
    <>
      <Header />
      <main className="offset-header">
        <section className="max-w-3xl mx-auto px-6 py-16 text-center">
          <img
            src="/assets/thank-you.png"
            alt="Thank you"
            className="mx-auto mb-6 h-16 md:h-20 object-contain"
          />
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Thank you for your order!</h1>

          {!hasRef ? (
            <p className="text-gray-600">
              We’ve received your order. You’ll get a confirmation email shortly.
            </p>
          ) : (
            <div className="mt-2">
              <p className="text-gray-600">Reference:</p>
              <p className="mt-1 font-mono text-xl">
                {paymentId || orderRef}
              </p>
            </div>
          )}

          <a
            href="/"
            className="mt-10 inline-block px-6 py-3 rounded-full border hover:bg-black hover:text-white"
          >
            Continue shopping
          </a>
        </section>
      </main>
    </>
  );
}
