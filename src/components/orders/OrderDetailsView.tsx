"use client";

import { useState, useEffect } from "react";
import OrderItems from "./OrderItems";
import OrderSummary from "./OrderSummary";
import OrderPayment from "./OrderPayment";
import OrderShippingAddress from "./OrderShippingAddress";
import { formatIST } from "@/lib/time";
import Link from "next/link";
import OrderShipmentEditor from "./OrderShipmentEditor";
import OrderComplete from "./OrderComplete";

type OrderDetailsViewProps = {
  order: any;
  back?: { href: string; label: string };
};

type SelectedItem = {
  itemId: string;
  qty: number;
};

export default function OrderDetailsView({ order, back }: OrderDetailsViewProps) {
  const isAdminView = back?.href == "/admin";
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const canEditShipment =
  isAdminView &&
  selectedItems?.length > 0 &&
  !["shipped", "complete"].includes(order.status) &&
  ["paid", "confirmed", "partially_shipped"].includes(order.status);

  useEffect(() => {
    if (order?.items?.length) {
      // Get a flat list of all item IDs that are already in shipments
      const shippedItemIds = order.shipments?.flatMap((s: any) => 
        s.items?.map((i: any) => i.itemId)
      ) || [];

      // Only auto-select items that are NOT in the shipped list
      const remainingItems = order.items
        .filter((item: any) => !shippedItemIds.includes(item.id))
        .map((item: any) => ({
          itemId: item.id,
          qty: item.qty
        }));

      setSelectedItems(remainingItems);
    }
  }, [order.items, order.shipments]);

  return (
    <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-6 py-10 px-2">
      <div className="flex items-center justify-between mb-6 md:col-span-3">
        <h1 className="text-2xl sm:text-3xl font-bold">Order Details</h1>
        {back && (
          <Link href={back.href} className="text-sm underline">
            {back.label}
          </Link>
        )}
      </div>
      <section className="md:col-span-2 space-y-4">
        <div className="border rounded-xl p-4 text-sm">
          <div>Order ID : {order.order_number}</div>
          <div>Status : <b>{order.order_status}</b></div>
          <div>
            Date :{" "}
            {new Date(order.created_at).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
          {order.shipment?.trackingId && (
            <div>Tracking : {order.shipment.trackingId}</div>
          )}
        </div>

        <OrderItems items={order.items} shipments={order.shipments} admin={isAdminView} selectedItems={selectedItems} onSelectionChange={setSelectedItems} orderComplete={order.status=='complete'} />
      </section>
      {canEditShipment && ( <OrderShipmentEditor orderId={order.id} selectedItems={selectedItems} status={order.status}/>)}

      {isAdminView && order.status === "shipped" && (
          <OrderComplete orderId={order.id}/>
      )}

      <OrderShippingAddress order={order} />

      <section className="md:col-span-2 space-y-4">
        <OrderSummary totals={order.totals} />
        <OrderPayment payment={order.payment} />
      </section>
    </div>
  );
}
