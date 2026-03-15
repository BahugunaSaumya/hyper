"use client";

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import YouMayAlsoLike from "@/components/YouMayAlsoLike";
import CartItemTile from "@/components/CartItemTile";
import CompleteTheLook from "./CompleteLook";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import ErrorMessage from "./ui/ErrorMessage";

const formatINR = (n: number) => "₹ " + Number(n || 0).toLocaleString("en-IN");
export default function CartView() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { list, increase, decrease, remove, refreshCart } = useCart();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [allLooks, setAllLooks] = useState<Record<number, any>>({});
  const [lookTriggerId, setLookTriggerId] = useState<number | null>(null);
  const [showLookDrawer, setShowLookDrawer] = useState(false);
  const [activeLookData, setActiveLookData] = useState<any>(null);
  const [cartSummary, setCartSummary] = useState({
    id: null,
    subtotal: 0,
    tax: 0,
    discount: 0,
    total: 0,
    coupon_id: null,
    shipping_charges: 0,
    cart_category: 'both'
  });
  const [error, setError] = useState<string | null>(null);
  const loadCart = async () => {
    const data = await refreshCart();
    if (!data) return;
    setCartSummary({
      id: data?.summary?.id,
      subtotal: Number(data?.summary?.subtotal || 0),
      tax: Number(data?.summary?.tax || 0),
      discount: Number(data?.summary?.discount || 0),
      total: Number(data?.summary?.total || 0),
      coupon_id: data?.summary?.coupon_id,
      shipping_charges: data?.summary?.shipping || 0,
      cart_category: data?.summary?.cart_category || 'both',
    });
    setAppliedCoupon(data?.summary?.coupon_id ?? null);
  };

  useEffect(() => {
    list.forEach(async (item) => {
      if (!allLooks[item.productId]) {
        try {
          const res = await fetch(`/api/complete-look/${item.productId}`);
          if (res.ok) {
            const json = await res.json();
            setAllLooks((prev) => ({ ...prev, [item.productId]: json }));
          }
        } catch (err : any) {
          setError("Look fetch failed" + err?.message);
        }
      }
    });
  }, [list]);
  
  useEffect(() => {
    loadCart();
    fetch("/api/coupons").then((r) => r.json()).then((d) => setCoupons(d.coupons || [])).catch(() => {});
  }, []);

  /* ---------- CALCULATIONS ---------- */
  const allLookProducts = useMemo(() => {
    if (!list.length || !allLooks) return [];
    const productMap = new Map();
    list.forEach((item) => {
      const look = allLooks[item.productId];
      if (look && look.products) {
        look.products.forEach((p: any) => {
          if (!productMap.has(p.id)) {
            productMap.set(p.id, { 
              ...p, 
              parentProductId: item.productId 
            });
          }
        });
      }
    });
    return Array.from(productMap.values());
  }, [list, allLooks]);
  const handleOpenLook = (productInLook: any) => {
    setLookTriggerId(productInLook.id);
    if (productInLook) {
      const formattedData = {
        products: [productInLook]
      };
      setActiveLookData(formattedData);
      setShowLookDrawer(true);
    }
  };
  useEffect(() => {
    if (loading) return;
  }, [loading, user]);

  const applyCoupon = async (coupon: any) => {
    if (loading) return;
    if (!user?.uid) {
      setError("This coupon is valid for registered users only. Please Sign In or Sign Up.");
      return;
    }

    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/cart/apply-coupon", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cartId: cartSummary.id,
          couponId: coupon.id,
          discountAmount: coupon.type === "amount" ? coupon.amount : '',
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Coupon apply failed");
        return;
      }
      setAppliedCoupon(coupon.id);
      await loadCart();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const removeCoupon = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch("/api/cart/remove-coupon", {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cartId: cartSummary.id,
          couponId: cartSummary.coupon_id,
          discountAmount: cartSummary.discount
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Coupon remove failed");
        return;
      }
      setAppliedCoupon(null);
      await loadCart();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleIncrease = async (id: number) => {
    await increase(id);
    await loadCart(); 
  };

  const handleDecrease = async (id: number) => {
    await decrease(id);
    await loadCart();
  };

  const handleRemove = async (id: number) => {
    await remove(id);
    await loadCart();
  };

  const handleCloseDrawer = async () => {
    setShowLookDrawer(false);
    await loadCart(); // Important: Refresh if items were added from look
  };
  const percentage = Math.min((cartSummary.total / 2500) * 100, 100);
  const categoryIcons: Record<string, string> = {
    compressions: "/assets/cart-compression-icon.avif",
    shorts: "/assets/cart-short-icon.avif",
    both: "/assets/cart-icon.avif",
  };

  const activeIcon = categoryIcons[cartSummary.cart_category] || "/assets/cart-icon.avif";
  const isDiscountUnlocked = cartSummary.total >= 2500;

  return (
    <section className="max-w-[1240px] mx-auto px-4 sm:px-6 md:px-8 py-8 sm:py-10 md:py-12 bg-white text-black">
      <div className="flex justify-center mb-5 mt-3">
        <img src="/assets/cart-header.png" alt="Cart" className="h-16 sm:h-20 object-cover object-bottom" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className={list.length > 0 ? "lg:col-span-2" : "lg:col-span-3"}>
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <img src="/assets/bag-icon.png" alt="bag-icon" className="max-h-[60px]" />
              <div className="text-black font-md mb-6 mt-5">Your cart is empty. Start adding items in the cart.</div>
              <button
                onClick={() => router.push("/products")}
                className="px-8 py-3 bg-black text-white font-title rounded-full hover:bg-pink-500 transition"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="divide-y divide-black/10">
              <div className="flex flex-col items-center justify-center text-center">
                <img 
                  src={activeIcon} 
                  alt="Cart category icon" 
                  className="max-h-[80px] transition-opacity duration-300" 
                />
                <div className="text-black font-md mt-2">
                  {isDiscountUnlocked ? (
                    <>
                      <div className="items-center">
                        🥳 Hurray!! You have unlocked
                      </div>
                      <div>
                        additional <span className="font-extrabold">5% discount </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="items-center">
                        Complete your outfit or order above
                      </div>
                      <div>
                        <span className="font-extrabold">₹2500</span> to get an additional <span className="font-extrabold">5% off</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="w-full max-w-[300px] mt-3 px-1 mb-7">
                  {/* The Actual Progress Bar */}
                  <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ease-out ${
                        isDiscountUnlocked ? "bg-[#0C5CD2]" : "bg-[#0C5CD2]"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
              {list.map((it) => (
                <CartItemTile
                  key={it.id}
                  id={it.id}
                  title={it.name}
                  slug={it.slug}
                  unitPrice={it.price}
                  size={String(it.size)}
                  qty={it.quantity}
                  newLaunch={it.newLaunch ?? false}
                  onIncrease={() => handleIncrease(it.id)}
                  onDecrease={() => handleDecrease(it.id)}
                  onRemove={() => handleRemove(it.id)}
                />
              ))}
            </div>
          )}
        </div>
        <ErrorMessage message={error || ""} onClose={() => setError(null)} />
        {list.length > 0 && (<aside>
            <div className="w-full space-y-6">
              {coupons.length > 0 && (
                <div className="flex flex-col gap-2 bg-white rounded border border-[#00AF35] px-3 py-4">
                  {coupons.map((c) => (
                    <div key={c.code} className="grid grid-cols-[1fr_auto] items-center">
                      <div>
                        <span className="flex items-end whitespace-nowrap">
                          <img src="/assets/discount-icon.avif" alt="discount" className="h-6 w-6 mr-1" />
                          <div className="text-[#00AF35] font-extrabold text-lg ml-1">{ appliedCoupon === c.id ? 'Saving ₹200' : 'Save ₹200'}</div>
                        </span>
                        <div className="text-md text-black font-extrabold mt-0.5"> {appliedCoupon === c.id ? '“TryNew” Applied' : 'with “TryNew”'}</div>
                      </div>
                      <div className="flex justify-end items-center">
                        <button
                          onClick={() =>
                            appliedCoupon === c.id
                              ? removeCoupon()
                              : applyCoupon(c)
                          }
                          className="border rounded-lg px-3 text-sm py-2 bg-green-50 text-[#00AF35] hover:border-[#00AF35] transition"
                        >
                          {appliedCoupon === c.id ? "Remove" : "Apply"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {allLookProducts.length > 0 && (<>
                  <div className="font-title font-bold text-sm mb-2 tracking-wide">Complete your outfit</div>
                  <div className="space-y-2">
                    {allLookProducts.map((p: any) => (
                      <div key={p.id}  className="flex items-center justify-between bg-neutral-100 p-3 rounded-sm transition-all hover:bg-neutral-200/50">
                        <div className="flex items-center gap-3">
                          <Link 
                            href={`/product/${p.slug}`}
                            className="p-1 items-start">
                            <img src={`/assets/models/products/${p.slug}/1.avif`} className="w-16 h-20 object-contain" alt={p.title}/>
                          </Link>
                          <div>
                            <Link 
                              href={`/product/${p.slug}`}
                              className="text-lg sm:text-xl font-bold line-clamp-2">
                              {p.title}
                            </Link>
                            <div className="text-lg font-extrabold mt-0.5">
                              {formatINR(p.price)}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleOpenLook(p)}
                          className="ml-4 flex-shrink-0 h-10 w-10 flex items-center justify-center transition active:scale-90"
                          aria-label="View complete look"
                        >
                          <img src="/assets/plus-bold-icon.png" className="w-6 h-6" alt="View complete look"/>
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="pt-4">
                <div className="flex justify-between items-end text-lg font-semibold mb-2 cursor-pointer"
                  onClick={() => setShowSummary((s) => !s)}
                >
                  <span className="flex items-end whitespace-nowrap">
                    <img src="/assets/receipt-icon.png" alt="estimate" className="h-5 w-4 mr-1" />
                    Estimate Total
                  </span>
                  <span className="flex items-center gap-2">
                    {formatINR(cartSummary.total)}
                    <span className="text-sm">
                        {showSummary ? "▲" : 
                        <img
                          src="/assets/down-arrow.png"
                          className="w-2.5 h-2 mr-1 mt-1.5"
                          alt="down arrow"
                        />}
                    </span>
                  </span>
                </div>
                {showSummary && (
                  <div className="border rounded-lg p-4 mb-4 text-sm space-y-2 bg-gray-50">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>{formatINR(cartSummary.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax</span>
                      <span>{formatINR(cartSummary.tax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipping</span>
                      <span>Calc. At Checkout</span>
                    </div>
                    {cartSummary.discount > 0.00 && (
                      <div className="flex justify-between text-[#00AF35]">
                        <span>Discount</span>
                        <span>-{formatINR(cartSummary.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold border-t pt-2">
                      <span>Total</span>
                      <span>{formatINR(cartSummary.total)}</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => router.push("/checkout")}
                  className="w-full py-3.5 rounded-full font-semibold font-title transition bg-black text-white hover:bg-pink-600 uppercase tracking-widest"
                >Checkout</button>
                <div className="mt-2 text-[12px] text-black text-center">Proceeding here will not deduct any amount.</div>
              </div>
            </div>
          </aside>
        )}
      </div>
      {lookTriggerId && ( <CompleteTheLook initialData={activeLookData} visible={showLookDrawer} onClose={() => handleCloseDrawer()} /> )}
      <div className="mt-12">
        <YouMayAlsoLike excludeTitle="" limit={4} />
      </div>
    </section>
  );
}