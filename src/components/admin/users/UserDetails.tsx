"use client";
import { formatIST } from "@/lib/time";

export default function UserDetails({ user }: { user: any }) {
  // Check if the root object or the inner user data exists
  if (!user || !user.user) {
    return (
      <div className="border rounded-xl p-4 text-sm w-full md:w-1/2 text-gray-500 bg-gray-50">
        Select a user to view details
      </div>
    );
  }

  const { user: profile, orders } = user;

  return (
    <div className="border rounded-xl p-6 text-sm w-full md:w-1/2 bg-white shadow-sm">
      <h2 className="text-lg font-bold mb-4 border-b pb-2">Customer Profile</h2>
      
      <div className="grid grid-cols-1 gap-2 mb-6">
        <div><b>Name:</b> {profile.name || "N/A"}</div>
        <div><b>Email:</b> {profile.email}</div>
        <div><b>Phone:</b> {profile.mobile || "—"}</div>
        <div><b>Customer ID:</b> <span className="font-mono text-xs">{profile.id}</span></div>
        
        {profile.address ? (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
            <b className="text-blue-800 block mb-1">Saved Shipping Address:</b>
            <p className="text-gray-700 leading-relaxed">
              {profile.address.address1}, {profile.address.address2 && `${profile.address.address2}, `}
              {profile.address.city}, {profile.address.state} - {profile.address.pincode}
            </p>
          </div>
        ) : (
          <div className="mt-3 text-gray-400 italic">No saved address found.</div>
        )}
      </div>

      <h3 className="font-bold mb-2 border-b pb-1">Order History ({orders?.length || 0})</h3>
      <ul className="divide-y max-h-96 overflow-auto pr-2">
        {orders && orders.length > 0 ? (
          orders.map((o: any) => (
            <li key={o.id} className="py-3 hover:bg-gray-50 transition-colors px-1">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-xs text-gray-500">
                    {new Date(o?.createdAt).toLocaleDateString()}
                  </div>
                  <div className="font-medium text-gray-900">
                    ₹{o.total.toLocaleString()} · <span className="capitalize">{o.status}</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-gray-400 font-mono">{o.orderNumber}</span>
                    <a 
                      href={`admin/orders/${o.id}`} 
                      className="ml-3 text-xs text-blue-600 font-semibold hover:underline"
                    >
                      VIEW DETAILS →
                    </a>
                  </div>
                </div>
                <div className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${
                  o.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {o.paymentStatus}
                </div>
              </div>
            </li>
          ))
        ) : (
          <li className="py-4 text-center text-gray-400">No orders placed yet.</li>
        )}
      </ul>
    </div>
  );
}