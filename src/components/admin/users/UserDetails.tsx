import { formatIST } from "@/lib/time";

export default function UserDetails({ user }: { user: any }) {
  if (!user) {
    return (
      <div className="border rounded-xl p-4 text-sm w-1/2 text-gray-500">
        Select a user to view details
      </div>
    );
  }

  return (
    <div className="border rounded-xl p-4 text-sm w-1/2">
      <div><b>Name:</b> {user?.user?.name || ''}</div>
      <div><b>Email:</b> {user?.user?.email || ''}</div>
      <div><b>Phone:</b> {user?.user?.phone || "—"}</div>
      <div><b>ID:</b> {user?.user?.uid}</div>
      <ul className="divide-y max-h-80 overflow-auto">
        {user.orders.map((o: any) => (
            <li key={o.id} className="py-2">
                <div className="text-xs text-gray-500">
                    {formatIST(o.createdAt)}
                </div>
                <div className="text-sm">
                    <div>{o.totals?.total} {o.totals?.currency || "INR"} · {o.status || "confirmed"}</div>
                    <a href={`/order/admin/${o.id}`} className="underline decoration-dotted hover:decoration-solid ml-1 font-mono">
                        {o.id}
                    </a>
                    <a href={`/order/admin/${o.id}`} className="ml-2 text-xs text-blue-600 underline">View</a>
                </div>
            </li>
        ))}
    </ul>
    </div>
  );
}
