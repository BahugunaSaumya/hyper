// src/app/api/orders/[id]/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/firebaseAdmin";

export const runtime = "nodejs";

// ---------- helpers ----------
function toMillis(ts: any): number {
  try {
    if (!ts) return 0;
    if (typeof ts === "number") {
      // seconds → ms if 10 digits-ish
      if (ts > 0 && ts < 1e12) return ts * 1000;
      return ts;
    }
    if (typeof ts === "string") {
      const ms = Date.parse(ts);
      return Number.isFinite(ms) ? ms : 0;
    }
    if (ts instanceof Date) return ts.getTime();
    if (typeof ts?.toMillis === "function") return ts.toMillis();
    if (typeof ts?.toDate === "function") return ts.toDate().getTime();

    const seconds =
      (typeof ts?.seconds === "number" ? ts.seconds : undefined) ??
      (typeof ts?._seconds === "number" ? ts._seconds : undefined);
    const nanos =
      (typeof ts?.nanoseconds === "number" ? ts.nanoseconds : undefined) ??
      (typeof ts?._nanoseconds === "number" ? ts._nanoseconds : undefined);

    if (typeof seconds === "number") {
      return seconds * 1000 + (typeof nanos === "number" ? Math.floor(nanos / 1e6) : 0);
    }
  } catch {}
  return 0;
}

function toISO(ts: any): string | null {
  const ms = toMillis(ts);
  if (!ms) return null;
  const d = new Date(ms);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

type ShipOut = { addr1?: string; addr2?: string; city?: string; state?: string; postal?: string; country?: string };

const nonEmpty = (v: any) => typeof v === "string" && v.trim().length > 0;

function normalizeDirectAddress(a: any): ShipOut {
  if (!a || typeof a !== "object") return {};
  const addr1   = a.addr1   ?? a.address1 ?? a.address_line1 ?? a.line1 ?? a.address ?? a.street ?? "";
  const addr2   = a.addr2   ?? a.address2 ?? a.address_line2 ?? a.line2 ?? a.apartment ?? a.flat ?? a.street2 ?? "";
  const city    = a.city    ?? a.town ?? a.locality ?? a.district ?? "";
  const state   = a.state   ?? a.province ?? a.region ?? a.state_code ?? "";
  const postal  = a.postal  ?? a.postalCode ?? a.postcode ?? a.zip ?? a.zipcode ?? a.pincode ?? "";
  // keep original casing (e.g., "India")
  const country = (a.country ?? a.countryCode ?? a.country_code ?? "") as string;
  return { addr1, addr2, city, state, postal, country };
}

function hasMeaningfulAddress(x: ShipOut | null | undefined) {
  if (!x) return false;
  const { addr1, addr2, city, state, postal, country } = x;
  return [addr1, addr2, city, state, postal, country].some(nonEmpty);
}

function resolveShippingAddress(o: any): ShipOut | null {
  // 1) Your current schema: shippingAddress is the address object
  if (o?.shippingAddress && typeof o.shippingAddress === "object") {
    const n = normalizeDirectAddress(o.shippingAddress);
    if (hasMeaningfulAddress(n)) return n;
  }

  // 2) Only treat o.shipping as address if it's an object (NOT the numeric cost)
  if (o?.shipping && typeof o.shipping === "object") {
    const n = normalizeDirectAddress(o.shipping.address || o.shipping);
    if (hasMeaningfulAddress(n)) return n;
  }

  // 3) legacy/common locations
  const candidates = [
    o?.address,
    o?.customer?.address,
    o?.customer?.shipping,
    o?.deliveryAddress,
    o?.fulfillment?.shippingAddress,
    o?.paymentInfo?.shipping,
    o?.paymentInfo?.address,
    o?.paymentInfo?.notes,
    o?.payment?.shipping,
    o?.payment?.address,
    o?.payment?.notes,
    {
      addr1: o?.address1, addr2: o?.address2,
      city: o?.city, state: o?.state,
      postal: o?.postal || o?.zipcode || o?.pincode,
      country: o?.country,
    },
  ];

  for (const c of candidates) {
    if (!c) continue;
    const n = normalizeDirectAddress(c);
    if (hasMeaningfulAddress(n)) return n;
  }

  // 4) array of address lines fallback
  if (Array.isArray(o?.addressLines) && o.addressLines.length) {
    return {
      addr1: o.addressLines[0],
      addr2: o.addressLines.slice(1).join(", "),
      city: "", state: "", postal: "", country: "",
    };
  }

  return null;
}

function itemsSubtotalRu(items: any[]): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, it) => {
    const qty = Number(it?.qty ?? 1) || 1;
    const unit =
      typeof it?.unitPrice === "number"
        ? it.unitPrice
        : typeof it?.price === "number"
          ? it.price / 100 // paise → rupees
          : 0;
    return sum + unit * qty;
  }, 0);
}

function resolveAmounts(o: any) {
  // prefer amounts → totals → hintTotals
  const b: any =
    (o?.amounts && Object.keys(o.amounts).length ? o.amounts : null) ??
    (o?.totals && Object.keys(o.totals).length ? o.totals : null) ??
    (o?.hintTotals && Object.keys(o.hintTotals).length ? o.hintTotals : null) ??
    {};

  const itemsSub = itemsSubtotalRu(o?.items);
  const subtotal = Number(b?.subtotal ?? 0) || itemsSub;
  const shipping = Number(b?.shipping ?? 0) || 0;
  const discount = Number(b?.discount ?? 0) || 0;
  const tax = Number(b?.tax ?? 0) || 0;

  let total = Number(b?.total ?? 0);
  if (!(total > 0)) {
    const composed = Math.max(0, subtotal + shipping + tax - discount);
    const paise = Number(o?.payment?.amount ?? o?.paymentInfo?.amount);
    const payRu = !Number.isNaN(paise) && paise > 0 ? paise / 100 : 0;
    total = Math.max(composed, payRu);
  }
  if (!(total > 0) && typeof o?.total === "number") {
    // ultra-legacy: top-level "total" in paise
    total = o.total / 100;
  }

  return {
    subtotal,
    shipping,
    discount,
    tax,
    total,
    currency: b?.currency ?? o?.currency ?? "INR",
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> } // Next 15: params is a Promise
) {
  try {
    const { id } = await ctx.params;
    const orderId = decodeURIComponent(id || "").trim();
    if (!orderId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const db = getDb();
    const snap = await db.collection("orders").doc(orderId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const o = snap.data() || {};

    // Robust placedAt: prefer placedAt → createdAt → paymentInfo.verifiedAt → updatedAt
    const placedAtISO =
      toISO(o?.placedAt) ||
      toISO(o?.createdAt) ||
      toISO(o?.paymentInfo?.verifiedAt) ||
      toISO(o?.updatedAt) ||
      null;

    // Build normalized payload
    const shippingAddress = resolveShippingAddress(o);
    const amounts = resolveAmounts(o);

    const paymentInfo = o?.paymentInfo || o?.payment || null;

    const payload = {
      id: snap.id,
      orderId: snap.id, // keep both
      placedAt: placedAtISO,
      customer: o?.customer || null,
      // keep legacy 'shipping' only if it's an object (address); otherwise null
      shipping: typeof o?.shipping === "object" ? o.shipping : null,
      shippingAddress: shippingAddress || null,
      items: Array.isArray(o?.items) ? o.items : [],
      amounts,
      paymentInfo,
      status: o?.status || (paymentInfo?.status ?? "paid"),
    };

    return NextResponse.json({ ok: true, order: payload }, { status: 200 });
  } catch (e: any) {
    console.error("[orders/:id] fatal", e?.message || e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
