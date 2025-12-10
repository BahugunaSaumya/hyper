"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import YouMayAlsoLike from "@/components/YouMayAlsoLike";
import CartItemTile from "@/components/CartItemTile";

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
  const today = new Date();
  const newLaunchCutoff = new Date("2025-12-11T00:00:00"); // Dec 11, 2025
  const allNewLaunch = list.length > 0 && list.every(it => it.newLaunch);
  const isBeforeLaunch = today < newLaunchCutoff;
  const disableCheckout = allNewLaunch && isBeforeLaunch;
  const subtotal = useMemo(
    () =>
      list.reduce((s, it) => {
        // Exclude newLaunch items if before cutoff date
        if (it.newLaunch && today < newLaunchCutoff) return s;
        return s + parseINR(it.price) * (it.quantity || 0);
      }, 0),
    [list, today]
  );
  const shipping = express ? 80 : 0;
  const total = subtotal + shipping;
  const itemCount = list.reduce((s, it) => s + (it.quantity || 0), 0);
  return (
    <section className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12 bg-white text-black">
      <div className="flex justify-center mb-10 mt-3">
        <img src="/assets/cart-header.png" alt="Cart" className="h-16 sm:h-20 object-contain" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className={list.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
          {list.length > 0 && (
            <div className="flex items-center justify-between mb-5">
              <p className="text-base sm:text-lg font-semibold">
                Product List : <span>{itemCount}</span>
              </p>
            </div>
          )}
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <h2 className="text-gray-500 text-lg mb-6">Your cart is empty.</h2>
              <button
                onClick={() => router.push("/products")}
                className="px-8 py-3 bg-pink-600 text-white rounded-full font-semibold hover:bg-pink-500 transition"
              >
                Continue Shopping
              </button>
          </div>
          ) : (
            <div className="divide-y divide-black/10">
              {list.map((it, i) => (
                <CartItemTile
                  key={`${it.id}__${i}`}
                  id={it.id}
                  title={it.name}
                  slug={it.slug}
                  image={safe(it.image)}
                  unitPrice={it.price}
                  size={it.size}
                  qty={it.quantity}
                  onIncrease={() => increase(it.id)}
                  onDecrease={() => decrease(it.id)}
                  onRemove={() => remove(it.id)}
                  newLaunch={it.newLaunch}
                />
              ))}
            </div>
          )}
        </div>
        {list.length > 0 && (
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
                <a href="/terms" className="text-pink-600 underline">
                  Terms And Conditions
                </a>
                .
              </p>
              <button
                onClick={() => !disableCheckout && router.push("/checkout")}
                disabled={disableCheckout}
                className={`w-full py-3.5 rounded-full font-semibold transition 
                  ${disableCheckout 
                    ? "bg-gray-400 cursor-not-allowed" 
                    : "bg-black text-white hover:bg-pink-600"
                  }`}
              >
                {disableCheckout ? "Unavailable Until Dec 11" : "Checkout"}
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
        )}
      </div>
      <YouMayAlsoLike excludeTitle="" limit={4} />
    </section>
  );
}
