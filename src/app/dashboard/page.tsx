"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoadingScreen from "@/components/LoadingScreen";

// Updated types to match MySQL schema
type OrderLite = {
  id: number;
  order_number: string;
  total: number;
  order_status: string;
  payment_status: string;
  created_at: string;
};

type Address = {
  first_name: string;
  last_name: string;
  mobile: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pincode: string;
  company?: string;
};

export default function DashboardPage() {
  const { user, logout, loading } = useAuth() as any;
  const router = useRouter();

  const [orders, setOrders] = useState<OrderLite[]>([]);
  const [addr, setAddr] = useState<Address | null>(null);
  const [fetching, setFetching] = useState(true);
  const [editingAddr, setEditingAddr] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login?next=/dashboard");
  }, [loading, user, router]);

  // Combined fetch for Profile and Orders
  useEffect(() => {
    if (!user) return;
    const loadDashboardData = async () => {
      try {
        const tok = await user.getIdToken();
        const [profRes, orderRes] = await Promise.all([
          fetch("/api/me/profile", { headers: { authorization: `Bearer ${tok}` } }),
          fetch("/api/me/orders", { headers: { authorization: `Bearer ${tok}` } })
        ]);

        const profData = await profRes.json();
        const orderData = await orderRes.json();

        if (profRes.ok) setAddr(profData.address);
        if (orderRes.ok) setOrders(orderData.orders || []);
      } catch (err) {
        console.error("Dashboard load failed", err);
      } finally {
        setFetching(false);
      }
    };
    loadDashboardData();
  }, [user]);

  const kpis = useMemo(() => ({
    count: orders.length,
    totalSpend: orders.reduce((sum, o) => sum + Number(o.total), 0),
    latest: orders[0]?.created_at || null
  }), [orders]);

  async function saveAddress(e: React.FormEvent) {
    e.preventDefault();
    setSavingAddr(true);
    try {
      const tok = await user.getIdToken();
      const res = await fetch("/api/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", authorization: `Bearer ${tok}` },
        body: JSON.stringify(addr),
      });
      if (res.ok) {
        setEditingAddr(false);
        alert("Address updated successfully.");
      }
    } catch (e) {
      alert("Failed to save address.");
    } finally {
      setSavingAddr(false);
    }
  }

  if (loading || fetching) return <LoadingScreen />;

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 bg-white text-black">
      <header className="mb-10">
        <h1 className="text-4xl font-black uppercase tracking-tighter">My Account</h1>
        <p className="text-gray-500">Welcome back, {user?.email}</p>
        <button onClick={() => logout()} className="mt-4 text-md font-bold text-white bg-red-500 px-3 py-2 rounded hover:underline">Logout</button>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <KPIBox label="Total Orders" value={kpis.count} />
        <KPIBox label="Total Spent" value={`₹${kpis.totalSpend.toLocaleString()}`} />
        <KPIBox label="Latest Order" value={kpis.latest ? new Date(kpis.latest).toLocaleDateString() : "N/A"} />
      </section>

      <div className="grid lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold mb-4 mt-4 uppercase tracking-tight">Order History</h2>
          <div className="border rounded-xl  overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left">Order #</th>
                  <th className="p-4 text-left">Date</th>
                  <th className="p-4 text-left">Status</th>
                  <th className="p-4 text-left">Total</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {orders.map(o => (
                  <tr key={o.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium">{o.order_number}</td>
                    <td className="p-4 text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="p-4"><StatusBadge status={o.order_status} /></td>
                    <td className="p-4 font-bold">₹{Number(o.total).toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <Link href={`/orders/${o.order_number}`} className="text-pink-600 font-bold hover:underline">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside>
          <div className="p-6 border rounded-xl bg-gray-50 mt-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold uppercase">Default Address</h2>
              <button onClick={() => setEditingAddr(!editingAddr)} className="font-bold text-pink-600">
                {editingAddr ? "Cancel" : "Add Address"}
              </button>
            </div>

            {editingAddr ? (
              <form onSubmit={saveAddress} className="space-y-3">
                <input className="w-full p-2 border rounded" placeholder="First Name" value={addr?.first_name || ""} onChange={e => setAddr({...addr!, first_name: e.target.value})} />
                <input className="w-full p-2 border rounded" placeholder="Last Name" value={addr?.last_name || ""} onChange={e => setAddr({...addr!, last_name: e.target.value})} />
                <input className="w-full p-2 border rounded" placeholder="Address Line 1" value={addr?.address1 || ""} onChange={e => setAddr({...addr!, address1: e.target.value})} />
                <input className="w-full p-2 border rounded" placeholder="Address Line 2" value={addr?.address2 || ""} onChange={e => setAddr({...addr!, address2: e.target.value})} />
                <input className="w-full p-2 border rounded" placeholder="Mobile" value={addr?.mobile || ""} onChange={e => setAddr({...addr!, mobile: e.target.value})} />
                <input className="w-full p-2 border rounded" placeholder="City" value={addr?.city || ""} onChange={e => setAddr({...addr!, city: e.target.value})} />
                <input className="w-full p-2 border rounded" placeholder="State" value={addr?.state || ""} onChange={e => setAddr({...addr!, state: e.target.value})} />
                <input className="w-full p-2 border rounded" placeholder="Pincode" value={addr?.pincode || ""} onChange={e => setAddr({...addr!, pincode: e.target.value})} />
                <button disabled={savingAddr} className="w-full bg-black text-white py-2 rounded-full font-bold tracking-widest text-md">
                  {savingAddr ? "Saving..." : "Save Address"}
                </button>
              </form>
            ) : (
              <div className="text-sm text-gray-700 space-y-1">
                {addr ? (
                  <>
                    <p className="font-bold text-black">{addr.first_name} {addr.last_name}</p>
                    <p>{addr.address1}</p>
                    <p>{addr.address2}</p>
                    <p>{addr.city}, {addr.state} - {addr.pincode}</p>
                    <p className="pt-2 text-gray-500">Mobile: {addr.mobile}</p>
                  </>
                ) : <p className="italic">No address saved yet.</p>}
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}

// Sub-components
function KPIBox({ label, value }: any) {
  return (
    <div className="p-6 border rounded-2xl">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: any = { delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700', processing: 'bg-blue-100 text-blue-700' };
  return <span className={`px-2 py-1 rounded text-[10px] font-bold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}