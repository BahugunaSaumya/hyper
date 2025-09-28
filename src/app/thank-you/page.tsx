// src/app/thank-you/page.tsx
"use client";

import { Suspense } from "react";
import Header from "@/components/Header";
import ThankYouContent from "@/components//ThankYouContent";
import LoadingScreen from "@/components/LoadingScreen";

export default function ThankYouPage() {
  return (
    <>
      <Header />
      <main className="offset-header">
        <Suspense fallback={<LoadingScreen />}>
          <ThankYouContent />
        </Suspense>
      </main>
    </>
  );
}
