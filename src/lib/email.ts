// src/lib/email.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Configure once here
export const EMAIL_FROM =
  process.env.RESEND_FROM || "no-reply@yourdomain.com"; // must be a verified sender
export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL || "orders@yourdomain.com";
export const SITE_NAME =
  process.env.SITE_NAME || "Your Store";

type AnyObj = Record<string, any>;

export type OrderLike = {
  id: string;
  total?: number;
  currency?: string;
  status?: string;
  items?: Array<{ name?: string; qty?: number; price?: number }>;
  customer?: { email?: string; name?: string; phone?: string };
  shippingAddress?: AnyObj;
  payment?: AnyObj;
} & AnyObj;

function formatMoney(v?: number, currency = "INR") {
  if (typeof v !== "number") return "—";
  try { return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(v/100); }
  catch { return `${v/100} ${currency}`; }
}

function orderLines(order: OrderLike) {
  const items = Array.isArray(order.items) ? order.items : [];
  if (!items.length) return "No items listed.";
  return items.map((it, i) => `• ${it.name || `Item ${i+1}`} × ${it.qty ?? 1} — ${formatMoney(it.price, order.currency)}`).join("\n");
}

function shippingBlock(order: OrderLike) {
  const a = order.shippingAddress || order.address || {};
  const lines = [a.name, a.line1, a.line2, a.city, a.state, a.postalCode, a.country]
    .map((x) => x).filter(Boolean).join("\n");
  return lines || "—";
}

/**
 * Sends both: customer receipt + admin notification.
 * Idempotency is controlled by caller using flags in Firestore.
 */
export async function sendOrderEmails(orderId: string, order: OrderLike) {
  const customerTo = order?.customer?.email;
  const total = formatMoney(order.total, order.currency || "INR");

  const subjectBase = `${SITE_NAME} — Order #${orderId}`;
  const summaryLines = [
    `Order ID: ${orderId}`,
    `Status: ${order.status || "created"}`,
    `Total: ${total}`,
    "",
    "Items:",
    orderLines(order),
    "",
    "Ship to:",
    shippingBlock(order),
  ].join("\n");

  // Customer email
  if (customerTo) {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: customerTo,
      subject: `Thank you! ${subjectBase}`,
      text: [
        `Hi ${order?.customer?.name || ""},`,
        "",
        "Thanks for your order — we’re getting it ready.",
        "",
        summaryLines,
        "",
        "We’ll email you when your order ships.",
        `— ${SITE_NAME}`,
      ].join("\n"),
    });
  }

  // Admin email
  await resend.emails.send({
    from: EMAIL_FROM,
    to: ADMIN_EMAIL,
    subject: `New order — ${subjectBase}`,
    text: [
      "New order received:",
      "",
      summaryLines,
      "",
      `Customer: ${order?.customer?.name || ""} <${customerTo || "no-email"}>`,
      `Phone: ${order?.customer?.phone || "—"}`,
      "",
      "Payment:",
      JSON.stringify(order?.payment || {}, null, 2),
    ].join("\n"),
  });
}

/** Heartbeat / daily digest */
export async function sendOrdersHeartbeatEmail(payload: {
  periodLabel: string; // e.g. "Morning" or "Evening"
  ordersCount: number;
  totalAmount: number; // in paise
  currency?: string;
  extra?: AnyObj;
}) {
  const currency = payload.currency || "INR";
  const total = formatMoney(payload.totalAmount, currency);
  await resend.emails.send({
    from: EMAIL_FROM,
    to: ADMIN_EMAIL,
    subject: `${SITE_NAME} heartbeat — ${payload.periodLabel}`,
    text: [
      `Orders in last window: ${payload.ordersCount}`,
      `Total amount: ${total}`,
      "",
      "Extra:",
      JSON.stringify(payload.extra || {}, null, 2),
    ].join("\n"),
  });
}
