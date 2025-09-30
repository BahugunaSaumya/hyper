// src/app/api/razorpay-order/route.ts
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getDb } from "@/lib/firebaseAdmin";
import { getAuth } from "firebase-admin/auth";

export const runtime = "nodejs";

type ClientItem = {
  id: string;
  title?: string;
  size?: string;
  qty: number;
  unitPrice?: number; // hint only; server recomputes
  image?: string;
  slug?: string;
};

type CreateBody = {
  customer: { name?: string; email?: string; phone?: string };
  shippingAddress: {
    country?: string; state?: string; city?: string;
    postal?: string; addr1?: string; addr2?: string;
  };
  items: ClientItem[];
  clientTotals?: { subtotal?: number; shipping?: number; total?: number; currency?: string };
  notes?: Record<string, string>;
};

function pickServerPrice(p: any): number {
  const toNum = (x: any) =>
    x == null || x === "" ? undefined : Number(String(x).replace(/[^\d.]/g, ""));
  const price = toNum(p.price);
  const pre = toNum(p.presalePrice);
  const disc = toNum(p.discountedPrice);
  const mrp = toNum(p.mrp);
  return (price ?? pre ?? disc ?? mrp ?? 0); // RUPEES
}

// ---------- Robust product resolution helpers ----------
function slugify(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function slugFromImagePath(image?: string): string | null {
  // e.g. /assets/models/products/neon-bone-blitz/2.jpg -> neon-bone-blitz
  if (!image) return null;
  const m = image.match(/\/products\/([^/]+)\//i);
  return m?.[1] || null;
}

async function getProductByAnyKey(
  db: FirebaseFirestore.Firestore,
  item: { id?: string; title?: string; image?: string; slug?: string }
) {
  const candidates: string[] = [];

  // raw keys
  if (item.id) candidates.push(item.id);
  if (item.slug) candidates.push(item.slug);

  // normalized forms
  if (item.id) candidates.push(slugify(item.id));
  if (item.title) candidates.push(slugify(item.title));

  // from image path
  const fromImg = slugFromImagePath(item.image);
  if (fromImg) candidates.push(fromImg);

  // de-duplicate while preserving order
  const tried = new Set<string>();
  for (const key of candidates) {
    const k = key.trim();
    if (!k || tried.has(k)) continue;
    tried.add(k);

    // try as document id
    const byId = await db.collection("products").doc(k).get();
    if (byId.exists) return { id: byId.id, data: byId.data()! };

    // try as slug field
    const bySlug = await db.collection("products").where("slug", "==", k).limit(1).get();
    if (!bySlug.empty) {
      const doc = bySlug.docs[0];
      return { id: doc.id, data: doc.data()! };
    }
  }
  return null;
}
// -------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    // Parse JSON (log raw body once if parse fails)
    let body: CreateBody | null = null;
    try {
      body = await req.json();
    } catch {
      const raw = await req.text();
      console.error("[razorpay-order] Could not parse JSON. Raw body:", raw);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!Array.isArray(body?.items) || body.items.length === 0) {
      console.warn("[razorpay-order] No items on request");
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("[razorpay-order] Keys not configured");
      return NextResponse.json({ error: "Razorpay keys not configured" }, { status: 500 });
    }

    const db = getDb();

    // Resolve each cart line to a product by id / slug / normalized / image-derived slug
    const resolved = await Promise.all(
      body.items.map((it) => getProductByAnyKey(db as any, it))
    );

    for (let i = 0; i < resolved.length; i++) {
      if (!resolved[i]) {
        console.warn("[razorpay-order] Product not found; tried id/slug/normalized/image", body.items[i]);
        return NextResponse.json({ error: `Product not found: ${body.items[i].id}` }, { status: 400 });
      }
    }

    const serverItems = resolved.map((doc, idx) => {
      const p = doc!.data;
      const unit = pickServerPrice(p); // RUPEES
      const qty = Math.max(1, Number(body!.items[idx].qty || 0));
      return {
        id: doc!.id,
        title: p.title || body!.items[idx].title || `Item ${idx + 1}`,
        size: body!.items[idx].size || "M",
        qty,
        unitPrice: unit,                                        // RUPEES
        image: p.image || body!.items[idx].image || "",
        slug: p.slug || body!.items[idx].slug || slugify(p.title || body!.items[idx].title || doc!.id),
        _raw: p,
      };
    });

    

    const subtotalRupees = serverItems.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);

    // Clamp shipping to {0|80}
    const clientShip = Number(body.clientTotals?.shipping || 0);
    const shippingRupees = clientShip === 80 ? 80 : 0;

    const currency = (body.clientTotals?.currency || "INR").toUpperCase();
    const totalRupees = subtotalRupees + shippingRupees;

    if (totalRupees <= 0) {
      console.warn("[razorpay-order] Invalid total computed", { subtotalRupees, shippingRupees });
      return NextResponse.json({ error: "Invalid total" }, { status: 400 });
    }

    const amountPaise = Math.round(totalRupees * 100);

    // Try to tag the order with the signed-in user (if a Firebase ID token was sent)
    let ownerUid: string | null = null;
    let ownerEmailLower: string | null = null;
    try {
      const authHeader = req.headers.get("authorization") || "";
      const m = authHeader.match(/^Bearer\s+(.+)$/i);
      if (m) {
        const tok = await getAuth().verifyIdToken(m[1]);
        ownerUid = tok.uid || null;
        ownerEmailLower = (tok.email || "").toLowerCase() || null;
      }
    } catch {
      // no-op; proceed without owner tagging if token missing/invalid
    }
    // Also fall back to the checkout email if provided
    if (!ownerEmailLower && body.customer?.email) {
      ownerEmailLower = String(body.customer.email).toLowerCase();
    }

    // Draft order — store rupees under totals and mirror to hintTotals for client fallback
    const draft = {
      status: "created",
      customer: body.customer || {},
      items: serverItems.map(({ _raw, ...x }) => x),
      totals: {
        subtotal: subtotalRupees,
        shipping: shippingRupees,
        total: totalRupees,
        currency,
      },
      hintTotals: {
        subtotal: subtotalRupees,
        shipping: shippingRupees,
        total: totalRupees,
        currency,
      },
      shippingAddress: body.shippingAddress || null,
      note: body.notes?.source || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      payment: { provider: "razorpay", status: "created", mode: "live" },
      source: "razorpay-order",

      // NEW: owner tagging so /api/me/orders can always find this order
      ownerUid: ownerUid || null,
      ownerEmailLower: ownerEmailLower || null,
    };

    const dbRef = await (db as any).collection("orders").add(draft);
    const orderId = dbRef.id;

    // Razorpay order
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const rzpOrder = await razorpay.orders.create({
      amount: amountPaise,          // PAISE
      currency,
      receipt: `order_rcptid_${orderId}`,
      notes: { ...(body.notes || {}), orderId },
    });

 
    return NextResponse.json(
      {
        ...rzpOrder,
        orderId,
        computed: { subtotal: subtotalRupees, shipping: shippingRupees, total: totalRupees, currency },
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[razorpay-order] error:", err?.message || err);
    return NextResponse.json(
      { error: "Unable to create Razorpay order", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
