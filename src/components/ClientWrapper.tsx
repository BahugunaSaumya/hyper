"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;
    if (pathname === "/") {
      body.classList.add("home");
    } else {
      body.classList.remove("home");
    }
  }, [pathname]);

  return <>{children}</>;
}
