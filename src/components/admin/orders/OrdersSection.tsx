"use client";

import { useOrders } from "@/hooks/useOrders";
import OrdersTable from "./OrdersTable";
import OrderFilters from "./OrderFilters";
import OrderCsvActions from "./OrderCsvActions";

export default function OrdersSection({ orders }: { orders: any[] }) {
  const { status, setStatus, dateRange, handleDateChange, filteredOrders } = useOrders(orders);

  return (
    <section>
      <div className="flex justify-between mb-3">
        <OrderFilters status={status} setStatus={setStatus} dateRange={dateRange} handleDateChange={handleDateChange} />
        <OrderCsvActions orders={filteredOrders} />
      </div>
      <OrdersTable orders={filteredOrders} />
    </section>
  );
}
