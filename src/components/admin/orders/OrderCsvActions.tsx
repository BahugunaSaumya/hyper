import { downloadOrdersCsv, downloadOrderItemsCsv } from "./orderCsv";

export default function OrderCsvActions({ orders }: { orders: any[] }) {
  return (
    <div className="flex gap-2">
      <button onClick={() => downloadOrdersCsv(orders)} className="btn text-xs px-3 py-1 rounded border hover:bg-black hover:text-white transition">
        Orders CSV
      </button>
      <button onClick={() => downloadOrderItemsCsv(orders)} className="btn text-xs px-3 py-1 rounded border hover:bg-black hover:text-white transition">
        Order Items CSV
      </button>
    </div>
  );
}
