import { getDb } from "@/lib/firebaseAdmin";
import OrderDetailsView from "@/components/orders/OrderDetailsView";
import { serializeTimeStamp } from "@/lib/serialize";

type PageProps = {
  params: { id: string } | Promise<{ id: string }>;
};

export default async function OrderPage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  // Fetch order server-side
  const db = getDb();
  const snap = await db.collection("orders").doc(id).get();
  const order = serializeTimeStamp({
      id: snap.id,
      ...snap.data(),
    });

  return <OrderDetailsView order={order} back={{ href: "/dashboard", label: "Back to Dashboard" }} />;
}
