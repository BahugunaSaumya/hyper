// // src/app/api/razorpay-order/route.ts
// import { NextResponse } from "next/server";
// import Razorpay from "razorpay";

// export async function POST(req: Request) {
//   console.log("[debug] /api/razorpay-order POST called");

//   try {
//     const body = await req.json();
//     const total = body?.total;

//     console.log("[debug] Request body:", body);

//     if (!total || total < 1) {
//       console.error("[error] Invalid amount provided");
//       return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
//     }

//     console.log("[debug] Initializing Razorpay with keys:");
//     console.log("  key_id:", process.env.RAZORPAY_KEY_ID);
//     console.log("  key_secret:", process.env.RAZORPAY_KEY_SECRET ? "***HIDDEN***" : "NOT SET");

//     const razorpay = new Razorpay({
//       key_id: process.env.RAZORPAY_KEY_ID!,
//       key_secret: process.env.RAZORPAY_KEY_SECRET!,
//     });

//     const options = {
//       amount: total * 100, // convert to paise
//       currency: "INR",
//       receipt: `order_rcptid_${Date.now()}`,
//     };

//     console.log("[debug] Creating order with options:", options);

//     const order = await razorpay.orders.create(options);
//     console.log("[server] Razorpay order created:", order);

//     return NextResponse.json(order, { status: 200 });
//   } catch (err: any) {
//     console.error("[server] Razorpay order creation error:", err.message, err.stack || err);
//     return NextResponse.json({ error: "Unable to create Razorpay order", details: err.message }, { status: 500 });
//   }
// }
// -----------VERSION 2
// // src/app/api/razorpay-order/route.ts
// import { NextResponse } from "next/server";

// export async function POST(req: Request) {
//   console.log("[mock] /api/razorpay-order POST called");

//   try {
//     const body = await req.json();
//     const total = body?.total;

//     if (!total || total < 1) {
//       return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
//     }

//     // Instead of calling real Razorpay, we simulate it:
//     const order = {
//       id: "order_" + Math.random().toString(36).substring(2, 12),
//       amount: total * 100,
//       currency: "INR",
//       receipt: `order_rcptid_${Date.now()}`,
//       status: "created",
//       created_at: Date.now(),
//     };

//     console.log("[mock] Returning fake Razorpay order:", order);

//     return NextResponse.json(order, { status: 200 });
//   } catch (err: any) {
//     console.error("[mock] Razorpay order creation error:", err);
//     return NextResponse.json(
//       { error: "Unable to create Razorpay order", details: err.message },
//       { status: 500 }
//     );
//   }
// }
// src/app/api/razorpay-order/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST() {
  const now = Date.now();
  const mock = {
    id: `order_${Math.random().toString(36).slice(2, 12)}`,
    amount: 458700, // paise
    currency: "INR",
    receipt: `order_rcptid_${now}`,
    status: "created",
    created_at: now,
  };
  console.log("[mock] /api/razorpay-order POST called");
  console.log("[mock] Returning fake Razorpay order:", mock);
  return NextResponse.json(mock, { status: 200 });
}
