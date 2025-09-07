// // src/pages/api/razorpay-verify.ts
// import type { NextApiRequest, NextApiResponse } from "next";
// import crypto from "crypto";

// export default function handler(req: NextApiRequest, res: NextApiResponse) {
//   if (req.method !== "POST") {
//     return res.status(405).json({ error: "Method Not Allowed" });
//   }

//   const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

//   if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
//     return res.status(400).json({ error: "Missing payment details" });
//   }

//   const body = `${razorpay_order_id}|${razorpay_payment_id}`;
//   const expectedSignature = crypto
//     .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
//     .update(body.toString())
//     .digest("hex");

//   console.log("[server] Expected Signature:", expectedSignature);
//   console.log("[server] Received Signature:", razorpay_signature);

//   if (expectedSignature === razorpay_signature) {
//     return res.status(200).json({ success: true });
//   } else {
//     return res.status(400).json({ error: "Invalid signature" });
//   }
// }

// src/app/api/razorpay-verify/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    console.log("[mock verify] Received payload:", body);

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    // MOCK: Always pass verification for now
    const result = {
      success: true,
      verified: true,
      mode: "mock",
      message: "Mock verification passed",
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      signature: razorpay_signature,
    };

    console.log("[mock verify] Returning:", result);

    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error("[mock verify] Error processing request:", err.message);
    return NextResponse.json(
      { error: "Unable to verify payment", details: err.message },
      { status: 500 }
    );
  }
}
