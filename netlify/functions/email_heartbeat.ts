// netlify/functions/email-heartbeat.ts
import type { Handler } from "@netlify/functions";
import { Resend } from "resend";
import admin from "firebase-admin";

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_EMAIL = process.env.EMAIL_ADMIN || "orders@yourdomain.com";
const SITE_NAME = process.env.STORE_NAME || "Your Store";

// Minimal Firebase Admin init (avoid re-init in dev)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(), // or from GOOGLE_APPLICATION_CREDENTIALS
  });
}
const db = admin.firestore();

export const handler: Handler = async () => {
  const now = Date.now();
  const since = now - 12 * 60 * 60 * 1000; // last 12h

  const snap = await db.collection("orders")
    .where("updatedAt", ">", new Date(since))
    .get();

  let ordersCount = 0;
  let totalAmount = 0;
  snap.forEach((d) => {
    const o = d.data() || {};
    ordersCount += 1;
    const amt = typeof o.total === "number" ? o.total : (o.amounts?.total ?? 0);
    totalAmount += Number(amt || 0);
  });

  await resend.emails.send({
    from: process.env.RESEND_FROM || "no-reply@yourdomain.com",
    to: ADMIN_EMAIL,
    subject: `${SITE_NAME} heartbeat — last 12h`,
    text: `Orders: ${ordersCount}\nTotal: ₹${(totalAmount/100).toFixed(2)}\nTime: ${new Date().toISOString()}`,
  });

  return { statusCode: 200, body: "ok" };
};
