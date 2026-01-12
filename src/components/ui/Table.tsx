export function Th({ children }: any) {
  return <th className="px-4 py-2 text-left font-semibold border-b">{children}</th>;
}

export function Td({ children, className = "" }: any) {
  return <td className={`px-4 py-2 border-b ${className}`}>{children}</td>;
}
