"use client";

import { Suspense } from "react";
import AdminDashboard from "@/components/AdminDashboard";
import { PageLoaderOverlay } from "@/components/LoadingScreen";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] grid place-items-center text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <AdminDashboard />
    </Suspense>
  );
}
