"use client";

import { useEffect, useState, useMemo } from "react";
import { Product } from "@/types/product";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_EMAILS, ADMIN_UIDS } from "@/config/admin";

type ProductsResponse = {
  products: Product[];
  headers: string[];
};

async function safeJson<T = any>(res: Response): Promise<T | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function valueToCell(v: unknown) {
  if (v == null) return "";
  if (Array.isArray(v) || typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export function useProducts(enabled: boolean) {
  const { user } = useAuth() as any;

  const [products, setProducts] = useState<Product[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowed = useMemo(() => {
    if (!user) return false;
    const email = user.email || "";
    return ADMIN_EMAILS.includes(email) || ADMIN_UIDS.includes(user.uid);
  }, [user]);

  useEffect(() => {
    if (!enabled) return;

    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user || !allowed) return;

        const token = await user.getIdToken(true);
        if (!mounted) return;

        const res = await fetch("/api/admin/products", {
          headers: { authorization: `Bearer ${token}` },
        });

        const data = await safeJson<ProductsResponse>(res);

        if (!mounted) return;

        if (!res.ok || !data) {
          setError("Failed to load products");
          return;
        }

        const list = data.products.map((p) => ({ id: p.id, ...p }));

        // Build headers (union of keys)
        const headerSet = new Set<string>(["id"]);
        data.headers?.forEach((h) => headerSet.add(h));
        list.forEach((p) => Object.keys(p).forEach((k) => headerSet.add(k)));

        const finalHeaders = Array.from(headerSet);

        const csvRows = list.map((p) =>
          finalHeaders.map((h) =>
            h === "id" ? String(p.id) : valueToCell((p as any)[h])
          )
        );

        setProducts(list);
        setHeaders(finalHeaders);
        setRows(csvRows);
      } catch (e: any) {
        if (mounted) setError(e.message || "Failed to load products");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [enabled, user, allowed]);

  return {
    products, // ✅ Product[]
    headers,  // ✅ string[]
    rows,     // ✅ CSV rows
    loading,
    error,
  };
}
