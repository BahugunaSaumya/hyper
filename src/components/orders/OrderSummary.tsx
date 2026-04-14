const formatINR = (n?: number) =>
  "₹ " + Number(n || 0).toLocaleString("en-IN");

export default function OrderSummary({ totals }: any) {
  if (!totals) return null;

  return (
    <div className="border rounded-xl p-4">
      <div className="font-title mb-2">Summary</div>
      <Row label="Subtotal" value={formatINR(totals.subtotal)} />
      <Row label="Tax" value={formatINR(totals.tax)} />
      <Row label="Shipping" value={formatINR(totals.shipping)} />
      {totals.discount ? (
        <Row label="Discount" value={`- ${formatINR(totals.discount)}`} />
      ) : null}
      <div className="flex justify-between font-semibold">
        <span>Total</span>
        <span>{formatINR(totals.total)}</span>
      </div>
    </div>
  );
}

function Row({ label, value }: any) {
  return (
    <div className="flex justify-between text-sm mb-1">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
