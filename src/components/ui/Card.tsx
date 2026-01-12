// /components/ui/Card.tsx
export default function Card({ title, children }: any) {
  return (
    <div className="rounded-2xl border p-5">
      <div className="text-xs text-gray-500">{title}</div>
      {children}
    </div>
  );
}
