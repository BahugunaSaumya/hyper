// src/app/login/page.tsx
"use client";

import { Suspense } from "react";
import LoginPage from "@/components/LoginPage";
import LoadingScreen from "@/components/LoadingScreen";

// This tells Next.js not to pre-render this page (dynamic at runtime)
export const dynamic = "force-dynamic";
// ❌ DO NOT set revalidate here — it's a client component

export default function LoginBoundary() {
  return (
    <Suspense
      fallback={
        <LoadingScreen />
      }
    >
      <LoginPage />
    </Suspense>
  );
}
