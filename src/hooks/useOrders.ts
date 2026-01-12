import { useMemo, useState } from "react";

export const ORDER_STATUSES = [
  "created",
  "paid",
  "confirmed",
  "partially_shipped",
  "shipped",
  "complete",
] as const;

export function useOrders(orders: any[]) {
  const [status, setStatus] = useState("all");

  const filteredOrders = useMemo(() => {
    if (status === "all") return orders;
    return orders.filter(o => o.status === status);
  }, [orders, status]);

  return { status, setStatus, filteredOrders };
}
