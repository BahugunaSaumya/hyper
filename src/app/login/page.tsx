// src/app/login/page.tsx
"use client";

import { Suspense } from "react";
import LoginPage from "@/components/LoginPage";

// This tells Next.js not to pre-render this page (dynamic at runtime)
export const dynamic = "force-dynamic";
// ❌ DO NOT set revalidate here — it's a client component

export default function LoginBoundary() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] grid place-items-center text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <LoginPage />
    </Suspense>
  );
}
