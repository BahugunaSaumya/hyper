import OrderDetailsView from "@/components/orders/OrderDetailsView";
import { getDb } from "@/lib/firebaseAdmin";
import { serializeTimeStamp } from "@/lib/serialize";
import { notFound } from "next/navigation";

interface PageProps {
  params: { id: string } | Promise<{ id: string }>;
}

export default async function AdminOrderPage({ params }: PageProps) {
  const resolvedParams = await params; // unwrap the promise
  const orderId = decodeURIComponent(resolvedParams.id);

  const db = getDb();
  const snap = await db.collection("orders").doc(orderId).get();

  if (!snap.exists) {
    notFound();
  }

  const order = serializeTimeStamp({
    id: snap.id,
    ...snap.data(),
  });

  return (
    <OrderDetailsView order={order} back={{ href: "/admin", label: "Back to Admin" }}/>
  );
}
