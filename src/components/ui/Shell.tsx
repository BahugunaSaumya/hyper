"use client";

import React from "react";

export function Page({ className = "", children }: React.PropsWithChildren<{ className?: string }>) {
  return <div className={`page ${className}`}>{children}</div>;
}

export function Section({ className = "", children }: React.PropsWithChildren<{ className?: string }>) {
  return <section className={`section ${className}`}>{children}</section>;
}
