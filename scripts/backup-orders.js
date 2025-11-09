// scripts/backup-orders.js
const fs = require("fs");
const path = require("path");
const { initAdmin } = require("./_firebase-admin");

const ORDERS_COLLECTION = process.env.ORDERS_COLLECTION || "orders";
const OUT_DIR = path.join(process.cwd(), "backups");

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function ts(v) {
  try {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "string") return new Date(v).toISOString();
    if (typeof v === "number") return new Date(v).toISOString();
    if (v.toDate) return v.toDate().toISOString();
    if (typeof v.seconds === "number") return new Date(v.seconds * 1000).toISOString();
  } catch {}
  return null;
}

function toCsvRow(fields, obj) {
  return fields.map((f) => {
    const val = f.split(".").reduce((o, k) => (o ? o[k] : undefined), obj);
    const s = typeof val === "object" ? JSON.stringify(val) : String(val ?? "");
    return `"${s.replace(/"/g, '""')}"`;
  }).join(",");
}

async function main() {
  const db = initAdmin();
  ensureDir(OUT_DIR);

  const now = new Date();
  const stamp = now.toISOString().replace(/[:.]/g, "-");
  const fileJson = path.join(OUT_DIR, `orders-${stamp}.json`);
  const fileCsv  = path.join(OUT_DIR, `orders-${stamp}.csv`);
  const fileSum  = path.join(OUT_DIR, `orders-${stamp}.summary.txt`);

  console.log(`[backup] reading "${ORDERS_COLLECTION}"...`);
  const snap = await db.collection(ORDERS_COLLECTION).get();
  const docs = [];
  const summary = {
    total: snap.size,
    byStatus: {},
    byMode: {},
    missingMode: 0,
  };

  snap.forEach((doc) => {
    const data = doc.data() || {};
    const rec = { id: doc.id, ...data };
    rec._normalized = {
      createdAt: ts(data.createdAt),
      updatedAt: ts(data.updatedAt),
      placedAt: ts(data.placedAt),
      status: (data.status || "").toLowerCase(),
      mode: (data?.payment?.mode || "").toLowerCase() || null,
      total:
        Number(data?.amounts?.total) ||
        (Number(data?.payment?.amount) ? Number(data.payment.amount) / 100 : 0),
    };
    docs.push(rec);

    const s = rec._normalized.status || "unknown";
    const m = rec._normalized.mode || "unknown";
    summary.byStatus[s] = (summary.byStatus[s] || 0) + 1;
    summary.byMode[m] = (summary.byMode[m] || 0) + 1;
    if (!rec._normalized.mode) summary.missingMode++;
  });

  fs.writeFileSync(fileJson, JSON.stringify(docs, null, 2));
  console.log(`[backup] wrote JSON: ${fileJson}`);

  // CSV (handy slice of fields)
  const fields = [
    "id",
    "status",
    "payment.mode",
    "_normalized.total",
    "_normalized.createdAt",
    "_normalized.updatedAt",
    "_normalized.placedAt",
    "customer.name",
    "customer.email",
  ];
  const header = fields.join(",");
  const rows = docs.map((d) => toCsvRow(fields, d));
  fs.writeFileSync(fileCsv, [header, ...rows].join("\n"));
  console.log(`[backup] wrote CSV:  ${fileCsv}`);

  // Summary
  const sumLines = [
    `Total orders: ${summary.total}`,
    "",
    "[By status]",
    ...Object.entries(summary.byStatus).map(([k, v]) => `- ${k}: ${v}`),
    "",
    "[By mode]",
    ...Object.entries(summary.byMode).map(([k, v]) => `- ${k}: ${v}`),
    "",
    `Missing payment.mode: ${summary.missingMode}`,
  ];
  fs.writeFileSync(fileSum, sumLines.join("\n"));
  console.log(`[backup] wrote summary: ${fileSum}`);

  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

