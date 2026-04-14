import { Th, Td } from "@/components/ui/Table";

type Props = {
  products: any[];
  headers?: string[];
  onChange?: (next: any[]) => void;
};

export default function ProductsCsvTable({
  products,
  headers,
  onChange,
}: Props) {
  const cols =
    headers ??
    Array.from(
      new Set(
        products.flatMap((p) => Object.keys(p))
      )
    );

  return (
    <table className="min-w-full text-xs sm:text-sm border rounded">
      <thead className="bg-gray-50">
        <tr>
          {cols.map((h) => (
            <Th key={h}>{h}</Th>
          ))}
        </tr>
      </thead>

      <tbody className="divide-y">
        {products.map((p, rowIdx) => (
          <tr key={p.id ?? rowIdx}>
            {cols.map((col) => (
              <Td key={col}>
                <input
                  value={p[col] ?? ""}
                  onChange={(e) => {
                    if (!onChange) return;

                    const next = products.map((x) => ({ ...x }));
                    next[rowIdx][col] = e.target.value;
                    onChange(next);
                  }}
                  className="w-full px-2 py-1 border rounded-md"
                />
              </Td>
            ))}
          </tr>
        ))}

        {!products.length && (
          <tr>
            <Td className="text-gray-500">No products.</Td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
