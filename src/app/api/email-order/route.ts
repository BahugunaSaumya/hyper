import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

/**
 * ENV
 * - RESEND_API_KEY (required)
 * - RESEND_FROM    (e.g. "orders@yourdomain.com" or "Brand <orders@yourdomain.com>")
 * - EMAIL_ADMIN    (where admin copy goes)
 * - NEXT_PUBLIC_SITE_URL or STORE_URL (for absolute image URLs in emails)
 * - STORE_NAME / BRAND_NAME (optional, for display name)
 */
const RAW_FROM = process.env.RESEND_FROM || "";
const RAW_ADMIN = process.env.EMAIL_ADMIN || "";
const BRAND = process.env.STORE_NAME || process.env.BRAND_NAME || "Hyper";
const SITE_URL =
  (process.env.NEXT_PUBLIC_SITE_URL || process.env.STORE_URL || "").replace(/\/+$/, ""); // no trailing slash

function buildFrom(fromRaw: string, brand: string) {
  if (!fromRaw) return "";
  const s = fromRaw.trim();
  return (s.includes("<") && s.includes(">")) ? s : `${brand} <${s}>`;
}
const FROM_EMAIL = buildFrom(RAW_FROM, BRAND);
const ADMIN_EMAIL = RAW_ADMIN;

const inr = (n: number) => "₹ " + Number(n || 0).toLocaleString("en-IN");

