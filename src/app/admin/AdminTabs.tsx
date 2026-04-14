"use client";

import { AdminTab } from "@/types/admin";
import { getAuth } from "firebase/auth";

type Props = {
  tab: AdminTab;
  setTab: (t: AdminTab) => void;
  isSuper: boolean;
};

export default function AdminTabs({ tab, setTab, isSuper }: Props) {
  const tabs: AdminTab[] = ["overview", "products", "orders", "users"];
  if (isSuper) tabs.push("super");

  async function handleClearCache() {
    if (!confirm("Clear server cache?")) return;
    const user = getAuth().currentUser;
    if (!user) {
        alert("Not authenticated");
        return;
    }

    try {
      const token = await user.getIdToken(true);
      const res = await fetch("/api/admin/cache/clear", {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        });

      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Cache clear failed");

      alert("Cache cleared successfully");
    } catch (e: any) {
      alert(e?.message || "Failed to clear cache");
    }
  }

  return (
    <nav className="flex items-center justify-between mb-4">
      {/* LEFT: tabs */}
      <div className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full border text-xs sm:text-sm ${
              tab === t ? "bg-black text-white" : "hover:bg-gray-100"
            }`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* RIGHT: cache clear */}
      <button
        onClick={handleClearCache}
        className="px-3 py-1.5 rounded-full border text-xs sm:text-sm text-red-600 hover:bg-red-600 hover:text-white transition"
      >
        Clear Cache
      </button>
    </nav>
  );
}
