import { ORDER_STATUSES } from "@/hooks/useOrders";

export default function OrderFilters({ 
  status, setStatus, dateRange, handleDateChange 
}: any) {
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <select
        value={status}
        onChange={e => setStatus(e.target.value)}
        className="border px-2 py-1 rounded text-sm bg-white"
      >
        <option value="all">All Statuses</option>
        {ORDER_STATUSES.map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <div className="flex items-center gap-2 text-sm bg-gray-50 p-1 rounded border">
        <label className="text-gray-500 pl-1">From:</label>
        <input 
          type="date" 
          max={today}
          value={dateRange.start}
          onChange={(e) => handleDateChange('start', e.target.value)}
          className="bg-transparent outline-none cursor-pointer"
        />
        <span className="text-gray-400">|</span>
        <label className="text-gray-500">To:</label>
        <input 
          type="date" 
          max={today}
          value={dateRange.end}
          onChange={(e) => handleDateChange('end', e.target.value)}
          className="bg-transparent outline-none cursor-pointer"
        />
      </div>
    </div>
  );
}