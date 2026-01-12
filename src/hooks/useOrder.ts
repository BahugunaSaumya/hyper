"use client";
import { useEffect, useState } from "react";

export function useOrder(orderId: string, admin = false) {
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          admin ? `/api/admin/orders/${orderId}` : `/api/orders/${orderId}`
        );
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setOrder(json.order);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, admin]);

  return { order, loading, error };
}
