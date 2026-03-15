import { formatIST } from "@/lib/time";

export default function OrderShippingAddress({ order }: any) {

  return (
    <div className="border rounded-xl p-4">
      <div className="font-title mb-2">Shipping Address</div>
      <div className="text-sm">
        <div>{order.first_name} {order.last_name}</div>
        <div>{order.address1}</div>
        {order.address2 && <div>{order.address2}</div>}
        <div>{order.city}, {order.pincode}</div>
        <div>{order.state}, {order.country}</div>
        <div>{order.mobile}</div>
        {/* Shipments */}
        {order?.shipments?.length > 0 && (
          <div>
            <div className="font-title mb-2 mt-5">Shipments</div>

            <div className="space-y-3 text-sm">
              {order?.shipments.map((sh: any, idx: number) => (
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
