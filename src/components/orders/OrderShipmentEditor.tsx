"use client";

import { useState } from "react";
import { getAuth } from "firebase/auth";

export default function OrderShipmentEditor({
  orderId,
  selectedItems,
  status
}: { orderId: string; selectedItems: { itemId: string; qty: number }[]; status: string }) {

  const [courier, setCourier] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [loading, setLoading] = useState(false);

  const hasItems = selectedItems && selectedItems.length > 0;

  async function submit() {
    if (!hasItems) return;

    setLoading(true);
    const user = getAuth().currentUser;
    if (!user) {
      alert("Not authenticated");
      return;
    }

    const token = await user.getIdToken(true);
    await fetch(`/api/admin/orders/${orderId}/shipment`, {
      method: "POST",
      headers: { "Content-Type": "application/json",authorization: `Bearer ${token}`, },
      body: JSON.stringify({
        courier,
        trackingId,
        items: selectedItems
      })
    });
    location.reload();
  }

  return (
    <div className="border rounded-xl p-4 mt-4 bg-gray-50">
      <h3 className="font-semibold mb-3">Create Shipment</h3>

      <input
        placeholder="Courier Partner"
        className="w-full border px-3 py-2 rounded mb-2"
        value={courier}
        onChange={e => setCourier(e.target.value)}
      />

      <input
        placeholder="Tracking ID"
        className="w-full border px-3 py-2 rounded mb-3"
        value={trackingId}
        onChange={e => setTrackingId(e.target.value)}
      />

      <button
        disabled={!hasItems || loading}
        onClick={submit}
        className={`px-4 py-2 rounded text-white ${
          hasItems
            ? "bg-black hover:bg-gray-900"
            : "bg-gray-400 cursor-not-allowed"
        }`}
      >
        {hasItems ? "Mark Selected Items Shipped" : "Select items to ship"}
      </button>
    </div>
  );
}

