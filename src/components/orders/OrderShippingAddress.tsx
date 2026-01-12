import { formatIST } from "@/lib/time";

export default function OrderShippingAddress({ order }: any) {
  const s = order.shippingAddress || {};
  const c = order.customer || {};
  const shipments = order.shipments || [];

  return (
    <div className="border rounded-xl p-4">
      <div className="font-title mb-2">Shipping Address</div>
      <div className="text-sm">
        <div>{c.name}</div>
        <div>{s.addr1}</div>
        {s.addr2 && <div>{s.addr2}</div>}
        <div>{[s.city, s.postal].filter(Boolean).join(" ")}</div>
        <div>{[s.state, s.country].filter(Boolean).join(", ")}</div>
        <div>{c.phone}</div>
        {/* Shipments */}
        {shipments.length > 0 && (
          <div>
            <div className="font-title mb-2 mt-5">Shipments</div>

            <div className="space-y-3 text-sm">
              {shipments.map((sh: any, idx: number) => (
                <div
                  key={idx}
                  className="border rounded-lg p-3 bg-gray-50"
                >
                  <div>
                    <b>Courier:</b> {sh.courier}
                  </div>

                  <div>
                    <b>Tracking ID:</b> {sh.trackingId}
                  </div>

                  <div>
                    <b>Shipped At:</b>{" "}
                    {sh.shippedAt ? formatIST(sh.shippedAt) : "—"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
