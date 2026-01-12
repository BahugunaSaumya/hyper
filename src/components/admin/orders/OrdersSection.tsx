"use client";

import { useOrders } from "@/hooks/useOrders";
import OrdersTable from "./OrdersTable";
import OrderFilters from "./OrderFilters";
import OrderCsvActions from "./OrderCsvActions";

export default function OrdersSection({ orders }: { orders: any[] }) {
  const { status, setStatus, filteredOrders } = useOrders(orders);

  return (
    <section>
      <div className="flex justify-between mb-3">
        <OrderFilters value={status} onChange={setStatus} />
        <OrderCsvActions orders={filteredOrders} />
      </div>
      <OrdersTable orders={filteredOrders} />
    </section>
  );
}
