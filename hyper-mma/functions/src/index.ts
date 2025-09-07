// was: import * as functions from "firebase-functions";
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { Resend } from "resend";

admin.initializeApp();
// const db = admin.firestore();

const FROM_EMAIL = (functions.config().email?.from as string) || "shanubahuguna@gmail.com";
const ADMIN_EMAIL = (functions.config().email?.admin as string) || "shanubahuguna@gmail.com";
const resend = new Resend(functions.config().resend.key as string);

// ---- shared renderers (simplify/inline if you want)
const inr = (n: number) => "₹ " + Number(n || 0).toLocaleString("en-IN");
function renderCustomerEmail(order: any, orderId: string) {
  const name = order?.customer?.name || "there";
  const items: any[] = order?.items || [];
  const rows = items.map(it => `
    <tr>
      <td style="padding:8px 12px;border:1px solid #eee">${it.title}${it.size ? ` (${it.size})` : ""}</td>
      <td style="padding:8px 12px;border:1px solid #eee;text-align:center">${it.qty}</td>
      <td style="padding:8px 12px;border:1px solid #eee;text-align:right">${inr(it.unitPrice)}</td>
    </tr>
  `).join("");

  const subtotal = order?.amounts?.subtotal || 0;
  const shipping = order?.amounts?.shipping || 0;
  const total = order?.amounts?.total || 0;

  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
      <h2 style="margin:0 0 12px">Thanks for your order, ${name}!</h2>
      <p style="margin:0 0 16px">Order <b>${orderId}</b> is confirmed.</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px;margin:12px 0">
        <thead>
          <tr>
            <th style="padding:8px 12px;border:1px solid #eee;text-align:left">Product</th>
            <th style="padding:8px 12px;border:1px solid #eee;text-align:center">Qty</th>
            <th style="padding:8px 12px;border:1px solid #eee;text-align:right">Price</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr><td colspan="2" style="padding:8px 12px;border:1px solid #eee;text-align:right">Subtotal</td><td style="padding:8px 12px;border:1px solid #eee;text-align:right">${inr(subtotal)}</td></tr>
          <tr><td colspan="2" style="padding:8px 12px;border:1px solid #eee;text-align:right">Shipping</td><td style="padding:8px 12px;border:1px solid #eee;text-align:right">${inr(shipping)}</td></tr>
          <tr><td colspan="2" style="padding:8px 12px;border:1px solid #eee;text-align:right"><b>Total</b></td><td style="padding:8px 12px;border:1px solid #eee;text-align:right"><b>${inr(total)}</b></td></tr>
        </tfoot>
      </table>
      <p style="font-size:12px;color:#666">We’ll email you again when your order ships.</p>
    </div>
  `;
}

function renderAdminEmail(order: any, orderId: string) {
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
      <h3 style="margin:0 0 10px">New order: ${orderId}</h3>
      <pre style="font-size:12px;background:#f6f6f6;padding:12px;border-radius:8px;white-space:pre-wrap">${
        JSON.stringify(order, null, 2)
      }</pre>
    </div>
  `;
}

function renderStatusEmail(order: any, orderId: string, newStatus: string) {
  const name = order?.customer?.name || "there";
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111">
      <h2 style="margin:0 0 12px">Update for order ${orderId}</h2>
      <p style="margin:0 0 12px">Hi ${name}, your order status is now <b>${newStatus}</b>.</p>
      <p style="font-size:12px;color:#666">We’ll keep you posted with any further updates.</p>
    </div>
  `;
}

// --- Helper to send and log
async function sendEmailSafe(args: { type: string; to: string; subject: string; html: string }) {
  try {
    const r = await resend.emails.send({
      from: FROM_EMAIL,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
    console.log(`[functions-email] ${args.type} sent`, { to: args.to, id: r?.data?.id });
    return { ok: true, id: r?.data?.id };
  } catch (e: any) {
    console.error(`[functions-email] ${args.type} failed`, { to: args.to, error: e?.message || e });
    return { ok: false, error: e?.message || String(e) };
  }
}

// Send on create
export const onOrderCreate = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snap, ctx) => {
    const order = snap.data();
    const orderId = ctx.params.orderId;

    const toCustomer = order?.customer?.email;
    const results: any[] = [];

    if (toCustomer) {
      results.push(await sendEmailSafe({
        type: "customer-new",
        to: toCustomer,
        subject: `Your order ${orderId} is confirmed`,
        html: renderCustomerEmail(order, orderId),
      }));
    } else {
      console.log("[functions-email] order has no customer.email; skipping customer mail");
    }

    results.push(await sendEmailSafe({
      type: "admin-new",
      to: ADMIN_EMAIL,
      subject: `New order received: ${orderId}`,
      html: renderAdminEmail(order, orderId),
    }));

    // mark that we sent the "orderCreated" notifications (idempotency)
    await snap.ref.set({
      emailNotifications: {
        orderCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
        orderCreatedResults: results,
      }
    }, { merge: true });
  });

// Send on status updates (e.g., paid -> shipped)
export const onOrderStatusUpdate = functions.firestore
  .document("orders/{orderId}")
  .onUpdate(async (change, ctx) => {
    const before = change.before.data() || {};
    const after = change.after.data() || {};
    const orderId = ctx.params.orderId;

    const prev = before.status;
    const next = after.status;

    if (prev === next || !next) return;

    // optional: only notify for specific transitions
    const notifyStatuses = new Set(["paid", "processing", "shipped", "delivered"]);
    if (!notifyStatuses.has(next)) return;

    // idempotency guard: if we've already notified on this exact status
    const already = after?.emailNotifications?.statusUpdates?.[next];
    if (already?.sentAt) {
      console.log("[functions-email] status", next, "already notified for", orderId);
      return;
    }

    const toCustomer = after?.customer?.email;
    const results: any[] = [];

    if (toCustomer) {
      results.push(await sendEmailSafe({
        type: `customer-status-${next}`,
        to: toCustomer,
        subject: `Update: order ${orderId} is ${next}`,
        html: renderStatusEmail(after, orderId, next),
      }));
    }

    results.push(await sendEmailSafe({
      type: `admin-status-${next}`,
      to: ADMIN_EMAIL,
      subject: `Order ${orderId} status changed: ${prev || "n/a"} → ${next}`,
      html: `<div style="font-family:system-ui">Order <b>${orderId}</b> status changed: <b>${prev || "n/a"}</b> → <b>${next}</b>.</div>`,
    }));

    await change.after.ref.set({
      emailNotifications: {
        statusUpdates: {
          [next]: {
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            results,
          }
        }
      }
    }, { merge: true });
  });
