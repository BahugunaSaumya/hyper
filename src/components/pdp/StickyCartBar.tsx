"use client";

export default function StickyCartBar({
  price,
  mrp,              // NEW: optional original price
  discountPct,       // if not passed, we compute from mrp/price
  onAdd,
  disabled,
}: {
  price: string | number;
  mrp?: string | number;
  discountPct?: number;
  onAdd: () => void;
  disabled?: boolean;
}) {
  const toNumber = (v: any) =>
    Number.isFinite(v) ? Number(v) : Number(String(v ?? "").replace(/[^\d.]/g, "")) || 0;
  const formatINR = (n: number) => n.toLocaleString("en-IN");

  const priceNum = toNumber(price);
  const mrpNum = toNumber(mrp);
  const showMrp = mrpNum > priceNum;

  const pct =
    typeof discountPct === "number" && discountPct > 0
      ? Math.round(discountPct)
      : showMrp && mrpNum
      ? Math.max(0, Math.min(99, Math.round(((mrpNum - priceNum) / mrpNum) * 100)))
      : 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2">
        <div className="flex-1">
          <div className="text-xs text-gray-400">
            {showMrp ? <span className="line-through">₹{formatINR(mrpNum)}</span> : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold">₹{formatINR(priceNum)}</span>
            {!!pct && (
              <span className="rounded-full bg-green-500 px-2 py-0.5 text-[11px] font-bold text-white">
                {pct}% off
              </span>
            )}
          </div>
        </div>
        <button
          disabled={disabled}
          onClick={onAdd}
          className="min-w-[160px] rounded-full bg-black px-6 py-3 text-xs font-extrabold uppercase tracking-widest text-white disabled:opacity-60"
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}
