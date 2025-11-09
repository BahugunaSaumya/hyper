"use client";

export type TabKey = "size" | "highlights" | "reviews";

export default function SubTabs({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  const items: { key: TabKey; label: string }[] = [
    { key: "size", label: "SIZE INFO" },
    { key: "highlights", label: "HIGHLIGHTS" },
    { key: "reviews", label: "REVIEWS" },
  ];

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        {items.map((it) => (
          <button
            key={it.key}
            className={`relative flex-1 py-3 text-[11px] font-extrabold tracking-widest uppercase ${
              active === it.key ? "text-black" : "text-gray-400"
            }`}
            onClick={() => onChange(it.key)}
          >
            {it.label}
            <span
              className={`absolute left-1/2 -bottom-1 h-[3px] w-20 -translate-x-1/2 rounded-full transition-all ${
                active === it.key ? "bg-black" : "bg-transparent"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
