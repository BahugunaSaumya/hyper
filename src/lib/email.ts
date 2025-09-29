// src/lib/email.ts
import { NextResponse } from "next/server";
import { Resend } from "resend";

export const runtime = "nodejs";

/**
 * ENV you should set:
 * - RESEND_API_KEY        (required)
 * - RESEND_FROM           e.g. "Hyper Store <orders@yourdomain.com>" (must be a verified sender)
 * - EMAIL_ADMIN           where the admin copy goes
 * - NEXT_PUBLIC_SITE_URL  e.g. "https://gethypergear.in" (used to make absolute links/images)
 * - STORE_NAME / BRAND_NAME / SITE_NAME (optional, for display name)
 */
const RESEND_KEY = process.env.RESEND_API_KEY || "";
const RAW_FROM = process.env.RESEND_FROM || "";
const RAW_ADMIN = process.env.EMAIL_ADMIN || process.env.ADMIN_EMAIL || "";
const BRAND =
  process.env.STORE_NAME ||
  process.env.BRAND_NAME ||
  process.env.SITE_NAME ||
  "Hyper";

// --- normalize base site url (MUST be absolute https for email images) ---
function normalizeBase(u?: string | null) {
  let v = String(u || "").trim();
  if (!v) return "";
  if (!/^https?:\/\//i.test(v)) v = "https://" + v; // ensure scheme
  v = v.replace(/\/+$/g, ""); // strip trailing slashes
  return v;
}
const SITE_URL = normalizeBase(process.env.NEXT_PUBLIC_SITE_URL || process.env.STORE_URL);

function buildFrom(fromRaw: string, brand: string) {
  if (!fromRaw) return "";
  const s = fromRaw.trim();
  return s.includes("<") && s.includes(">") ? s : `${brand} <${s}>`;
}
const FROM_EMAIL = buildFrom(RAW_FROM, BRAND);
const ADMIN_EMAIL = RAW_ADMIN;

const inr = (n: number) => "₹ " + Number(n || 0).toLocaleString("en-IN");

// ---------- UTIL ----------
function escapeHtml(s: any) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
function slugify(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Build absolute, URI-encoded URL from a site-relative path
function absEncode(path: string): string | null {
  if (!SITE_URL) return null;
  const clean = path.startsWith("/") ? path : "/" + path;
  const lowered = clean.replace(/\/+/g, "/");
  return encodeURI(SITE_URL + lowered);
}

// Accept explicit image ONLY if it already matches the canonical product path:
// /assets/models/products/<slug>/<n>.(jpg|jpeg|png|webp)
// Everything else is ignored so we can derive a correct thumbnail.
function canonicalProductsPathOrNull(img?: string | null): string | null {
  if (!img) return null;
  let p = String(img).trim();

  // Absolute URL?
  if (/^https?:\/\//i.test(p)) {
    try {
      const u = new URL(p);
      const lower = u.pathname.toLowerCase();
      if (/^\/assets\/models\/products\/[^/]+\/\d+\.(jpg|jpeg|png|webp)$/i.test(lower)) {
        return encodeURI(u.origin + lower);
      }
    } catch { /* ignore */ }
    return null;
  }

  // Site-relative
  p = p.replace(/^\.\//, "/"); // drop leading "./"
  const lower = p.toLowerCase().replace(/\/+/g, "/");

  if (/^\/assets\/models\/products\/[^/]+\/\d+\.(jpg|jpeg|png|webp)$/i.test(lower)) {
    return absEncode(lower);
  }
  return null;
}

/** Build product image URL for emails (absolute https, encoded).
 *  Strategy:
 *   1) If a canonical product image path is provided, use it (encoded).
 *   2) Else derive slug from slug/productSlug/title → .../<slug>/1.jpg
 *   3) Fallback: try to extract slug from a non-canonical image path.
 */
function itemThumbUrl(it: any): string | null {
  // 1) Canonical explicit path?
  const accepted = canonicalProductsPathOrNull(it?.image);
  if (accepted) return accepted;

  // 2) Derive slug from fields
  let baseSlug: string | null =
    it?.slug || it?.productSlug || (it?.title ? slugify(it.title) : null);

  // 3) Try derive slug from any image path containing /products/<slug>/
  if (!baseSlug && it?.image) {
    const m = String(it.image).toLowerCase().match(/\/products\/([^/]+)\//i);
    baseSlug = m?.[1] || null;
  }

  if (!baseSlug) return null;

  // Always point to your canonical thumbnail: .../<slug>/1.jpg
  return absEncode(`/assets/models/products/${encodeURIComponent(baseSlug)}/1.jpg`);
}

// ---------- NORMALIZATION ----------
function getTotals(order: any) {
  // Prefer rupees under amounts/totals/hintTotals
  const b = order?.amounts || order?.totals || order?.hintTotals || {};
  let subtotal = Number(b.subtotal || 0);
  let shipping = Number(b.shipping || 0);
  let discount = Number(b.discount || 0);
  let tax = Number(b.tax || 0);
  let total = Number(b.total || 0);
  const currency = b.currency || order?.currency || "INR";

  // Legacy fallback: top-level paise
  if (!total && typeof order?.total === "number") {
    total = order.total / 100;
  }
  return { subtotal, shipping, discount, tax, total, currency };
}
function normalizeItems(order: any) {
  const items: any[] = Array.isArray(order?.items) ? order.items : [];
  return items.map((it: any, idx: number) => ({
    title: it.title || it.name || `Item ${idx + 1}`,
    size: it.size || it.variant || undefined,
    qty: Number(it.qty ?? it.quantity ?? 1) || 1,
    // RUPEES (fallback: paise/100)
    unitPrice:
      typeof it.unitPrice === "number"
        ? it.unitPrice
        : typeof it.price === "number"
          ? it.price / 100
          : 0,
    image: it.image,
    slug: it.slug || it.productSlug,
  }));
}

// ---------- HTML RENDERERS ----------
function renderCustomerEmail(order: any, orderId: string) {
  const c = order?.customer || {};
  const ship = order?.shipping || order?.shippingAddress || {};
  const items = normalizeItems(order);
  const { subtotal, shipping, total, currency } = getTotals(order);
  const status = order?.status || "paid";

  const itemRows = items
    .map((it: any, idx: number) => {
      const thumbAbs = itemThumbUrl(it);
      const thumb = thumbAbs
        ? `<img src="${escapeHtml(
            thumbAbs
          )}" alt="" width="48" height="48" style="display:block;border-radius:6px;object-fit:cover" />`
        : `<span style="display:inline-block;width:48px;height:48px;border-radius:6px;background:#f3f4f6;color:#9ca3af;line-height:48px;text-align:center;font-size:12px">${idx +
            1}</span>`;
      return `
      <tr>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle;text-align:center">${thumb}</td>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle">
          ${escapeHtml(it.title)}
          ${it.size ? ` <span style="color:#6b7280">(Size: ${escapeHtml(it.size)})</span>` : ""}
        </td>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle;text-align:center">${it.qty}</td>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle;text-align:right">${inr(it.unitPrice)}</td>
      </tr>`;
    })
    .join("");

  const viewHref = SITE_URL
    ? `${SITE_URL}/order/${encodeURIComponent(orderId)}`
    : "";

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;line-height:1.45">
    <div style="max-width:760px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
      <div style="padding:16px 20px;background:#0f172a;color:#fff">
        <div style="font-size:18px;font-weight:700">${escapeHtml(
          BRAND
        )} — Order confirmed</div>
        <div style="opacity:.95;font-size:13px;margin-top:4px">
          Order ID: <b>${escapeHtml(orderId)}</b>
          • Status: <b style="color:${status === "paid" ? "#22c55e" : "#f59e0b"
        }">${escapeHtml(status)}</b>
        </div>
      </div>

      <div style="padding:16px 20px;background:#ffffff">
        <p style="margin:0 0 10px">Hi ${escapeHtml(c.name || "there")},</p>
        <p style="margin:0 0 16px">
          Thanks for shopping with us! Your order has been received and is being prepared.
          We’ll email you again when it ships.
        </p>

        <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:4px">
          <tr>
            <td style="vertical-align:top;padding:0 0 16px 0">
              <div style="font-weight:600;margin-bottom:6px">Contact</div>
              <div style="font-size:14px;color:#111">${escapeHtml(
                c.name || "-"
              )}</div>
              ${c.email
                ? `<div style="font-size:13px;color:#374151">${escapeHtml(
                    c.email
                  )}</div>`
                : ""
              }
              ${c.phone
                ? `<div style="font-size:13px;color:#374151">${escapeHtml(
                    c.phone
                  )}</div>`
                : ""
              }
            </td>
            <td style="vertical-align:top;padding:0 0 16px 20px">
              <div style="font-weight:600;margin-bottom:6px">Shipping address</div>
              <div style="font-size:14px;color:#111">${escapeHtml(
                ship.addr1 || ship.line1 || "-"
              )}</div>
              ${ship.addr2 || ship.line2
                ? `<div style="font-size:14px;color:#111">${escapeHtml(
                    ship.addr2 || ship.line2
                  )}</div>`
                : ""
              }
              <div style="font-size:13px;color:#374151">
                ${escapeHtml(ship.city || "-")}, ${escapeHtml(
                  ship.state || "-"
                )} ${escapeHtml(ship.postal || ship.postalCode || "-")}
              </div>
              <div style="font-size:13px;color:#374151">${escapeHtml(
                ship.country || "-"
              )}</div>
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
          <tbody>${itemRows ||
            `<tr><td colspan="4" style="padding:12px;text-align:center;border:1px solid #eee;color:#6b7280">No items</td></tr>`
          }</tbody>
        </table>

        <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:10px;font-size:14px">
          <tr><td style="padding:6px 0;color:#374151">Currency</td><td style="padding:6px 0;text-align:right"><b>${escapeHtml(
            currency
          )}</b></td></tr>
          <tr><td style="padding:6px 0;color:#374151">Subtotal</td><td style="padding:6px 0;text-align:right">${inr(
            subtotal
          )}</td></tr>
          <tr><td style="padding:6px 0;color:#374151">Shipping</td><td style="padding:6px 0;text-align:right">${inr(
            shipping
          )}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700">Total</td><td style="padding:6px 0;text-align:right;font-weight:700">${inr(
            total
          )}</td></tr>
        </table>

        ${viewHref
          ? `
          <div style="margin-top:16px">
            <a href="${escapeHtml(
              viewHref
            )}" style="display:inline-block;background:#111;color:#fff;text-decoration:none;padding:10px 14px;border-radius:10px;font-size:14px">
              View your order
            </a>
          </div>
        `
          : ""
        }

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

function renderAdminEmail(order: any, orderId: string) {
  const c = order?.customer || {};
  const ship = order?.shipping || order?.shippingAddress || {};
  const items = normalizeItems(order);
  const { subtotal, shipping, total, currency } = getTotals(order);
  const pay = order?.paymentInfo || order?.payment || {};
  const status = order?.status || "created";

  const itemRows = items
    .map((it: any, idx: number) => {
      const thumbAbs = itemThumbUrl(it);
      const thumb = thumbAbs
        ? `<img src="${escapeHtml(
            thumbAbs
          )}" alt="" width="48" height="48" style="display:block;border-radius:6px;object-fit:cover" />`
        : `<span style="display:inline-block;width:48px;height:48px;border-radius:6px;background:#f3f4f6;color:#9ca3af;line-height:48px;text-align:center;font-size:12px">${idx +
            1}</span>`;
      return `
      <tr>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle;text-align:center">${thumb}</td>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle">${escapeHtml(
          it.title
        )}${it.size ? ` <span style="color:#6b7280">(${escapeHtml(it.size)})</span>` : ""}</td>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle;text-align:center">${it.qty}</td>
        <td style="padding:10px;border:1px solid #eee;vertical-align:middle;text-align:right">${inr(
          it.unitPrice
        )}</td>
      </tr>`;
    })
    .join("");

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;line-height:1.4">
    <div style="max-width:760px;margin:0 auto;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden">
      <div style="padding:16px 20px;background:#0f172a;color:#fff">
        <div style="font-size:18px;font-weight:700">${escapeHtml(
          BRAND
        )} — New order</div>
        <div style="opacity:.9;font-size:13px;margin-top:4px">Order ID: <b>${escapeHtml(
          orderId
        )}</b> • Status: <b style="color:${status === "paid" ? "#22c55e" : "#f59e0b"
        }">${escapeHtml(status)}</b></div>
      </div>

      <div style="padding:16px 20px;background:#fff">
        <table role="presentation" width="100%" style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:top;padding:0 0 16px 0">
              <div style="font-weight:600;margin-bottom:6px">Customer</div>
              <div style="font-size:14px;color:#111">${escapeHtml(
                c.name || "-"
              )}</div>
              <div style="font-size:13px;color:#374151">${escapeHtml(
                c.email || "-"
              )}</div>
              <div style="font-size:13px;color:#374151">${escapeHtml(
                c.phone || "-"
              )}</div>
            </td>
            <td style="vertical-align:top;padding:0 0 16px 20px">
              <div style="font-weight:600;margin-bottom:6px">Shipping</div>
              <div style="font-size:14px;color:#111">${escapeHtml(
                ship.addr1 || ship.line1 || "-"
              )}</div>
              ${ship.addr2 || ship.line2
                ? `<div style="font-size:14px;color:#111">${escapeHtml(
                    ship.addr2 || ship.line2
                  )}</div>`
                : ""
              }
              <div style="font-size:13px;color:#374151">
                ${escapeHtml(ship.city || "-")}, ${escapeHtml(
                  ship.state || "-"
                )} ${escapeHtml(ship.postal || ship.postalCode || "-")}
              </div>
              <div style="font-size:13px;color:#374151">${escapeHtml(
                ship.country || "-"
              )}</div>
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
          <tbody>${itemRows ||
            `<tr><td colspan="4" style="padding:12px;text-align:center;border:1px solid #eee;color:#6b7280">No items</td></tr>`
          }</tbody>
        </table>

        <table role="presentation" width="100%" style="border-collapse:collapse;margin-top:10px;font-size:14px">
          <tr><td style="padding:6px 0;color:#374151">Currency</td><td style="padding:6px 0;text-align:right"><b>${escapeHtml(
            currency
          )}</b></td></tr>
          <tr><td style="padding:6px 0;color:#374151">Subtotal</td><td style="padding:6px 0;text-align:right">${inr(
            subtotal
          )}</td></tr>
          <tr><td style="padding:6px 0;color:#374151">Shipping</td><td style="padding:6px 0;text-align:right">${inr(
            shipping
          )}</td></tr>
          <tr><td style="padding:6px 0;font-weight:700">Total</td><td style="padding:6px 0;text-align:right;font-weight:700">${inr(
            total
          )}</td></tr>
        </table>

        <div style="margin-top:14px">
          <div style="font-weight:600;margin-bottom:6px">Payment</div>
          <table role="presentation" width="100%" style="border-collapse:collapse;font-size:13px">
            <tr><td style="padding:3px 0;color:#374151">Provider</td><td style="padding:3px 0;text-align:right">${escapeHtml(
              pay.provider || "razorpay"
            )}</td></tr>
            <tr><td style="padding:3px 0;color:#374151">Order ID</td><td style="padding:3px 0;text-align:right">${escapeHtml(
              pay.razorpay_order_id || "-"
            )}</td></tr>
            <tr><td style="padding:3px 0;color:#374151">Payment ID</td><td style="padding:3px 0;text-align:right">${escapeHtml(
              pay.razorpay_payment_id || "-"
            )}</td></tr>
            <tr><td style="padding:3px 0;color:#374151">Signature</td><td style="padding:3px 0;text-align:right;word-break:break-all">${escapeHtml(
              pay.razorpay_signature || "-"
            )}</td></tr>
          </table>
        </div>
      </div>
    </div>

    <div style="max-width:760px;margin:10px auto 0;font-size:12px;color:#6b7280;text-align:center">
      Admin copy — sent from ${escapeHtml(BRAND)}.
    </div>
  </div>`;
}

// ---------- PUBLIC sendOrderEmails ----------
export type OrderLike = any;

export async function sendOrderEmails(orderId: string, order: OrderLike) {
  if (!RESEND_KEY) throw new Error("RESEND_API_KEY missing");
  if (!FROM_EMAIL || !FROM_EMAIL.includes("@")) throw new Error("RESEND_FROM invalid/missing");
  if (!ADMIN_EMAIL || !ADMIN_EMAIL.includes("@")) throw new Error("EMAIL_ADMIN / ADMIN_EMAIL invalid/missing");

  const resend = new Resend(RESEND_KEY);
  const status = order?.status || "paid";
  const { total } = getTotals(order);

  // CUSTOMER
  const toCustomer = order?.customer?.email;
  if (toCustomer) {
    const r = await resend.emails.send({
      from: FROM_EMAIL,
      to: toCustomer,
      subject: `Your order ${orderId} is confirmed`,
      html: renderCustomerEmail(order, orderId),
      replyTo: ADMIN_EMAIL,
    });
    if (r.error) throw new Error(`Customer email failed: ${r.error?.message || "unknown"}`);
  }

  // ADMIN
  const r2 = await resend.emails.send({
    from: FROM_EMAIL,
    to: ADMIN_EMAIL,
    subject: `New order: ${orderId} • ${status} • ${inr(total)}`,
    html: renderAdminEmail(order, orderId),
    replyTo: ADMIN_EMAIL,
  });
  if (r2.error) throw new Error(`Admin email failed: ${r2.error?.message || "unknown"}`);
}

// Optional POST handler if you call /api/email-order
export async function POST(req: Request) {
  try {
    const { order, orderId } = await req.json();
    if (!order || !orderId) {
      return NextResponse.json({ error: "Missing order/orderId" }, { status: 400 });
    }
    await sendOrderEmails(orderId, order);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "Email failed", detail: e?.message || String(e) }, { status: 500 });
  }
}
