"use client";

import KPICard from "./KPICard";
import type { KPI } from "@/types/admin";

type Props = {
  kpi: KPI | null;
  range: string;
  setRange: (val: string) => void;
};

export default function OverviewSection({ kpi, range, setRange}: Props) {
  if (!kpi) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-neutral-800">Dashboard Overview</h2>
          <select 
            value={range} 
            onChange={(e) => setRange(e.target.value)}
            className="bg-white border border-neutral-300 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-black"
          >
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
        </div>
        <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KPICard label="Orders" value="—" />
          <KPICard label="Revenue" value="—" />
          <KPICard label="Users" value="—" />
        </section>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-neutral-800">Dashboard Overview</h2>
        <select 
          value={range} 
          onChange={(e) => setRange(e.target.value)}
          className="bg-white border border-neutral-300 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-black"
        >
          <option value="today">Today</option>
          <option value="week">Last 7 Days</option>
          <option value="month">Last 30 Days</option>
        </select>
      </div>
      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KPICard label="Orders" value={kpi.ordersCount} />
        <KPICard
          label="Revenue"
          value={`₹ ${kpi.revenue.toLocaleString("en-IN")}`}
        />
        <KPICard label="Users" value={kpi.usersCount} />
      </section>
    </>
  );
}
