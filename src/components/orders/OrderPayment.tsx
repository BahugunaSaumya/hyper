import { formatIST } from "@/lib/time";

export default function OrderPayment({ payment }: any) {
  if (!payment) return null;

  return (
    <div className="border rounded-xl p-4">
      <div className="font-title mb-2">Payment</div>
      <div className="text-xs space-y-1">
        {Object.entries(payment).map(([k, v]: any) => (
          <div key={k}>
            <span className="text-gray-500">{k}:</span>{" "}
            {typeof v === "object" ? formatIST(v) : String(v)}
          </div>
        ))}
      </div>
    </div>
  );
}
