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
  
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const handleDateChange = (type: 'start' | 'end', value: string) => {
    const newRange = { ...dateRange, [type]: value };
    const startDate = new Date(newRange.start);
    const endDate = new Date(newRange.end);
    if (startDate > endDate) {
      alert("Start date cannot be after the end date.");
      return;
    }
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 183) {
      alert("Maximum date range allowed is 6 months.");
      return;
    }

    setDateRange(newRange);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesStatus = status === "all" || o.order_status === status;
      const orderDate = new Date(o.created_at);
      if (isNaN(orderDate.getTime())) return matchesStatus;

      const start = new Date(dateRange.start);
      start.setHours(0, 0, 0, 0);
      
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      end.setHours(23, 59, 59);

      return matchesStatus && orderDate >= start && orderDate <= end;
    });
  }, [orders, status, dateRange]);

  return { status, setStatus, dateRange, handleDateChange, filteredOrders };
}