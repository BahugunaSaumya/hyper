// scripts/repair-orders.cjs
const { initAdmin } = require("./_firebase-admin");
const fs = require("fs");
const path = require("path");

const APPLY = process.argv.includes("--apply");
const COLLECTION = process.env.ORDERS_COLLECTION || "orders";

function tsMs(v) {
  try {
    if (!v) return 0;
    if (v instanceof Date) return v.getTime();
    if (typeof v === "number") return v;
    if (typeof v === "string") return new Date(v).getTime() || 0;
    if (typeof v.seconds === "number") return v.seconds * 1000;
    if (v.toDate) return v.toDate().getTime();
  } catch {}
  return 0;
}

function moneyTotal(o) {
  const explicit = Number(o?.amounts?.total);
  if (!Number.isNaN(explicit) && explicit > 0) return explicit;
  const paise = Number(o?.payment?.amount);
  if (!Number.isNaN(paise) && paise > 0) return paise / 100;
  if (Array.isArray(o?.items)) {
    return o.items.reduce((sum, it) => {
      const price = Number(it?.unitPrice ?? it?.price ?? 0);
      const qty = Number(it?.qty ?? 1);
      return sum + price * qty;
    }, 0);
  }
  return 0;
}

function normalizeShipping(raw = {}) {
  const s = raw || {};
  const addr1 = s.addr1 ?? s.address1 ?? s.address_line1 ?? s.line1 ?? s.address ?? "";
  const addr2 = s.addr2 ?? s.address2 ?? s.address_line2 ?? s.line2 ?? "";
  const city = s.city ?? s.town ?? s.locality ?? "";
  const state = s.state ?? s.province ?? s.region ?? "";
  const postal = s.postal ?? s.pincode ?? s.zip ?? s.postcode ?? "";
  const country = (s.country ?? s.countryCode ?? s.country_code ?? "IN").toUpperCase();
  return { addr1, addr2, city, state, postal, country };
}

function bestPlacedAt(o) {
  // priority: placedAt > createdAt > payment.verifiedAt > payment.created_at (unix seconds)
  const cands = [
    o?.placedAt,
    o?.createdAt,
    o?.updatedAt,
    o?.payment?.verifiedAt,
    (o?.payment?.created_at ? new Date(o.payment.created_at * 1000) : null),
  ].filter(Boolean);
  const ms = cands.map(tsMs).filter(Boolean).sort((a, b) => a - b);
  return ms.length ? new Date(ms[0]) : null;
}

(async () => {
  const db = initAdmin();
  const snap = await db.collection(COLLECTION).get();

  const plan = [];
  snap.forEach((doc) => {
    const d = doc.data() || {};
    const updates = {};

    // placedAt
    if (!d.placedAt) {
      const p = bestPlacedAt(d);
      if (p) updates.placedAt = p;
    }

    // amounts.total (and ensure currency)
    const total = moneyTotal(d);
    const currency = (d?.amounts?.currency || "INR").toUpperCase();
    if (!d.amounts || Number(d?.amounts?.total) !== total || (d?.amounts?.currency || "") !== currency) {
      updates.amounts = { ...(d.amounts || {}), total, currency };
    }

    // ensure payment.amount in paise if missing and we know total
    if (!d?.payment?.amount && total > 0) {
      updates.payment = { ...(d.payment || {}), amount: Math.round(total * 100) };
    }

    // normalize shipping object (only if any shipping keys exist or section is blank)
    const hasShippingKeys =
      d.shipping && Object.keys(d.shipping).length > 0 ||
      ["address","address1","addr1","line1","city","postal","zip","pincode","state","country"]
        .some((k) => d?.shipping?.[k] || d?.[k]);

    if (hasShippingKeys) {
      const norm = normalizeShipping(d.shipping);
      // only write if it actually changes anything (empty UI often means missing addr1/city/etc.)
      if (
        !d.shipping ||
        ["addr1","city","state","postal","country"]
          .some((k) => (d.shipping?.[k] || "") !== (norm?.[k] || ""))
      ) {
        updates.shipping = { ...(d.shipping || {}), ...norm };
      }
    }

    if (Object.keys(updates).length) {
      plan.push({ id: doc.id, updates });
    }
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(process.cwd(), "backups", "repair-plans");
  fs.mkdirSync(outDir, { recursive: true });
  const planFile = path.join(outDir, `repair-plan-${stamp}.json`);
  fs.writeFileSync(planFile, JSON.stringify(plan, null, 2));
  console.log(`[repair] wrote plan: ${planFile}`);
  console.log(`[repair] ${plan.length} docs need updates. ${APPLY ? "Applying..." : "Dry-run (no writes)."}`);

  if (!APPLY) return;

  // apply in batches of 400
  while (plan.length) {
    const chunk = plan.splice(0, 400);
    const batch = db.batch();
    chunk.forEach(({ id, updates }) => {
      const ref = db.collection(COLLECTION).doc(id);
      batch.set(ref, updates, { merge: true });
    });
    await batch.commit();
    console.log(`[repair] updated ${chunk.length} docs`);
  }
  console.log("[repair] done.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
