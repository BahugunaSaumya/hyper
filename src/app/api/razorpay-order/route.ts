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

type ClientTotals = {
  subtotal?: number;
  shipping?: number;
  tax?: number;
  total?: number;
  currency?: string;
};

function slugify(x: string) {
  return (x || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function slugFromImagePath(image?: string): string | null {
  if (!image) return null;
  const m = image.match(/\/products\/([^/]+)\//i);
  return m?.[1] || null;
}

async function getProductByAnyKey(
  db: FirebaseFirestore.Firestore,
  item: { id?: string; title?: string; image?: string; slug?: string }
) {
  const candidates: string[] = [];
  if (item.id) candidates.push(item.id);
  if (item.slug) candidates.push(item.slug);

  if (item.id) candidates.push(slugify(item.id));
  if (item.title) candidates.push(slugify(item.title));

  const fromImg = slugFromImagePath(item.image);
  if (fromImg) candidates.push(fromImg);

  for (const key of Array.from(new Set(candidates))) {
    const byId = await db.collection("products").doc(key).get();
    if (byId.exists) return { id: byId.id, ...(byId.data() || {}) };

    const bySlug = await db
      .collection("products")
      .where("slug", "==", key)
      .limit(1)
      .get();
    if (!bySlug.empty) return { id: bySlug.docs[0].id, ...(bySlug.docs[0].data() || {}) };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    let body: {
      items: ClientItem[];
      customer?: { name?: string; email?: string; phone?: string };
      shippingAddress?: { country?: string; state?: string; city?: string; postal?: string; addr1?: string; addr2?: string };
      clientTotals?: ClientTotals; // hint only
      notes?: Record<string, any>;
    };

    try {
      body = await req.json();
    } catch {
      const raw = await req.text();
      console.error("[razorpay-order] Could not parse JSON. Raw body:", raw);
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!Array.isArray(body?.items) || body.items.length === 0) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }

    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Razorpay keys not configured" }, { status: 500 });
    }

    const db = getDb();

    // Resolve products authoritatively
    const resolved = await Promise.all(body.items.map((it) => getProductByAnyKey(db as any, it)));
    for (let i = 0; i < resolved.length; i++) {
      if (!resolved[i]) {
        return NextResponse.json({ error: `Product not found: ${body.items[i].id}` }, { status: 400 });
      }
    }

    const serverItems = body.items.map((it, i) => {
      const p = resolved[i] as any;
      // your products hold unitPrice in rupees
      const unitPrice = Number(p?.salePrice ?? p?.unitPrice ?? p?.price ?? it.unitPrice ?? 0);
      const qty = Math.max(1, Number(it.qty || 0));
      return {
        id: p?.id || it.id,
        title: p?.title || it.title || it.id,
        size: it.size || "",
        qty,
        unitPrice, // rupees
        image: it.image || p?.image || null,
      };
    });

    const subtotalRupees = serverItems.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);

    // shipping: keep your rule (80 for express, else 0). We trust the client hint to decide express.
    const clientShip = Number(body.clientTotals?.shipping || 0);
    const shippingRupees = clientShip === 80 ? 80 : 0;

    const currency = (body.clientTotals?.currency || "INR").toUpperCase();

    // GST (5%) on (subtotal + shipping)
    const gstBase = subtotalRupees + shippingRupees;
    const gstRupees = Math.round(gstBase * 0.05);
    const totalRupees = subtotalRupees + shippingRupees + gstRupees;
    const amountPaise = Math.round(totalRupees * 100);

    if (!(amountPaise > 0)) {
      return NextResponse.json({ error: "Invalid total" }, { status: 400 });
    }

    // Associate user (optional)
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
    } catch {}

    // Create Razorpay order
    const rzp = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });

    const rzpOrder = await rzp.orders.create({
      amount: amountPaise,
      currency,
      notes: {
        ...(body.notes || {}),
        ownerUid,
        ownerEmailLower,
        createdFrom: "api/razorpay-order",
        gstPercent: 5,
        gstRupees,
      },
    });

    return NextResponse.json(
      {
        ...rzpOrder,
        orderId: rzpOrder.id,
        computed: {
          subtotal: subtotalRupees,
          shipping: shippingRupees,
          gst: gstRupees,
          total: totalRupees,
          currency,
        },
        items: serverItems, // echo for reconciliation if needed
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
