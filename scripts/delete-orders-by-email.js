// scripts/delete-orders-by-email.cjs
const { initAdmin } = require("./_firebase-admin");
const fs = require("fs");
const path = require("path");

const APPLY = process.argv.includes("--apply");
const EMAIL = String(process.argv.find(a => a.startsWith("--email="))?.split("=")[1] || "").toLowerCase().replace(/\s+/g,"");
const COLLECTION = process.env.ORDERS_COLLECTION || "orders";

if (!EMAIL) {
  console.error("Usage: node scripts/delete-orders-by-email.cjs --email=user@example.com [--apply]");
  process.exit(1);
}

(async () => {
  const db = initAdmin();
  const qs = await db.collection(COLLECTION).get();

  const targets = [];
  qs.forEach((doc) => {
    const d = doc.data() || {};
    const raw = String(d?.customer?.email || "").toLowerCase().replace(/\s+/g,"");
    if (raw && raw === EMAIL) {
      targets.push({ id: doc.id, data: d });
    }
  });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(process.cwd(), "backups", "delete-by-email");
  fs.mkdirSync(outDir, { recursive: true });
  const planFile = path.join(outDir, `plan-${EMAIL}-${stamp}.json`);
  fs.writeFileSync(planFile, JSON.stringify(targets.map(t => ({ id: t.id })), null, 2));
  console.log(`[delete-by-email] matches: ${targets.length}`);
  console.log(`[delete-by-email] plan: ${planFile}`);

  if (!APPLY) { console.log("[delete-by-email] dry-run (no deletes)"); return; }

  // backup the full docs we will delete
  const backupFile = path.join(outDir, `backup-${EMAIL}-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(targets, null, 2));
  console.log(`[delete-by-email] backup: ${backupFile}`);

  // delete in batches
  while (targets.length) {
    const chunk = targets.splice(0, 400);
    const batch = db.batch();
    chunk.forEach(t => batch.delete(db.collection(COLLECTION).doc(t.id)));
    await batch.commit();
    console.log(`[delete-by-email] deleted ${chunk.length}...`);
  }
  console.log("[delete-by-email] done.");
})().catch(e => {
  console.error(e);
  process.exit(1);
});
