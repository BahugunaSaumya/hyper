import Link from "next/link";
import { Th, Td } from "@/components/ui/Table";
import { formatIST } from "@/lib/time";

export default function OrdersTable({ orders }: any) {
  return (
    <table className="min-w-full text-sm rounded border">
      <thead>
        <tr>
          <Th>Order ID</Th>
          <Th>Customer</Th>
          <Th>Email</Th>
          <Th>Base</Th>
          <Th>Tax</Th>
          <Th>Subtotal</Th>
          <Th>Shipping</Th>
          <Th>Total</Th>
          <Th>Status</Th>
          <Th>Placed</Th>
          <Th>Item Details</Th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o: any) => (
          <tr key={o.id}>
            <Td>
              <Link href={`/admin/orders/${o.id}`} className="underline">{o.id}</Link>
            </Td>
            <Td>{o.customer?.name}</Td>
            <Td>{o.customer?.email}</Td>
            <Td>₹ {o?.totals?.base || 0}</Td>
            <Td>₹ {o?.totals?.tax || 0}</Td>
            <Td>₹ {o?.totals?.subtotal || 0}</Td>
            <Td>₹ {o?.totals?.shipping || 0}</Td>
            <Td>₹ {o?.totals?.total || 0}</Td>
            <Td>{o.status || "—"}</Td>
            <Td>{formatIST(o.createdAt)}</Td>
            <Td>
              <Link href={`/admin/orders/${o.id}`} className="text-xs px-3 py-1 rounded-full border hover:bg-black hover:text-white transition">
                View
              </Link>
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