function escapeHtml(s: any) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// --- helpers to build image URL for admin email ---
function slugify(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
function toAbsoluteUrl(pathOrUrl: string | undefined | null): string | null {
  if (!pathOrUrl) return null;
  const v = String(pathOrUrl);
  if (/^https?:\/\//i.test(v)) return v;                  // already absolute
  if (!SITE_URL) return null;                              // cannot absolutize w/o base
  const cleaned = v.startsWith("/") ? v : "/" + v;
  return SITE_URL + cleaned;
}
function itemThumbUrl(it: any): string | null {
  // 1) use explicit image if present
  const explicit = toAbsoluteUrl(it?.image);
  if (explicit) return explicit;

  // 2) build from slug if present
  const baseSlug =
    it?.slug ||
    it?.productSlug ||
    slugify(it?.title || it?.name || "");

  if (!baseSlug) return null;
  return toAbsoluteUrl(`/assets/models/products/${encodeURIComponent(baseSlug)}/1.jpg`);
}

function renderCustomerEmail(order: any, orderId: string) {
  const c = order?.customer || {};
  const ship = order?.shipping || {};
  const items: any[] = order?.items || [];
  const amounts = order?.amounts || {};
  const currency = amounts.currency || "INR";
  const status = order?.status || "paid"; // show paid for the happy path

  const itemRows = items.map((it: any, idx: number) => {
    const thumbAbs = itemThumbUrl(it);
    const thumb = thumbAbs
      ? `<img src="${escapeHtml(thumbAbs)}" alt="" width="48" height="48" style="display:block;border-radius:6px;object-fit:cover" />`
      : `<span style="display:inline-block;width:48px;height:48px;border-radius:6px;background:#f3f4f6;color:#9ca3af;line-height:48px;text-align:center;font-size:12px">${idx + 1}</span>`;
    return `
      <tr>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle;text-align:center">${thumb}</td>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle">
          ${escapeHtml(it.title || it.name || "")}
          ${it.size ? ` <span style="color:#6b7280">(Size: ${escapeHtml(it.size)})</span>` : ""}
        </td>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle;text-align:center">${it.qty ?? 1}</td>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle;text-align:right">${inr(it.unitPrice ?? it.price ?? 0)}</td>
      </tr>
    `;
  }).join("");

  const subtotal = amounts.subtotal ?? order?.subtotal ?? 0;
  const shipping = amounts.shipping ?? order?.shipping ?? 0;
  const total = amounts.total ?? order?.total ?? 0;

  // Optional "View your order" CTA if you have a thank-you/order page URL pattern
  const viewHref = SITE_URL ? `${SITE_URL}/thank-you?orderId=${encodeURIComponent(orderId)}` : "";
  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;line-height:1.45">
    <div style="max-width:760px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
      <!-- header -->
      <div style="padding:16px 20px;background:#0f172a;color:#fff">
        <div style="font-size:18px;font-weight:700">${escapeHtml(BRAND)} — Order confirmed</div>
        <div style="opacity:.95;font-size:13px;margin-top:4px">
          Order ID: <b>${escapeHtml(orderId)}</b>
          • Status: <b style="color:${status === "paid" ? "#22c55e" : "#f59e0b"}">${escapeHtml(status)}</b>
        </div>
      </div>

      <!-- body -->
      <div style="padding:16px 20px;background:#ffffff">
        <p style="margin:0 0 10px">Hi ${escapeHtml(c.name || "there")},</p>
        <p style="margin:0 0 16px">
          Thanks for shopping with us! Your order has been received and is being prepared.
          We’ll email you again when it ships.
        </p>

        <!-- two columns -->
        <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:4px">
          <tr>
            <td style="vertical-align:top;padding:0 0 16px 0">
              <div style="font-weight:600;margin-bottom:6px">Contact</div>
              <div style="font-size:14px;color:#111">${escapeHtml(c.name || "-")}</div>
              ${c.email ? `<div style="font-size:13px;color:#374151">${escapeHtml(c.email)}</div>` : ""}
              ${c.phone ? `<div style="font-size:13px;color:#374151">${escapeHtml(c.phone)}</div>` : ""}
            </td>
            <td style="vertical-align:top;padding:0 0 16px 20px">
              <div style="font-weight:600;margin-bottom:6px">Shipping address</div>
              <div style="font-size:14px;color:#111">${escapeHtml(ship.addr1 || "-")}</div>
              ${ship.addr2 ? `<div style="font-size:14px;color:#111">${escapeHtml(ship.addr2)}</div>` : ""}
              <div style="font-size:13px;color:#374151">
                ${escapeHtml(ship.city || "-")}, ${escapeHtml(ship.state || "-")} ${escapeHtml(ship.postal || "-")}
              </div>
              <div style="font-size:13px;color:#374151">${escapeHtml(ship.country || "-")}</div>
            </td>
          </tr>
        </table>

        <!-- items table -->
        <div style="margin-top:6px;font-weight:600">Items</div>
        <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;margin-top:6px">
          <thead>
            <tr>
              <th style="padding:8px;border:1px solid #eee;text-align:center;width:56px">Img</th>
              <th style="padding:8px;border:1px solid #eee;text-align:left">Product</th>
              <th style="padding:8px;border:1px solid #eee;text-align:center;width:60px">Qty</th>
              <th style="padding:8px;border:1px solid #eee;text-align:right;width:120px">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows || `<tr><td colspan="4" style="padding:12px;text-align:center;border:1px solid #eee;color:#6b7280">No items</td></tr>`}
          </tbody>
        </table>

        <!-- totals -->
        <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:10px;font-size:14px">
          <tr>
            <td style="padding:6px 0;color:#374151">Currency</td>
            <td style="padding:6px 0;text-align:right"><b>${escapeHtml(currency)}</b></td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#374151">Subtotal</td>
            <td style="padding:6px 0;text-align:right">${inr(subtotal)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#374151">Shipping</td>
            <td style="padding:6px 0;text-align:right">${inr(shipping)}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;font-weight:700">Total</td>
            <td style="padding:6px 0;text-align:right;font-weight:700">${inr(total)}</td>
          </tr>
        </table>

        ${viewHref ? `
          <div style="margin-top:16px">
            <a href="${escapeHtml(viewHref)}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:14px">
              View your order
            </a>
          </div>
        ` : ""}

        <p style="margin:18px 0 0;font-size:12px;color:#6b7280">
          Have a question? Just reply to this email and our team will help.
        </p>
      </div>
    </div>

    <div style="max-width:760px;margin:10px auto 0;font-size:12px;color:#6b7280;text-align:center">
      Thank you for choosing ${escapeHtml(BRAND)}.
    </div>
  </div>`;
}


/** Pretty admin email WITH thumbnails (absolute URLs) */
function renderAdminEmail(order: any, orderId: string) {
  const c = order?.customer || {};
  const ship = order?.shipping || {};
  const items: any[] = order?.items || [];
  const amounts = order?.amounts || {};
  const pay = order?.paymentInfo || order?.payment || {};

  const currency = amounts.currency || "INR";
  const status = order?.status || "created";

  const itemRows = items.map((it: any, idx: number) => {
    const thumbAbs = itemThumbUrl(it);
    const thumb = thumbAbs
      ? `<img src="${escapeHtml(thumbAbs)}" alt="" width="48" height="48" style="display:block;border-radius:6px;object-fit:cover" />`
      : `<span style="display:inline-block;width:48px;height:48px;border-radius:6px;background:#f3f4f6;color:#9ca3af;line-height:48px;text-align:center;font-size:12px">${idx + 1}</span>`;
    return `
      <tr>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle;text-align:center">${thumb}</td>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle">${escapeHtml(it.title || it.name || "")}${it.size ? ` <span style="color:#6b7280">(${escapeHtml(it.size)})</span>` : ""}</td>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle;text-align:center">${it.qty ?? 1}</td>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle;text-align:right">${inr(it.unitPrice ?? it.price ?? 0)}</td>
      </tr>
    `;
  }).join("");

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;line-height:1.4">
    <div style="max-width:760px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
      <div style="padding:16px 20px;background:#0f172a;color:#fff">
        <div style="font-size:18px;font-weight:700">${escapeHtml(BRAND)} — New order</div>
        <div style="opacity:.9;font-size:13px;margin-top:4px">Order ID: <b>${escapeHtml(orderId)}</b> • Status: <b style="color:${status === "paid" ? "#22c55e" : "#f59e0b"}">${escapeHtml(status)}</b></div>
      </div>

      <div style="padding:16px 20px;background:#fff">
        <table role="presentation" width="100%" style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:top;padding:0 0 16px 0">
              <div style="font-weight:600;margin-bottom:6px">Customer</div>
              <div style="font-size:14px;color:#111">${escapeHtml(c.name || "-")}</div>
              <div style="font-size:13px;color:#374151">${escapeHtml(c.email || "-")}</div>
              <div style="font-size:13px;color:#374151">${escapeHtml(c.phone || "-")}</div>
            </td>
            <td style="vertical-align:top;padding:0 0 16px 20px">
              <div style="font-weight:600;margin-bottom:6px">Shipping</div>
              <div style="font-size:14px;color:#111">${escapeHtml(ship.addr1 || "-")}</div>
              ${ship.addr2 ? `<div style="font-size:14px;color:#111">${escapeHtml(ship.addr2)}</div>` : ""}
              <div style="font-size:13px;color:#374151">
                ${escapeHtml(ship.city || "-")}, ${escapeHtml(ship.state || "-")} ${escapeHtml(ship.postal || "-")}
              </div>
              <div style="font-size:13px;color:#374151">${escapeHtml(ship.country || "-")}</div>
            </td>
          </tr>
        </table>

        <div style="margin-top:6px;font-weight:600">Items</div>
        <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;margin-top:6px">
          <thead>
            <tr>
              <th style="padding:8px;border:1px solid #eee;text-align:center;width:56px">Img</th>
              <th style="padding:8px;border:1px solid #eee;text-align:left">Product</th>
              <th style="padding:8px;border:1px solid #eee;text-align:center;width:60px">Qty</th>
              <th style="padding:8px;border:1px solid #eee;text-align:right;width:120px">Price</th>
            </tr>
          </thead>
          <tbody>${itemRows || `<tr><td colspan="4" style="padding:12px;text-align:center;border:1px solid #eee;color:#6b7280">No items</td></tr>`}</tbody>
        </table>

        <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:10px;font-size:14px">
          <tr><td style="padding:6px 0;color:#374151">Currency</td><td style="padding:6px 0;text-align:right"><b>${escapeHtml(currency)}</b></td></tr>
          <tr><td style="padding:6px 0;color:#374151">Subtotal</td><td style="padding:6px 0;text-align:right">${inr(amounts.subtotal || 0)}</td></tr>
          <tr><td style="padding:6px 0;color:#374151">Shipping</td><td style="padding:6px 0;text-align:right">${inr(amounts.shipping || 0)}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700">Total</td><td style="padding:6px 0;text-align:right;font-weight:700">${inr(amounts.total || 0)}</td></tr>
        </table>

        <div style="margin-top:14px">
          <div style="font-weight:600;margin-bottom:6px">Payment</div>
          <table role="presentation" width="100%" style="border-collapse:collapse;font-size:13px">
            <tr><td style="padding:3px 0;color:#374151">Provider</td><td style="padding:3px 0;text-align:right">${escapeHtml(pay.provider || "razorpay")}</td></tr>
            <tr><td style="padding:3px 0;color:#374151">Order ID</td><td style="padding:3px 0;text-align:right">${escapeHtml(pay.razorpay_order_id || "-")}</td></tr>
            <tr><td style="padding:3px 0;color:#374151">Payment ID</td><td style="padding:3px 0;text-align:right">${escapeHtml(pay.razorpay_payment_id || "-")}</td></tr>
            <tr><td style="padding:3px 0;color:#374151">Signature</td><td style="padding:3px 0;text-align:right;word-break:break-all">${escapeHtml(pay.razorpay_signature || "-")}</td></tr>
          </table>
        </div>
      </div>
    </div>

    <div style="max-width:760px;margin:10px auto 0;font-size:12px;color:#6b7280;text-align:center">
      This is an automated message for admins of ${escapeHtml(BRAND)}.
    </div>
  </div>`;
}

function serializeResendError(err: any) {
  if (!err) return undefined;
  const { name, message, statusCode, type, ...rest } = err;
  return { name, message, statusCode, type, details: rest };
}

export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "RESEND_API_KEY missing" }, { status: 500 });
    }
    if (!RAW_FROM || !RAW_FROM.includes("@")) {
      return NextResponse.json({ error: "RESEND_FROM invalid/missing" }, { status: 500 });
    }
    if (!ADMIN_EMAIL || !ADMIN_EMAIL.includes("@")) {
      return NextResponse.json({ error: "EMAIL_ADMIN invalid/missing" }, { status: 500 });
    }

    const { order, orderId } = await req.json();
    if (!order || !orderId) {
      return NextResponse.json({ error: "Missing order/orderId" }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const results: Array<{ type: "customer" | "admin"; id?: string; error?: any }> = [];

    // Customer (optional)
    const toCustomer = order?.customer?.email;
    if (toCustomer) {
      const r = await resend.emails.send({
        from: FROM_EMAIL,
        to: toCustomer,
        subject: `Your order ${orderId} is confirmed`,
        html: renderCustomerEmail(order, orderId),
        replyTo: ADMIN_EMAIL,
      });
      if (r.error) results.push({ type: "customer", error: serializeResendError(r.error) });
      else results.push({ type: "customer", id: r.data?.id });
    }

    // Admin (always)
    const r2 = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New order: ${orderId} • ${order?.status || "created"} • ${inr(order?.amounts?.total ?? order?.total ?? 0)}`,
      html: renderAdminEmail(order, orderId),
      replyTo: ADMIN_EMAIL,
    });
    if (r2.error) results.push({ type: "admin", error: serializeResendError(r2.error) });
    else results.push({ type: "admin", id: r2.data?.id });

    if (!results.some(r => r.id)) {
      return NextResponse.json({ error: "All sends failed", results }, { status: 500 });
    }

    return NextResponse.json({ ok: true, results });
  } catch (e: any) {
    return NextResponse.json({ error: "Email failed", detail: e?.message || String(e) }, { status: 500 });
  }
}
