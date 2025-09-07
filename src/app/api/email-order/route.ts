// src/app/api/email-order/route.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

const FROM_EMAIL = process.env.FROM_EMAIL || "hyperfitness.in@gmail.com";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "hyperfitnesse.in@gmail.com";

const inr = (n: number) => "₹ " + Number(n || 0).toLocaleString("en-IN");

function renderCustomerEmail(order: any, orderId: string) {
  const name = order?.customer?.name || "there";
  const items: any[] = order?.items || [];
  const rows = items.map((it: any) => `
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

function serializeResendError(err: any) {
  if (!err) return undefined;
  // Resend typically gives: { name, message, statusCode, type, ... }
  const { name, message, statusCode, type, ...rest } = err;
  return { name, message, statusCode, type, details: rest };
}

export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("[email-order] missing RESEND_API_KEY");
      return NextResponse.json({ error: "RESEND_API_KEY missing" }, { status: 500 });
    }
    const { order, orderId } = await req.json();
    if (!order || !orderId) {
      return NextResponse.json({ error: "Missing order/orderId" }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const results: Array<{ type: "customer" | "admin"; id?: string; error?: any }> = [];

    // Customer
    const toCustomer = order?.customer?.email;
    if (toCustomer) {
      const r = await resend.emails.send({
  from: process.env.FROM_EMAIL!,      // e.g. orders@hyperfitnesse.in
  to: toCustomer,
  subject: `Your order ${orderId} is confirmed`,
  html: renderCustomerEmail(order, orderId),
  replyTo: process.env.ADMIN_EMAIL,  // routes replies to your Gmail
});

      console.log("[email-order] customer response:", r);
      if (r.error) {
        results.push({ type: "customer", error: serializeResendError(r.error) });
      } else {
        results.push({ type: "customer", id: r.data?.id });
      }
    } else {
      console.log("[email-order] no customer email; skipping customer send");
    }

    // Admin
    const r2 = await resend.emails.send({
  from: process.env.FROM_EMAIL!,      // e.g. orders@hyperfitnesse.in
  to: process.env.ADMIN_EMAIL!,
  subject: `Your order ${orderId} is confirmed`,
  html: renderCustomerEmail(order, orderId),
  replyTo: process.env.ADMIN_EMAIL,  // routes replies to your Gmail
});
    console.log("[email-order] admin response:", r2);
    if (r2.error) {
      results.push({ type: "admin", error: serializeResendError(r2.error) });
    } else {
      results.push({ type: "admin", id: r2.data?.id });
    }

    const ok = results.some(r => r.id);
    if (!ok) {
      return NextResponse.json(
        { error: "All sends failed", results },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    console.error("[email-order] fatal:", e?.message || e);
    return NextResponse.json(
      { error: "Email failed", detail: e?.message || String(e) },
      { status: 500 }
    );
  }
}
