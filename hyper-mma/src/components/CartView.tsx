// src/components/CartView.tsx
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import YouMayAlsoLike from "@/components/YouMayAlsoLike";
import CartItemTile from "@/components/CartItemTile"; // ← use the tile

const parseINR = (v: string) => {
  const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
};
const formatINR = (n: number) => "₹ " + Number(n || 0).toLocaleString("en-IN");
const safe = (s: string) => encodeURI(decodeURI(String(s || "")));

export default function CartView() {
  const router = useRouter();
  const { list, increase, decrease, remove } = useCart();
  const [express, setExpress] = useState(false);

  const subtotal = useMemo(
    () => list.reduce((s, it) => s + parseINR(it.price) * (it.quantity || 0), 0),
    [list]
  );
  const shipping = express ? 80 : 0;
  const total = subtotal + shipping;
  const itemCount = list.reduce((s, it) => s + (it.quantity || 0), 0);

  return (
    <section className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12 bg-white text-black">
      {/* header wordmark */}
      <div className="flex justify-center mb-10">
        <img src="/assets/cart-header.png" alt="Cart" className="h-16 sm:h-20 object-contain" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* LEFT list */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <p className="text-base sm:text-lg font-semibold">
              Product List : <span>{itemCount}</span>
            </p>
          </div>

          {list.length === 0 ? (
            <div className="text-center text-gray-500 text-lg py-20">Your cart is empty.</div>
          ) : (
            <div className="divide-y divide-black/10">
              {list.map((it, i) => (
                <CartItemTile
                  key={`${it.id}__${i}`}
                  id={it.id}
                  title={it.name}
                  image={safe(it.image)}
                  unitPrice={it.price}
                  size={it.size}
                  qty={it.quantity}
                  onIncrease={() => increase(it.id)}
                  onDecrease={() => decrease(it.id)}
                  onRemove={() => remove(it.id)}
                />
              ))}
            </div>
          )}
        </div>

        {/* RIGHT summary */}
        <aside>
          <div className="rounded-2xl border px-6 py-7 bg-white shadow-sm">
            <h3 className="text-center text-lg font-bold mb-5">CART SUMMARY</h3>

            <div className="space-y-3 mb-4">
              <label className="flex items-center justify-between border rounded-lg px-4 py-2 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="ship"
                    className="accent-pink-600"
                    checked={!express}
                    onChange={() => setExpress(false)}
                  />
                  Free Shipping
                </span>
                <span>{formatINR(0)}</span>
              </label>
              <label className="flex items-center justify-between border rounded-lg px-4 py-2 cursor-pointer">
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="ship"
                    className="accent-pink-600"
                    checked={express}
                    onChange={() => setExpress(true)}
                  />
                  Express Shipping
                </span>
                <span>+ {formatINR(80)}</span>
              </label>
            </div>

            <div className="flex justify-between text-base mb-2">
              <span>Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold mb-5">
              <span>Total</span>
              <span>{formatINR(total)}</span>
            </div>

            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              By continuing, I declare that I have read and accept the Purchase Conditions and
              understand the{" "}
              <a href="#" className="text-pink-600 underline">
                Privacy and Cookie Policy
              </a>
              .
            </p>

            <button
              onClick={() => router.push("/checkout")}
              className="w-full bg-black text-white py-3.5 rounded-full hover:bg-pink-600 transition font-semibold"
            >
              Checkout
            </button>

            <div className="mt-6 text-center">
              <p className="text-xs mb-2 text-gray-500">We Accept</p>
              <div className="flex justify-center gap-2">
                <img src="/assets/MasterCard.png" className="h-6" alt="MasterCard" />
                <img src="/assets/ApplePay.png" className="h-6" alt="ApplePay" />
                <img src="/assets/American Express.png" className="h-6" alt="American Express" />
                <img src="/assets/Google Pay.png" className="h-6" alt="Google Pay" />
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* YMAL on cart page too */}
      <YouMayAlsoLike excludeTitle="" limit={4} />
    </section>
  );
}
