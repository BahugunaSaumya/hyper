// src/app/thank-you/page.tsx
"use client";

import { Suspense } from "react";
import Header from "@/components/Header";
import ThankYouContent from "@/components//ThankYouContent";

export default function ThankYouPage() {
  return (
    <>
      <Header />
      <main className="offset-header">
        <Suspense fallback={<div className="text-center py-16">Loading...</div>}>
          <ThankYouContent />
        </Suspense>
      </main>
    </>
  );
}
