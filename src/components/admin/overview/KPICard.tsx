import Card from "@/components/ui/Card";

type Props = {
  label: string;
  value: string | number;
};

export default function KPICard({ label, value }: Props) {
  return (
    <Card className="p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </Card>
  );
}
