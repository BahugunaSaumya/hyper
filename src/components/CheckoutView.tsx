"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";              // <-- AuthProvider
import { INDIA_STATES_AND_UT } from "@/lib/india";            // <-- full list
import { createOrder, type OrderItem, type OrderPayload } from "@/lib/orders";
import { loadRazorpayScript } from "@/lib/razorpay";

import FaqSection from "./FaqSection";
import ContactSection from "./ContactSection";

const parseINR = (v: string) => { const n = parseFloat(String(v || "").replace(/[^0-9.]/g, "")); return isNaN(n) ? 0 : n; };
const formatINR = (n: number) => "₹ " + Number(n || 0).toLocaleString("en-IN");
const DEV = process.env.NODE_ENV !== "production";

export default function CheckoutView() {
  const router = useRouter();
  const { clear } = useCart();
  const { items } = useCart();
  const { user, profile, saveProfile } = useAuth();           // <-- prefill/save
  const [express, setExpress] = useState(false);
  const [guest, setGuest] = useState(false);

  // ---- loading overlay state (new)
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState<string>("");

  const startWait = (msg: string) => { setLoading(true); setLoadingMsg(msg); };
  const stepWait = (msg: string) => setLoadingMsg(msg);
  const stopWait = () => { setLoading(false); setLoadingMsg(""); };

  // form state
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [pin, setPin] = useState("");
  const [pinHelp, setPinHelp] = useState("Enter a valid 6-digit PIN (e.g., 560001).");
  const [stateVal, setStateVal] = useState("");
  const [city, setCity] = useState("");
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");

  // log auth/profile on load
  useEffect(() => {
    console.log("[checkout] auth user:", user?.uid || null);
    console.log("[checkout] loaded profile:", profile);
  }, [user, profile]);

  // prefill when logged in
  useEffect(() => {
    if (!profile) return;
    const [fn, ...rest] = (profile.name || "").split(" ").filter(Boolean);
    setFirst(fn || "");
    setLast(rest.join(" ") || "");
    setEmail(profile.email || "");
    setPhone(profile.phone || "");
    if (profile.address) {
      setStateVal(profile.address.state || "");
      setCity(profile.address.city || "");
      setAddr1(profile.address.addr1 || "");
      setAddr2(profile.address.addr2 || "");
      setPin(profile.address.postal || "");
    }
  }, [profile]);

  const list = useMemo(() => Object.values(items), [items]);
  const subtotal = useMemo(() => list.reduce((s, it) => s + parseINR(it.price) * it.quantity, 0), [list]);
  const shipping = express ? 80 : 0;
  const total = subtotal + shipping;

  // PIN lookup (safe & logged)
  useEffect(() => {
    if (pin.replace(/\D/g, "").length !== 6) { setPinHelp("Enter a valid 6-digit PIN (e.g., 560001)."); return; }
    let abort = new AbortController();
    (async () => {
      try {
        setPinHelp("Validating PIN…");
        const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: abort.signal });
        const j = await r.json().catch(() => null);
        if (!j || !Array.isArray(j) || j[0]?.Status !== "Success") { setPinHelp("Could not validate this PIN."); return; }
        const o = j[0].PostOffice?.[0];
        if (o) {
          // only fill if empty (don't override user's choice)
          setStateVal((s) => s || o.State || "");
          setCity((c) => c || o.District || "");
          setPinHelp(`Detected: ${o.District}, ${o.State}`);
        }
        console.log("[checkout] PIN lookup result:", j);
      } catch (e) {
        console.error("[checkout] PIN lookup failed:", e);
        setPinHelp("Could not validate this PIN. Please try again.");
      }
    })();
    return () => abort.abort();
  }, [pin]);

  function need(): string | null {
    const req: [string, string][] = [
      [firstName, "First name"], [lastName, "Last name"],
      [phone, "Mobile"], [email, "Email"],
      [stateVal, "State / UT"], [city, "City / District"],
      [addr1, "Address line 1"], [pin, "PIN"],
    ];
    for (const [v, label] of req) if (!String(v || "").trim()) return label;
    return null;
  }

  function makeOrderNo() {
    const d = new Date(), y = ("" + d.getFullYear()).slice(-2), m = ("0" + (d.getMonth() + 1)).slice(-2), day = ("0" + d.getDate()).slice(-2);
    return `HYP-${y}${m}${day}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }

  async function onCheckout() {
    const missing = need();
    if (missing) { alert(`Please fill: ${missing}`); return; }
    if (!list.length) { alert("Your cart is empty."); return; }

    try {
      startWait("preparing secure checkout…");

      // Load Razorpay script
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        stopWait();
        alert("Failed to load Razorpay. Please check your network.");
        return;
      }

      // 1. Create Razorpay order
      stepWait("creating your order…");
      const res = await fetch("/api/razorpay-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ total }),
      });
      const data = await res.json();

      if (!data.id) {
        stopWait();
        alert("Unable to create Razorpay order.");
        return;
      }

      // 2. Razorpay checkout options
      stepWait("opening payment window…");
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: total * 100,
        currency: "INR",
        name: "HYPER MMA",
        description: "Order Payment",
        order_id: data.id,
        handler: async function (response: any) {
          console.log("[client] Razorpay payment response:", response);

          try {
            stepWait("verifying payment…");
            // 3. Verify payment signature
            const verifyRes = await fetch("api/razorpay-verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();

            if (!verifyData.success) {
              stopWait();
              alert("Payment verification failed. Order not saved.");
              return;
            }

            console.log("[client] Payment verified successfully!");

            // 4. Save order to Firestore with status 'paid'
            stepWait("finalizing your order…");
            await saveOrderToFirestore(response);
            clear();
            stopWait();
            router.push(`/thank-you?payment_id=${response.razorpay_payment_id}`);
          } catch (err) {
            console.error(err);
            stopWait();
            alert("Payment verification failed. Order not saved.");
          }
        },
        prefill: {
          name: `${firstName} ${lastName}`,
          email,
          contact: phone,
        },
        theme: { color: "#f472b6" },
      };

      const rzp = new (window as any).Razorpay(options);

      // close/fail → hide overlay
      rzp.on?.("modal.closed", () => stopWait());
      rzp.on?.("payment.failed", () => {
        stopWait();
        alert("Payment failed or cancelled. Please try again.");
      });

      rzp.open();
      stepWait("waiting for payment… complete in the Razorpay window");
    } catch (e) {
      console.error(e);
      stopWait();
      alert("Checkout failed. Please try again.");
    }
  }

  async function saveOrderToFirestore(paymentResponse: any) {
    const itemsForOrder = list.map(it => ({
      id: it.id,
      title: it.name,
      size: it.size,
      qty: it.quantity,
      unitPrice: parseINR(it.price),
      image: it.image,
    }));

    const payload = {
      userId: user?.uid || null,
      customer: { name: `${firstName} ${lastName}`, email, phone },
      shipping: { country: "India", state: stateVal, city, postal: pin, addr1, addr2 },
      items: itemsForOrder,
      amounts: { subtotal, shipping, total, currency: "INR" },
      status: "paid",
      paymentInfo: {
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
      },
    } as const;

    // inside CheckoutView.tsx → function saveOrderToFirestore(paymentResponse: any) { ... }

    try {
      stepWait("saving your order…");
      const orderId = await createOrder(payload);   // <— you already have this
      console.log("[checkout] order saved:", orderId);

      /* ✅ NEW: persist a client-side snapshot for the Thank-You page */
      try {
        const snapshot = {
          orderId,
          placedAt: new Date().toISOString(),
          customer: payload.customer,
          shipping: payload.shipping,
          // items in the exact shape your Thank-You component expects
          items: payload.items.map(it => ({
            id: it.id,
            title: it.title,
            size: it.size,
            qty: it.qty,
            unitPrice: it.unitPrice,
            image: it.image,
          })),
          amounts: {
            subtotal: payload.amounts.subtotal,
            shipping: payload.amounts.shipping,
            // include these if you later add them to your payload
            discount: (payload as any).amounts?.discount ?? undefined,
            tax: (payload as any).amounts?.tax ?? 0,
            total: payload.amounts.total,
            currency: payload.amounts.currency,
          },
          paymentInfo: {
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
            // brand/last4 can be filled later if you fetch them server-side
          },
        };

        // store for the Thank-You page to read
        sessionStorage.setItem("lastOrderSnapshot", JSON.stringify(snapshot));
      } catch (e) {
        // never block checkout if storage fails
        console.warn("[checkout] failed to write lastOrderSnapshot:", e);
      }
      /* ✅ END NEW BLOCK */

      // fire-and-forget email (don’t block the UX)
      stepWait("sending confirmation emails…");
      void fetch("/api/email-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: payload, orderId }),
      }).catch((e) => console.error("[email] failed to queue:", e));

      return orderId;
    } catch (e) {
      console.error("[checkout] Failed to save order:", e);
      throw e;
    }

  }

  async function devPing() {
    // tiny dev-only write so you can see Firestore working without placing an order
    try {
      const pingId = await createOrder({
        userId: null,
        customer: { name: "Dev Ping", email: "dev@ping" },
        shipping: { country: "India", state: "Karnataka", city: "Bengaluru", postal: "560001", addr1: "-", addr2: "" },
        items: [],
        amounts: { subtotal: 0, shipping: 0, total: 0, currency: "INR" },
        status: "created",
      });
      console.log("[checkout] dev ping ok — order id:", pingId);
      alert(`Firestore OK. Dev ping order id: ${pingId}`);
    } catch (e) {
      console.error("[checkout] dev ping failed:", e);
      alert("Firestore write failed. Check console for details.");
    }
  }

  return (
    <section className="px-6 py-12 max-w-6xl mx-auto bg-white text-black">
      <h1 className="text-3xl font-bold mb-1 text-center">CHECK OUT</h1>
      <p className="text-sm text-center mb-6">
        {user ? (
          <>Logged in as <b>{user.email}</b></>
        ) : (
          <>Already have an account? <a href="/login" className="text-pink-500">Log in</a></>
        )}
      </p>

      {!user && (
        <div className="mb-6 flex items-center justify-center gap-2 text-sm">
          <input id="guest" type="checkbox" checked={guest} onChange={(e) => setGuest(e.target.checked)} />
          <label htmlFor="guest">Continue as guest</label>
        </div>
      )}

      {/* WHO */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4 uppercase">Who is placing the order?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input value={firstName} onChange={(e) => setFirst(e.target.value)} placeholder="First name" className="border-b py-2 outline-none" />
          <input value={lastName} onChange={(e) => setLast(e.target.value)} placeholder="Last name" className="border-b py-2 outline-none" />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="10 digit mobile number" className="border-b py-2 outline-none" />
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email address" className="border-b py-2 outline-none" />
        </div>
      </section>

      {/* ADDRESS */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4 uppercase">Shipping Address</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <select defaultValue="India" className="border-b py-2 outline-none">
            <option value="India">India</option>
          </select>

          <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric" maxLength={6} placeholder="PIN code (6 digits)"
            className="border-b py-2 outline-none" />
          <div className="md:col-span-2 text-xs text-gray-500">{pinHelp}</div>

          {/* India states/UT dropdown */}
          <select value={stateVal} onChange={(e) => setStateVal(e.target.value)} className="border-b py-2 outline-none">
            <option value="">Select state / union territory</option>
            {INDIA_STATES_AND_UT.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / District" className="border-b py-2 outline-none" />
          <input value={addr1} onChange={(e) => setAddr1(e.target.value)} placeholder="House / Street / Area" className="border-b py-2 outline-none md:col-span-2" />
          <input value={addr2} onChange={(e) => setAddr2(e.target.value)} placeholder="Address line 2 (apt, suite, etc.)" className="border-b py-2 outline-none md:col-span-2" />
        </div>
      </section>

      {/* SUMMARY */}
      <section className="mb-10 max-w-md pb-3 pt-6">
        <div className="border rounded-xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Subtotal</span><span>{formatINR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm mb-2">
            <span>Shipping</span>
            <span>
              <label className="mr-3">
                <input type="radio" name="ship" checked={!express} onChange={() => setExpress(false)} className="accent-pink-600 mr-1" /> Free
              </label>
              <label>
                <input type="radio" name="ship" checked={express} onChange={() => setExpress(true)} className="accent-pink-600 mr-1" /> Express (+ ₹ 80)
              </label>
            </span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span><span>{formatINR(total)}</span>
          </div>
        </div>
      </section>

      <div className="text-center flex items-center justify-center gap-3 pb-4 pt-4">
        <button
          onClick={onCheckout}
          disabled={loading}
          className={`px-8 py-3 rounded-full font-bold transition
            ${loading ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "bg-black text-white hover:bg-pink-500"}`}
          aria-busy={loading}
        >
          {loading ? "Processing…" : "Proceed to Payment"}
        </button>
        {DEV && (
          <button onClick={devPing}
            className="px-4 py-3 rounded-full border text-sm hover:bg-black hover:text-white transition">
            Run Firestore ping (dev)
          </button>
        )}
      </div>

      {/* pretty loading overlay */}
      {loading && (
        <div className="fixed inset-0 z-[1000] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-2xl bg-white text-black p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
            <h3 className="font-bold text-lg">Hang tight…</h3>
            <p className="text-sm text-gray-600 mt-1">
              {loadingMsg || "we’re finalizing the threads on your gear."}
            </p>
            <p className="text-xs text-gray-400 mt-3">don’t close this tab.</p>
          </div>
        </div>
      )}

      <FaqSection />
      <ContactSection />
    </section>
  );
}
