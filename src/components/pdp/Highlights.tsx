"use client";

export default function Highlights({ points = [] as string[] }) {
  const items =
    points.length > 0
      ? points
      : [
          "Premium fabric, breathable and durable",
          "MMA-ready: kicking range + grappling comfort",
          "Printed graphics with high color fastness",
        ];

  return (
    <ul className="mt-4 space-y-3 text-gray-700">
      {items.map((line, i) => (
        <li key={i} className="flex items-start gap-2">
          <span aria-hidden className="mt-1 inline-block h-2 w-2 rounded-full bg-pink-500" />
          <span className="leading-relaxed">{line}</span>
        </li>
      ))}
    </ul>
  );
}

