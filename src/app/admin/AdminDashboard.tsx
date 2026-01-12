"use client";

import { useState } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminData } from "@/hooks/useAdminData";
import { useProducts } from "@/hooks/useProducts";
import OrdersSection from "@/components/admin/orders/OrdersSection";
import OverviewSection from "@/components/admin/overview/OverviewSection";
import ProductsSection from "@/components/admin/products/ProductsSection";
import AdminTabs from "./AdminTabs";
import { AdminTab } from "@/types/admin";
import UsersSection from "@/components/admin/users/UsersSection";
import { useUsers } from "@/hooks/useUsers";

export default function AdminDashboard() {
  const { user, allowed, isSuper } = useAdminAuth();
  const { loading, kpi, orders } = useAdminData(user, allowed);

  const [tab, setTab] = useState<AdminTab>("overview");

  // 👇 fetch ONLY when products tab is active
  const {
    products,
    headers,
    rows,
    loading: productsLoading,
    error,
  } = useProducts(tab === "products");

  const { users, selectedUser, openUser } = useUsers(tab === "users");
  
  if (!user || !allowed || loading) return null;

  return (
    <main className="max-w-6xl mx-auto px-6 pt-10 pb-6">
      <section className="pt-10 pb-6">
        <h1 className="text-3xl font-extrabold">Admin Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">
          Welcome, {user.email}
        </p>
      </section>

      <AdminTabs tab={tab} setTab={setTab} isSuper={isSuper} />

      {tab === "overview" && <OverviewSection kpi={kpi} />}

      {tab === "orders" && <OrdersSection orders={orders} />}

      {tab === "products" && (
        <ProductsSection
          products={products}
          headers={headers}
          rows={rows}
          loading={productsLoading}
          error={error}
        />
      )}

      {tab === "users" && (<UsersSection users={users} user={selectedUser} openUser={openUser} />)}
    </main>
  );
}
