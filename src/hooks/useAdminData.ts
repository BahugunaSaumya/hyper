"use client";

import { useEffect, useState } from "react";
import { KPI } from "@/types/admin";

async function safeJson<T>(res: Response): Promise<T | null> {
  try { return await res.json(); } catch { return null; }
}

export function useAdminData(user: any, allowed: boolean) {
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState("");
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        if (!user || !allowed) return;
        const t = await user.getIdToken(true);
        if (!mounted) return;

        setToken(t);

        const [s, o] = await Promise.all([
          fetch("/api/admin/summary", { headers: { authorization: `Bearer ${t}` } }),
          fetch("/api/admin/orders?limit=50", { headers: { authorization: `Bearer ${t}` } }),
        ]);

        const sj = await safeJson<KPI>(s);
        const oj = await safeJson<any>(o);

        if (s.ok) setKpi(sj);
        if (o.ok) setOrders(oj?.orders || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [user, allowed]);

  return { loading, token, kpi, orders, error };
}
