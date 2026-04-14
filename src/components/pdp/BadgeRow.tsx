"use client";

export default function BadgeRow() {
  const items = [
    { icon: "/assets/product-icon/headset_mic.avif", label: "Customer Support" },
    { icon: "/assets/product-icon/beenhere.avif", label: "Secure Payment" },
    { icon: "/assets/product-icon/return.avif", label: "10 Days Replacement" },
    { icon: "/assets/product-icon/laundry.avif", label: "Premium Fabric" },
    { icon: "/assets/product-icon/delivery-truck.avif", label: "Delivery within 4–5 days" },
  ];

  return (
    <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] sm:text-[14px]">
      {items.map(({ icon, label }) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-lg border border-gray-100 bg-[#F3F6FF] px-2.5 py-1"
        >
          <span className="grid h-6 w-6 place-items-center">
            <img
              src={icon}
              alt={label}
              className="h-4 w-4 sm:h-5 sm:w-5 object-contain"
            />
          </span>
          <span className="font-bold text-blue-800">{label}</span>
        </div>
      ))}
    </div>
  );
}