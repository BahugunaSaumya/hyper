// scripts/test-firestore.cjs
const { initAdmin } = require("./_firebase-admin");

(async () => {
  const db = initAdmin();
  const col = process.env.ORDERS_COLLECTION || "orders";
  const snap = await db.collection(col).limit(5).get();

  console.log(`[test] project=${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`[test] collection="${col}", docs returned=${snap.size}`);
  snap.forEach((doc) => {
    const d = doc.data() || {};
    console.log(`- ${doc.id} | status=${d.status || "—"} | mode=${d?.payment?.mode || "—"}`);
  });
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
