"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { INDIA_STATES_AND_UT } from "@/lib/india";
import { loadRazorpayScript } from "@/lib/razorpay";
import { LOGIN_PATH } from "@/config/paths";
import BadgeRow from "./pdp/BadgeRow";

/* -------- Utilities -------- */
const parseINR = (v: any) => {
  const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
};
const formatINR = (n: number) => "₹ " + Number(n || 0).toLocaleString("en-IN");

const isValidPhone = (s: string) => /^[6-9]\d{9}$/.test(s.trim());
const isValidPinFormat = (s: string) => /^\d{6}$/.test(s.trim());
const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

type CustomerAddress = {
  first_name: string;
  last_name: string;
  mobile: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
};

export default function CheckoutView() {
  const router = useRouter();
  const { items, isLoaded } = useCart();
  const { user } = useAuth() as any;

  const [isPurchaseSuccess, setIsPurchaseSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [guest, setGuest] = useState(false);

  // Form State
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [city, setCity] = useState("");
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");

  const [express, setExpress] = useState(false);
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [usingSaved, setUsingSaved] = useState(false);
  const [savedAddr, setSavedAddr] = useState<CustomerAddress | null>(null);
  const [editingShipping, setEditingShipping] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [cartSummary, setCartSummary] = useState({
    id: null,
    subtotal: 0,
    tax: 0,
    discount: null as number | null,
    total: 0,
    coupon_id: null,
    shipping_charges: 0
  });

  const loadCart = async () => {
    const res = await fetch("/api/cart");
    const data = await res.json();

    if (data?.items) {
      setCartSummary({
        id: data?.summary?.id,
        subtotal: Number(data?.summary?.subtotal || 0),
        tax: Number(data?.summary?.tax || 0),
        discount: data?.summary?.discount != null ? Number(data.summary.discount) : null,
        total: Number(data?.summary?.total || 0),
        coupon_id: data?.summary?.coupon_id,
        shipping_charges: data?.summary?.shipping || 0
      });
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  // Redirect if cart empty
  useEffect(() => {
    if (isLoaded && !isPurchaseSuccess && Object.keys(items).length === 0) {
      router.replace("/");
    }
  }, [items, isLoaded, router, isPurchaseSuccess]);

  // Fetch MySQL Profile/Address on load
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const tok = await user.getIdToken();
        const res = await fetch("/api/me/profile", {
          headers: { authorization: `Bearer ${tok}` },
        });
        const data = await res.json();
        
        if (res.ok && data.address) {
          const a = data.address;
          setSavedAddr(a);
          setUsingSaved(true);
          setEditingShipping(false);
          // Sync state for validation
          setFirst(a.first_name); setLast(a.last_name); setPhone(a.mobile);
          setAddr1(a.address1); setAddr2(a.address2); setCity(a.city);
          setStateVal(a.state); setPin(a.pincode); setEmail(user.email);
        }
      } catch (err) {
        console.error("Failed to load profile", err);
      }
    })();
  }, [user]);

  // PIN Validation API
  useEffect(() => {
    if (!isValidPinFormat(pin) || !editingShipping) return;
    const controller = new AbortController();
    fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: controller.signal })
      .then(r => r.json())
      .then(j => {
        if (j[0]?.Status === "Success") {
          const post = j[0].PostOffice[0];
          if (!stateVal) setStateVal(post.State);
          if (!city) setCity(post.District);
        }
      }).catch(() => {});
    return () => controller.abort();
  }, [pin, editingShipping]);
  console.log(cartSummary);

  function validate(): string | null {
    if (!firstName || !lastName) return "Full Name";
    if (!isValidPhone(phone)) return "Valid 10-digit Mobile";
    if (!isValidEmail(email)) return "Valid Email";
    if (!addr1) return "Address Line 1";
    if (!city) return "City";
    if (!stateVal) return "State";
    if (!isValidPinFormat(pin)) return "6-digit PIN Code";
    return null;
  }

  async function onCheckout() {
    const errorField = validate();
    if (errorField) return alert(`Please provide a valid ${errorField}`);

    try {
      setLoading(true);
      setLoadingMsg("Initializing secure payment...");

      const rzpLoaded = await loadRazorpayScript();
      if (!rzpLoaded) throw new Error("Razorpay SDK failed to load");

      const tok = user ? await user.getIdToken() : null;

      // 1. Create Order in MySQL & Razorpay
      setLoadingMsg("Creating your order record...");
      const res = await fetch("/api/razorpay-order", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          ...(tok && { "Authorization": `Bearer ${tok}` })
        },
        body: JSON.stringify({
          customer: { name: `${firstName} ${lastName}`, email, phone },
          shippingAddress: {
            first_name: firstName,
            last_name: lastName,
            mobile: phone,
            address1: addr1,
            address2: addr2,
            city,
            state: stateVal,
            pincode: pin,
            country: "India",
            saveAsDefault: saveAsDefault && !!user
          },
          items: Object.values(items).map((it: any) => ({
            id: it.productId,
            qty: it.quantity,
            size: it.size,
            variant_id: it.variant_id
          })),
          cartId: cartSummary.id, 
          clientTotals: { shipping: express ? 250 : 0 }
        }),
      });

      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || "Order creation failed");

      // 2. Open Razorpay Gateway
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "HYPER MMA",
        description: `Payment for Order ${orderData.order_number}`,
        order_id: orderData.id,
        handler: async (response: any) => {
          setLoading(true);
          setLoadingMsg("Verifying payment...");
          
          const verifyRes = await fetch("/api/razorpay-verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...response,
              dbOrderId: orderData.dbOrderId
            }),
          });

          if (verifyRes.ok) {
            setIsPurchaseSuccess(true);
            router.push(`/thank-you?order=${orderData.order_number}`);
          } else {
            alert("Payment verification failed. Please contact support.");
          }
          setLoading(false);
        },
        prefill: { name: `${firstName} ${lastName}`, email, contact: phone },
        theme: { color: "#000000" },
        modal: { ondismiss: () => setLoading(false) }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();

    } catch (err: any) {
      alert(err.message || "Checkout failed");
      setLoading(false);
    }
  }

  return (
    <main className="px-6 py-12 max-w-6xl mx-auto bg-white text-black min-h-screen">
        <section>
          <img src="/assets/checkout.avif" alt="Cart" className="h-16 sm:h-20 object-cover object-bottom m-auto" />
          <p className="text-sm text-center mb-6">
            {user ? (
              <>Logged in as <b>{user.email}</b></>
            ) : (
              <>Already have an account? <Link href={LOGIN_PATH} className="underline text-pink-500">Log In</Link></>
            )}
          </p>

          {!user && (
            <div className="mb-6 flex items-center justify-center gap-2 text-sm">
              <input id="guest" type="checkbox" checked={guest} onChange={(e) => setGuest(e.target.checked)} />
              <label htmlFor="guest">Continue as guest</label>
            </div>
          )}
          <div className="md:max-w-[500px] m-auto">
            <BadgeRow />
          </div>
        </section>

        <div className="grid lg:grid-cols-2 gap-12 mt-8">
          <section>
          {/* Contact Section */}
          <div className="mb-10">
            <h2 className="text-sm font-bold uppercase mb-4">Who is placing the order?</h2>
            <div className="grid grid-cols-1">
              <label className="py-2">First Name</label>
              <input placeholder="Enter First Name" value={firstName} onChange={e => setFirst(e.target.value)} className="border-b py-2 outline-none focus:border-grey" />
              <label className="pb-2 pt-4">Last Name</label>
              <input placeholder="Enter Last Name" value={lastName} onChange={e => setLast(e.target.value)} className="border-b py-2 outline-none focus:border-grey" />
              <label className="pb-2 pt-4">Phone Number</label>
              <input placeholder="Enter your 10 digit mobile number" value={phone} onChange={e => setPhone(e.target.value)} className="border-b py-2 outline-none focus:border-black" />
              <label className="pb-2 pt-4">Email</label>
              <input placeholder="Enter your email ID" value={email} onChange={e => setEmail(e.target.value)} className="border-b py-2 outline-none focus:border-black" />
            </div>
          </div>

          {/* Shipping Section */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold uppercase">Shipping Address</h2>
              {savedAddr && (
                <button onClick={() => setEditingShipping(!editingShipping)} className="text-xs font-bold text-pink-600 underline">
                  {editingShipping ? "Use Saved" : "Edit Address"}
                </button>
              )}
            </div>

            {!editingShipping && savedAddr ? (
              <div className="p-4 border rounded-xl bg-gray-50 text-sm">
                <p className="font-bold">{savedAddr.first_name} {savedAddr.last_name}</p>
                <p>{savedAddr.address1}</p>
                <p>{savedAddr.city}, {savedAddr.state} - {savedAddr.pincode}</p>
                <p>Mobile: {savedAddr.mobile}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1">
                <label className="py-2">Address</label>
                <input placeholder="Enter any address, street etc" value={addr1} onChange={e => setAddr1(e.target.value)} className="border-b py-2 outline-none focus:border-black" />
                <label className="pb-2 pt-4">Apartment, suite, etc. (optional)</label>
                <input placeholder="Enter apartment, suite, etc." value={addr2} onChange={e => setAddr2(e.target.value)} className="border-b py-2 outline-none focus:border-black" />
                <label className="pb-2 pt-4">City</label>
                <input placeholder="Select a city" value={city} onChange={e => setCity(e.target.value)} className="border-b py-2 outline-none focus:border-black" />
                <label className="pb-2 pt-4">Postal Code</label>
                <input placeholder="Enter the zip code of your area" value={pin} onChange={e => setPin(e.target.value)} className="border-b py-2 outline-none focus:border-black" />
                <label className="pb-2 pt-4">State</label>
                <select value={stateVal} onChange={e => setStateVal(e.target.value)} className="border-b py-2 outline-none focus:border-black bg-transparent">
                  <option value="">Select State</option>
                  {INDIA_STATES_AND_UT.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                {/* {user && (
                  <label className="col-span-2 flex items-center gap-2 text-xs font-medium pt-2">
                    <input type="checkbox" checked={saveAsDefault} onChange={e => setSaveAsDefault(e.target.checked)} />
                    Save as default address
                  </label>
                )} */}
              </div>
            )}
          </div>
        </section>
        <aside className="lg:sticky lg:top-10 h-fit">
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
                  <span>{formatINR(cartSummary.shipping_charges)}</span>
                </div>
                {(cartSummary.discount != null) && (cartSummary.discount != 0) && (
                  <div className="flex justify-between text-[#00AF35]">
                    <span>Coupon</span>
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
              onClick={onCheckout}
              disabled={loading}
              className="w-full py-3.5 rounded-full font-semibold font-title transition bg-black text-white hover:bg-pink-600"
            >{loading ? "Processing..." : "Proceed to Payment"}</button>
            <div className="mt-2 text-[12px] text-black text-center">Proceeding here will not deduct any amount.</div>
          </div>
        </aside>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-white p-8 rounded-3xl text-center max-w-xs shadow-2xl">
            <div className="w-12 h-12 border-4 border-black border-t-pink-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="font-bold">{loadingMsg}</p>
            <p className="text-xs text-gray-500 mt-2">Please do not refresh or close this window.</p>
          </div>
        </div>
      )}
    </main>
  );
}