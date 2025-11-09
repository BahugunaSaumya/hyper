// scripts/_firebase-admin.cjs
// Loads env vars and initializes Firebase Admin for Node scripts (CommonJS).

// Load .env first; then .env.local if present (doesn't override existing)
// You can point to another file via ENV_FILE=/path/to/.env
const dotenv = require("dotenv");
dotenv.config({ path: process.env.ENV_FILE || ".env" });
dotenv.config({ path: ".env.local", override: false });

const admin = require("firebase-admin");

let _db = null;

function fail(msg) {
  console.error(`[firebase-admin] ${msg}`);
  process.exit(1);
}

function normalizePrivateKey(raw) {
  if (!raw) return raw;
  // Strip outer quotes if present and convert literal \n to real newlines
  if (raw.startsWith('"') && raw.endsWith('"')) raw = raw.slice(1, -1);
  return raw.replace(/\\n/g, "\n");
}

function initAdmin() {
  if (_db) return _db;

  const projectId = (process.env.FIREBASE_PROJECT_ID || "").trim();
  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY || "");

  if (!projectId) fail("Missing FIREBASE_PROJECT_ID");
  if (!clientEmail) fail("Missing FIREBASE_CLIENT_EMAIL");
  if (!privateKey) fail("Missing FIREBASE_PRIVATE_KEY");

  if (!privateKey.includes("BEGIN PRIVATE KEY")) {
    fail("FIREBASE_PRIVATE_KEY looks malformed (missing BEGIN/END PRIVATE KEY).");
  }

  try {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          project_id: projectId,
          client_email: clientEmail,
          private_key: privateKey,
        }),
      });
    }
  } catch (e) {
    const msg = String(e && e.message ? e.message : e);
    if (!/already exists/i.test(msg)) fail(`init error: ${msg}`);
  }

  _db = admin.firestore();
  return _db;
}

module.exports = { initAdmin };
