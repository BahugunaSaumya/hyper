"use client";

import { useState } from "react";
import { getAuth } from "firebase/auth";

type Props = {
  orderId: string;
};

export default function OrderComplete({ orderId }: Props) {
  const [completing, setCompleting] = useState(false);

  async function completeOrder() {
    if (completing) return;

    setCompleting(true);
    const user = getAuth().currentUser;
    if (!user) {
        alert("Not authenticated");
        return;
    }
    try {
      const token = await user.getIdToken(true);
      const res = await fetch(`/api/admin/orders/${orderId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${token}`,},
      });

      if (!res.ok) {
        throw new Error("Failed to complete order");
      }

      location.reload();
    } catch (e) {
      console.error(e);
      alert("Failed to complete order");
    } finally {
      setCompleting(false);
    }
  }

  return (
    <div className="border rounded-xl p-4 bg-green-50 text-sm">
      <div className="font-semibold mb-2">Mark Delivered</div>
      <button
        onClick={completeOrder}
        disabled={completing}
        className="px-4 py-2 rounded text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
      >
        {completing ? "Completing..." : "Mark Order Complete"}
      </button>
    </div>
  );
}
