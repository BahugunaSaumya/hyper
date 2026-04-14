type Props = {
  view: "grid" | "table";
  onChange: (v: "grid" | "table") => void;
};

export default function ProductsViewToggle({ view, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {(["grid", "table"] as const).map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1 text-xs border rounded ${
            view === v ? "bg-black text-white" : ""
          }`}
        >
          {v.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
