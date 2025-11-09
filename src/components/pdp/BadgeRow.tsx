"use client";

export default function BadgeRow() {
  const items = [
    { icon: "/assets/product-icon/headset_mic.png", label: "Customer Support" },
    { icon: "/assets/product-icon/beenhere.png", label: "Secure Payment" },
    { icon: "/assets/product-icon/refresh.png", label: "10 Days Replacement" },
    { icon: "/assets/product-icon/laundry.png", label: "Premium Fabric" },
    { icon: "/assets/product-icon/truck.png", label: "Delivery within 4–5 days" },
  ];

  return (
    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3 text-[11px] sm:text-xs">
      {items.map(({ icon, label }) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-100 px-2.5 py-2"
        >
          <span className="grid h-6 w-6 place-items-center">
            <img
              src={icon}
              alt={label}
              className="h-4 w-4 sm:h-5 sm:w-5 object-contain"
            />
          </span>
          <span className="font-semibold text-blue-800">{label}</span>
        </div>
      ))}
    </div>
  );
}
