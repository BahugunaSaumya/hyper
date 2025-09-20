import * as admin from "firebase-admin";
export const runtime = "nodejs";

let app: admin.app.App;
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error("[firebaseAdmin] Missing envs. Check .env.local.");
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    // databaseURL: process.env.FIREBASE_DATABASE_URL, // only if you use RTDB
  });
} else {
  app = admin.app();
}

export function getDb() { return app.firestore(); }
export function getAuth() { return app.auth(); }
