import { ORDER_STATUSES } from "@/hooks/useOrders";

export default function OrderFilters({ value, onChange }: any) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="border px-2 py-1 rounded text-sm"
    >
      <option value="all">All</option>
      {ORDER_STATUSES.map(s => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
