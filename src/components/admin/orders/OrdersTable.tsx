import Link from "next/link";
import { Th, Td } from "@/components/ui/Table";

export default function OrdersTable({ orders }: any) {
  return (
    <table className="min-w-full text-sm rounded border">
      <thead>
        <tr>
          <Th>Order ID</Th>
          <Th>Customer</Th>
          <Th>Email</Th>
          <Th>Subtotal</Th>
          <Th>Tax</Th>
          <Th>Discount</Th>
          <Th>Shipping</Th>
          <Th>Total</Th>
          <Th>Status</Th>
          <Th>Payment Status</Th>
          <Th>Placed</Th>
          <Th>Coupon Code</Th>
          <Th>Item Details</Th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o: any) => (
          <tr key={o.order_id}>
            <Td>
              <Link href={`/admin/orders/${o.order_id}`} className="underline">{o.order_number}</Link>
            </Td>
            <Td>{o.first_name} {o.last_name}</Td>
            <Td>{o.registered_email ? `${o.registered_email} (registered user)` : o.order_email} </Td>
            <Td>₹ {o?.subtotal || 0}</Td>
            <Td>₹ {o?.tax || 0}</Td>
            <Td>₹ {o?.discount || 0}</Td>
            <Td>₹ {o?.shipping_charges || 0}</Td>
            <Td>₹ {o?.total || 0}</Td>
            <Td>{o.order_status || "—"}</Td>
            <Td>{o.payment_status || "—"}</Td>
            <Td>{new Date(o.created_at).toLocaleDateString()}</Td>
            <Td>{o.coupon_code || "—"}</Td>
            <Td>
              <Link href={`/admin/orders/${o.order_id}`} className="text-xs px-3 py-1 rounded-full border hover:bg-black hover:text-white transition">
                View
              </Link>
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
