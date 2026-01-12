"use client";

import KPICard from "./KPICard";
import type { KPI } from "@/types/admin";

type Props = {
  kpi: KPI | null;
};

export default function OverviewSection({ kpi }: Props) {
  if (!kpi) {
    return (
      <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KPICard label="Orders" value="—" />
        <KPICard label="Revenue" value="—" />
        <KPICard label="Users" value="—" />
      </section>
    );
  }

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 gap-4">
      <KPICard label="Orders" value={kpi.ordersCount} />
      <KPICard
        label="Revenue"
        value={`₹ ${kpi.revenue.toLocaleString("en-IN")}`}
      />
      <KPICard label="Users" value={kpi.usersCount} />
    </section>
  );
}
