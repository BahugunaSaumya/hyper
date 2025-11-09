// scripts/purge-nonlive.js
const fs = require("fs");
const path = require("path");
const { initAdmin } = require("./_firebase-admin");
const { spawnSync } = require("child_process");

const ORDERS_COLLECTION = process.env.ORDERS_COLLECTION || "orders";
const OUT_DIR = path.join(process.cwd(), "backups");

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const DRY_RUN = args.has("--dry-run") || !APPLY;
const ASSUME_MISSING_TEST = args.has("--assume-missing-test"); // optional

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

function ensureBackup() {
  console.log("[purge] taking backup before deletion...");
  const r = spawnSync(process.execPath, [path.join("scripts", "backup-orders.js")], {
    stdio: "inherit",
  });
  if (r.status !== 0) {
    console.error("[purge] backup failed; aborting.");
    process.exit(1);
  }
}

async function main() {
  const db = initAdmin();
  if (APPLY) ensureBackup();

  console.log(`[purge] scanning "${ORDERS_COLLECTION}"...`);
  const snap = await db.collection(ORDERS_COLLECTION).get();

  const candidates = [];
  let keep = 0;

  snap.forEach((doc) => {
    const d = doc.data() || {};
    const status = String(d?.status || "").toLowerCase();
    const mode = String(d?.payment?.mode || "").toLowerCase() || null;

    const isPaid = status === "paid";
    const isLive = mode === "live";
    const isUnknownMode = !mode;

    // Default safety: keep unknown mode
    const shouldDelete =
      !(isPaid && isLive) &&
      (isUnknownMode ? (ASSUME_MISSING_TEST ? true : false) : true);

    if (shouldDelete) {
      candidates.push({
        id: doc.id,
        status,
        mode: mode || "unknown",
        createdAt: tsMs(d.createdAt),
        updatedAt: tsMs(d.updatedAt),
        total:
          Number(d?.amounts?.total) ||
          (Number(d?.payment?.amount) ? Number(d.payment.amount) / 100 : 0),
        raw: d,
      });
    } else {
      keep++;
    }
  });

  // Sort candidates by createdAt asc for deterministic batching
  candidates.sort((a, b) => a.createdAt - b.createdAt);

  console.log(`[purge] total docs: ${snap.size}`);
  console.log(`[purge] will KEEP:  ${keep}`);
  console.log(
    `[purge] ${DRY_RUN ? "would delete" : "deleting"}: ${candidates.length} (criteria: NOT both paid + live${
      ASSUME_MISSING_TEST ? ", treating missing mode as test" : ", missing mode is kept"
    })`
  );

  // Save a list of would-be-deleted docs
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outDir = path.join(OUT_DIR, "purge-plans");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const planFile = path.join(outDir, `purge-plan-${stamp}.json`);
  fs.writeFileSync(
    planFile,
    JSON.stringify(
      candidates.map(({ id, status, mode, total, createdAt, updatedAt }) => ({
        id,
        status,
        mode,
        total,
        createdAt,
        updatedAt,
      })),
      null,
      2
    )
  );
  console.log(`[purge] wrote plan: ${planFile}`);

  if (DRY_RUN) {
    console.log("[purge] dry-run mode; no deletes performed.");
    return;
  }

  // Write a full backup of the to-be-deleted docs
  const binFile = path.join(OUT_DIR, `deleted-orders-${stamp}.json`);
  fs.writeFileSync(
    binFile,
    JSON.stringify(
      candidates.map((c) => ({ id: c.id, ...c.raw })),
      null,
      2
    )
  );
  console.log(`[purge] wrote backup of deletions: ${binFile}`);

  // Batch delete in chunks of 400
  const BATCH_SIZE = 400;
  let deleted = 0;

  while (candidates.length) {
    const chunk = candidates.splice(0, BATCH_SIZE);
    const batch = db.batch();
    chunk.forEach((c) => {
      const ref = db.collection(ORDERS_COLLECTION).doc(c.id);
      batch.delete(ref);
    });
    await batch.commit();
    deleted += chunk.length;
    console.log(`[purge] deleted ${deleted}...`);
  }

  console.log("[purge] done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
