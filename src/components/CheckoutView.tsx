"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { INDIA_STATES_AND_UT } from "@/lib/india";
import { createOrder } from "@/lib/orders";
import { loadRazorpayScript } from "@/lib/razorpay";
import { LOGIN_PATH } from "@/config/paths";

const parseINR = (v: string) => {
  const n = parseFloat(String(v || "").replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
};
const formatINR = (n: number) => "₹ " + Number(n || 0).toLocaleString("en-IN");
const DEV = process.env.NODE_ENV !== "production";

/* -------- Validators -------- */
const isValidPhone = (s: string) => /^[6-9]\d{9}$/.test(s.trim());
const isValidPinFormat = (s: string) => /^\d{6}$/.test(s.trim());
const isValidEmail = (s: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(s || "").trim());

type Address = {
  name?: string;
  phone?: string;
  street?: string;
  city?: string;
  state?: string;
  postal?: string;
  country?: string;
};

export default function CheckoutView() {
  const router = useRouter();
  const { items, clear } = useCart();
  const { user, profile } = useAuth() as any;

  const [express, setExpress] = useState(false);
  const [guest, setGuest] = useState(false);

  // loading overlay
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState<string>("");
  const startWait = (msg: string) => { setLoading(true); setLoadingMsg(msg); };
  const stepWait = (msg: string) => setLoadingMsg(msg);
  const stopWait = () => { setLoading(false); setLoadingMsg(""); };

  // WHO (contact) form
  const [firstName, setFirst] = useState("");
  const [lastName, setLast] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // Editable address form
  const [pin, setPin] = useState("");
  const [pinHelp, setPinHelp] = useState("Enter a valid 6-digit PIN (e.g., 560001).");
  const [stateVal, setStateVal] = useState("");
  const [city, setCity] = useState("");
  const [addr1, setAddr1] = useState("");
  const [addr2, setAddr2] = useState("");

  // Validation UI flags
  const phoneValid = useMemo(() => isValidPhone(phone), [phone]);
  const emailValid = useMemo(() => isValidEmail(email), [email]);
  const pinFormatValid = useMemo(() => isValidPinFormat(pin), [pin]);

  // PIN verification state (API-backed when editing)
  const [pinStatus, setPinStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");

  // Saved address from Firestore
  const [savedAddr, setSavedAddr] = useState<Address | null>(null);
  const [usingSaved, setUsingSaved] = useState<boolean>(false);
  const [editingShipping, setEditingShipping] = useState<boolean>(false);
  const [saveAsDefault, setSaveAsDefault] = useState<boolean>(true); // default checked when editing

  // Log for sanity
  useEffect(() => {
    console.log("[checkout] user:", user?.uid || null);
    console.log("[checkout] profile (context):", profile);
  }, [user, profile]);

  // Prefill WHO from profile context (best-effort)
  useEffect(() => {
    if (!profile) return;
    const baseName = (profile.name || "").trim();
    if (baseName) {
      const [fn, ...rest] = baseName.split(" ").filter(Boolean);
      setFirst((v) => v || fn || "");
      setLast((v) => v || rest.join(" ") || "");
    }
    setEmail((e) => e || profile.email || user?.email || "");
    setPhone((p) => p || profile.phone || "");
  }, [profile, user?.email]);

  // Fetch authoritative profile from Firestore to get saved address
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const tok = await user.getIdToken?.();
        const res = await fetch("/api/me/profile", {
          headers: { authorization: `Bearer ${tok}` },
          cache: "no-store",
        });
        const body = await res.json().catch(() => null);
        if (!res.ok || !body) return;
        if (cancelled) return;

        // Name/phone/email if not already set
        const nameStr: string = body?.user?.name || profile?.name || "";
        if (nameStr && !(firstName || lastName)) {
          const [fn, ...rest] = nameStr.split(" ").filter(Boolean);
          setFirst(fn || "");
          setLast(rest.join(" ") || "");
        }
        setEmail((e) => e || body?.user?.email || user?.email || "");
        setPhone((p) => p || body?.user?.phone || "");

        if (body.address) {
          const a: Address = body.address || {};
          setSavedAddr(a);
          setUsingSaved(true);
          setEditingShipping(false);

          // Keep form fields in sync (so validation works even if hidden)
          setStateVal(a.state || "");
          setCity(a.city || "");
          setAddr1(a.street || "");
          setAddr2("");
          setPin(a.postal || "");
          setPinStatus("valid"); // saved address assumed valid
        } else {
          setSavedAddr(null);
          setUsingSaved(false);
          setEditingShipping(true); // no saved address => show form
        }
      } catch {
        // ignore network errors
      }
    })();
    return () => { cancelled = true; };
  }, [user, profile?.name]);

  // PIN → format + API verification (only when editing the address form)
  useEffect(() => {
    if (!editingShipping) return;             // don’t verify when using saved
    if (!pinFormatValid) {
      setPinStatus(pin ? "invalid" : "idle");
      setPinHelp("Enter a valid 6-digit PIN (e.g., 560001).");
      return;
    }

    let abort = new AbortController();
    (async () => {
      try {
        setPinStatus("checking");
        setPinHelp("Validating PIN…");
        const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: abort.signal });
        const j = await r.json().catch(() => null);
        if (!j || !Array.isArray(j) || j[0]?.Status !== "Success") {
          setPinStatus("invalid");
          setPinHelp("Could not validate this PIN.");
          return;
        }
        const o = j[0].PostOffice?.[0];
        if (o) {
          setStateVal((s) => s || o.State || "");
          setCity((c) => c || o.District || "");
          setPinHelp(`Detected: ${o.District}, ${o.State}`);
        }
        setPinStatus("valid");
      } catch {
        // If API fails, still require correct format; let user proceed
        setPinStatus("idle");
        setPinHelp("PIN looks OK. (Network issue while verifying)");
      }
    })();

    return () => abort.abort();
  }, [pin, pinFormatValid, editingShipping]);

  // Cart math
  const list = useMemo(() => Object.values(items), [items]);
  const subtotal = useMemo(
    () => list.reduce((s: number, it: any) => s + parseINR(it.price) * it.quantity, 0),
    [list]
  );
  const shipping = express ? 80 : 0;
  const total = subtotal + shipping;

  // Helpers
  function shippingFromState(): { country: string; state: string; city: string; postal: string; addr1: string; addr2: string } {
    if (usingSaved && savedAddr && !editingShipping) {
      return {
        country: savedAddr.country || "India",
        state: savedAddr.state || "",
        city: savedAddr.city || "",
        postal: savedAddr.postal || "",
        addr1: savedAddr.street || "",
        addr2: "",
      };
    }
    return {
      country: "India",
      state: stateVal,
      city,
      postal: pin,
      addr1,
      addr2,
    };
  }

  function nameFromState() {
    const nm = (firstName + " " + lastName).trim() || savedAddr?.name || profile?.name || "";
    return nm.trim();
  }

  function need(): string | null {
    const ship = shippingFromState();
    const req: [string, string][] = [
      [nameFromState(), "Full name"],
      [phone, "Mobile"],
      [email, "Email"],
      [ship.state, "State / UT"],
      [ship.city, "City / District"],
      [ship.addr1, "Address line 1"],
      [ship.postal, "PIN"],
    ];
    for (const [v, label] of req) if (!String(v || "").trim()) return label;

    if (!isValidPhone(phone)) return "Valid mobile (10 digits starting 6–9)";
    if (!isValidEmail(email)) return "Valid email address";

    // PIN: format must be valid; if editing, also require either verified or “idle” (network), not “invalid”
    const pinOk = isValidPinFormat(ship.postal || "");
    if (!pinOk) return "Valid 6-digit PIN code";

    if (editingShipping && pinStatus === "invalid") return "A serviceable PIN code";

    return null;
  }

  function makeOrderNo() {
    const d = new Date(),
      y = ("" + d.getFullYear()).slice(-2),
      m = ("0" + (d.getMonth() + 1)).slice(-2),
      day = ("0" + d.getDate()).slice(-2);
    return `HYP-${y}${m}${day}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }

  async function maybePersistAddress() {
    if (!user) return;
    if (!(editingShipping && saveAsDefault)) return;

    try {
      const tok = await user.getIdToken?.();
      const body = {
        address: {
          name: nameFromState(),
          phone,
          street: addr1,
          city,
          state: stateVal,
          postal: pin,
          country: "IN",
        } as Address,
      };
      fetch("/api/me/profile", {
        method: "PUT",
        headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
        body: JSON.stringify(body),
      }).catch(() => { });
    } catch { /* ignore */ }
  }

  async function onCheckout() {
    const missing = need();
    if (missing) { alert(`Please fill: ${missing}`); return; }
    if (!list.length) { alert("Your cart is empty."); return; }

    try {
      startWait("preparing secure checkout…");

      void maybePersistAddress();

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        stopWait();
        alert("Failed to load Razorpay. Please check your network.");
        return;
      }

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

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: total * 100,
        currency: "INR",
        name: "HYPER MMA",
        description: "Order Payment",
        order_id: data.id,
        handler: async (response: any) => {
          try {
            stepWait("verifying payment…");
            const verifyRes = await fetch("/api/razorpay-verify", {
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
          name: nameFromState(),
          email,
          contact: phone,
        },
        theme: { color: "#f472b6" },
      };

      const rzp = new (window as any).Razorpay(options);
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
    const listArr: any[] = Object.values(items);
    const itemsForOrder = listArr.map((it: any) => ({
      id: it.id,
      title: it.name,
      size: it.size,
      qty: it.quantity,
      unitPrice: parseINR(it.price),
      image: it.image,
    }));

    const ship = shippingFromState();

    const payload = {
      userId: user?.uid || null,
      customer: { name: nameFromState(), email, phone },
      shipping: { country: ship.country, state: ship.state, city: ship.city, postal: ship.postal, addr1: ship.addr1, addr2: ship.addr2 },
      items: itemsForOrder,
      amounts: { subtotal, shipping, total, currency: "INR" },
      status: "paid",
      paymentInfo: {
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_signature: paymentResponse.razorpay_signature,
      },
    } as const;

    try {
      stepWait("saving your order…");
      const orderId = await createOrder(payload);
      console.log("[checkout] order saved:", orderId);

      try {
        const snapshot = {
          orderId,
          placedAt: new Date().toISOString(),
          customer: payload.customer,
          shipping: payload.shipping,
          items: payload.items.map((it) => ({
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
            discount: (payload as any).amounts?.discount ?? undefined,
            tax: (payload as any).amounts?.tax ?? 0,
            total: payload.amounts.total,
            currency: payload.amounts.currency,
          },
          paymentInfo: {
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
          },
        };
        sessionStorage.setItem("lastOrderSnapshot", JSON.stringify(snapshot));
      } catch (e) {
        console.warn("[checkout] failed to write lastOrderSnapshot:", e);
      }

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
    try {
      const pingId = await createOrder({
        userId: null,
        customer: { name: "Dev Ping", email: "dev@ping" },
        shipping: { country: "India", state: "Karnataka", city: "Bengaluru", postal: "560001", addr1: "-", addr2: "" },
        items: [],
        amounts: { subtotal: 0, shipping: 0, total: 0, currency: "INR" },
        status: "created",
      } as any);
      console.log("[checkout] dev ping ok — order id:", pingId);
      alert(`Firestore OK. Dev ping order id: ${pingId}`);
    } catch (e) {
      console.error("[checkout] dev ping failed:", e);
      alert("Firestore write failed. Check console for details.");
    }
  }

  // ---- UI
  return (
    <section className="px-6 py-12 max-w-6xl mx-auto bg-white text-black">
      <h1 className="text-3xl font-bold mb-1 text-center">CHECK OUT</h1>
      <p className="text-sm text-center mb-6">
        {user ? (
          <>Logged in as <b>{user.email}</b></>
        ) : (
          <>Already have an account? <Link href={LOGIN_PATH} className="underline">Log In</Link></>
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
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
            inputMode="tel"
            placeholder="10 digit mobile number"
            className={`border-b py-2 outline-none ${phone && !phoneValid ? "border-red-500" : ""}`}
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email address"
            className={`border-b py-2 outline-none ${email && !emailValid ? "border-red-500" : ""}`}
          />
        </div>
        {!phoneValid && phone ? <p className="text-xs text-red-600 mt-1">Enter a valid 10-digit Indian mobile starting with 6–9.</p> : null}
        {!emailValid && email ? <p className="text-xs text-red-600 mt-1">Please enter a valid email address.</p> : null}
      </section>

      {/* ADDRESS */}
      <section className="mb-10">
        <h2 className="text-lg font-bold mb-4 uppercase">Shipping Address</h2>

        {/* Read-only saved address (if available & not editing) */}
        {user && savedAddr && usingSaved && !editingShipping ? (
          <div className="rounded-2xl border p-4 flex items-start justify-between gap-4">
            <div className="text-sm">
              <div className="font-semibold">{savedAddr.name || nameFromState() || "—"}</div>
              <div className="text-gray-600">{phone || savedAddr.phone || "—"}</div>
              <div className="mt-2">
                <div>{savedAddr.street}</div>
                <div>{[savedAddr.city, savedAddr.state].filter(Boolean).join(", ")} {savedAddr.postal}</div>
                <div>{savedAddr.country || "India"}</div>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingShipping(true);
                setUsingSaved(false);
                setSaveAsDefault(true);
              }}
              className="text-xs px-3 py-1.5 rounded-full border hover:bg-black hover:text-white"
            >
              Change
            </button>
          </div>
        ) : (
          // Editable address form
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <select value="India" className="border-b py-2 outline-none" onChange={() => { }}>
              <option value="India">India</option>
            </select>

            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              placeholder="PIN code (6 digits)"
              className={`border-b py-2 outline-none ${pin && !pinFormatValid ? "border-red-500" : ""}`}
            />
            <div className="md:col-span-2 text-xs">
              <span className={
                pinStatus === "invalid" ? "text-red-600" :
                  pinStatus === "valid" ? "text-green-600" :
                    "text-gray-500"
              }>
                {pinHelp}
              </span>
            </div>

            <select value={stateVal} onChange={(e) => setStateVal(e.target.value)} className="border-b py-2 outline-none">
              <option value="">Select state / union territory</option>
              {INDIA_STATES_AND_UT.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City / District" className="border-b py-2 outline-none" />
            <input value={addr1} onChange={(e) => setAddr1(e.target.value)} placeholder="House / Street / Area" className="border-b py-2 outline-none md:col-span-2" />
            <input value={addr2} onChange={(e) => setAddr2(e.target.value)} placeholder="Address line 2 (apt, suite, etc.)" className="border-b py-2 outline-none md:col-span-2" />

            {user && (
              <label className="md:col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={saveAsDefault}
                  onChange={(e) => setSaveAsDefault(e.target.checked)}
                />
                <span>Save this as my default address</span>
              </label>
            )}
          </div>
        )}
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

      {/* overlay */}
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
    </section>
  );
}
