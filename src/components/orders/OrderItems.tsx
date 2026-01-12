"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const formatINR = (n?: number) => "₹ " + Number(n || 0).toLocaleString("en-IN");

type Props = {
  items: any[];
  shipments?: any[]; // Added shipments prop
  admin?: boolean;
  selectedItems?: { itemId: string; qty: number }[];
  onSelectionChange?: (items: { itemId: string; qty: number }[]) => void;
  orderComplete:boolean
};

export default function OrderItems({
  items = [],
  shipments = [],
  admin = false,
  selectedItems = [],
  onSelectionChange,
  orderComplete=false
}: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const shippedItemIds = new Set(
    shipments?.flatMap((s: any) => s.items?.map((i: any) => i.itemId)) || []
  );

  useEffect(() => {
    const sel: Record<string, boolean> = {};
    selectedItems.forEach(i => (sel[i.itemId] = true));
    setSelected(sel);
  }, [selectedItems]);

  function toggle(itemId: string, qty: number) {
    if (shippedItemIds.has(itemId)) return;

    const isSelected = selected[itemId];
    const newSelected = { ...selected, [itemId]: !isSelected };
    
    setSelected(newSelected);
    if (onSelectionChange) {
      const updated = items
        .filter(item => {
           return item.id === itemId ? !isSelected : !!newSelected[item.id];
        })
        .map(item => ({ itemId: item.id, qty: item.qty }));
      onSelectionChange(updated);
    }
  }

  return (
    <div className="border rounded-xl overflow-x-auto">
      <div className="px-4 py-3 font-semibold">Items</div>
      <table className="min-w-full text-sm">
        <tbody className="divide-y">
          {items.map(it => {
            const isChecked = !!selected[it.id];
            const isShipped = shippedItemIds.has(it.id);

            return (
              <tr key={it.id} className={`hover:bg-gray-50 ${isShipped ? 'bg-gray-50 opacity-80' : ''}`}>
                {admin && (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isShipped} // Disable if shipped
                      onChange={() => toggle(it.id, it.qty)}
                      className="h-4 w-4 accent-black disabled:cursor-not-allowed"
                    />
                  </td>
                )}
                <td className="px-3 py-2 cursor-pointer" onClick={() => it.slug && router.push(`/product/${it.slug}`)}>
                  <img src={it.slug ? `/assets/models/products/${it.slug}/1.avif` : ""} className="max-h-[100px]" alt="" />
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{it.title}</div>
                  <div>Qty : {it.qty}</div>
                  <div>Unit : {formatINR(it.unitPrice)}</div>
                  <div>Total : {formatINR(it.totalAmount)}</div>
                  
                  {/* Status Indicator */}
                  {isShipped && !orderComplete && (
                    <div className="font-bold text-pink-600">
                      Item shipped already
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}