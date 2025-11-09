// src/lib/firebase/admin.ts
import * as admin from "firebase-admin";
import type { Bucket } from "@google-cloud/storage"; // 👈 use Bucket from gcloud storage
import * as cache from "./cache";

export const runtime = "nodejs";

let app: admin.app.App;

/**
 * Build credentials from env vars.
 * Supports either:
 * - FIREBASE_SERVICE_ACCOUNT_JSON (inline JSON)
 * - or the trio FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
 * Falls back to Application Default Credentials if none provided.
 */
function buildCredential():
  | admin.credential.Credential
  | undefined {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (inline) {
    try {
      const parsed = JSON.parse(inline);
      return admin.credential.cert(parsed as any);
    } catch (e) {
      console.error("[firebaseAdmin] Could not parse FIREBASE_SERVICE_ACCOUNT_JSON:", e);
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (projectId && clientEmail && privateKey) {
    return admin.credential.cert({ projectId, clientEmail, privateKey } as any);
  }

  // Fall back to ADC (GOOGLE_APPLICATION_CREDENTIALS)
  try {
    return admin.credential.applicationDefault();
  } catch {
    return undefined;
  }
}

function ensureApp() {
  if (app) return app;

  const credential = buildCredential();
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || undefined; // e.g. "hyper-d4b63.appspot.com"

  if (!admin.apps.length) {
    app = admin.initializeApp({
      ...(credential ? { credential } : {}),
      ...(storageBucket ? { storageBucket } : {}),
      // databaseURL: process.env.FIREBASE_DATABASE_URL, // only if using RTDB
    } as admin.AppOptions);
  } else {
    app = admin.app();
  }

  if (!storageBucket) {
    console.warn(
      "[firebaseAdmin] FIREBASE_STORAGE_BUCKET not set. Image uploads to Storage will fail. " +
      "Add FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com to your env."
    );
  }

  return app;
}

export function getDb() {
  return admin.firestore(ensureApp());
}

export function getAuth() {
  return admin.auth(ensureApp());
}

// Return the configured Storage bucket instance.
// NOTE: Type is imported from @google-cloud/storage (firebase-admin doesn't export it)
export function getStorageBucket(): Bucket {
  const a = ensureApp();
  const configured =
    process.env.FIREBASE_STORAGE_BUCKET || a.options.storageBucket;
  if (!configured) {
    throw new Error(
      "Bucket name not specified or invalid. Set FIREBASE_STORAGE_BUCKET (e.g., my-project.appspot.com)."
    );
  }
  // admin.storage() is typed to return admin.storage.Storage; .bucket() returns a gcloud Bucket
  return admin.storage().bucket(configured) as unknown as Bucket;
}

// --------------- Server-side cache helpers (unchanged) ---------------
const DEFAULT_TTL = 60_000;      // 60s
const DEFAULT_SWR = 5 * 60_000;  // 5m

const key = {
  doc: (path: string) => `admin:doc:${path}`,
  qry: (name: string, params?: Record<string, any>) => {
    const qs = params
      ? Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .sort()
          .join("&")
      : "";
    return `admin:qry:${name}${qs ? "?" + qs : ""}`;
  },
};

export async function adminCachedGetDoc<T = any>(
  path: string,
  { ttlMs = DEFAULT_TTL, swrMs = DEFAULT_SWR }: { ttlMs?: number; swrMs?: number } = {}
): Promise<T | null> {
  const db = getDb();
  const k = key.doc(path);
  return cache.remember<T | null>(k, ttlMs, swrMs, async () => {
    const snap = await db.doc(path).get();
    return snap.exists ? (snap.data() as T) : null;
  });
}

export async function adminCachedGetQuery<T = any>(
  queryName: string,
  params: Record<string, any>,
  build: () => FirebaseFirestore.Query<FirebaseFirestore.DocumentData>,
  { ttlMs = DEFAULT_TTL, swrMs = DEFAULT_SWR }: { ttlMs?: number; swrMs?: number } = {}
): Promise<(T & { id: string })[]> {
  const k = key.qry(queryName, params);
  return cache.remember<(T & { id: string })[]>(k, ttlMs, swrMs, async () => {
    const snap = await build().get();
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
  });
}

export async function adminSetDocCached(
  docPath: string,
  data: any,
  options?: FirebaseFirestore.SetOptions,
  invalidateQueryPrefixes: string[] = []
) {
  const db = getDb();
  const res = await db.doc(docPath).set(data, options ?? {});
  cache.del(key.doc(docPath));
  invalidateQueryPrefixes.forEach((p) => cache.del(`admin:qry:${p}`));
  return res;
}

export async function adminUpdateDocCached(
  docPath: string,
  data: Record<string, any>,
  invalidateQueryPrefixes: string[] = []
) {
  const db = getDb();
  const res = await db.doc(docPath).update(data);
  cache.del(key.doc(docPath));
  invalidateQueryPrefixes.forEach((p) => cache.del(`admin:qry:${p}`));
  return res;
}

export async function adminDeleteDocCached(
  docPath: string,
  invalidateQueryPrefixes: string[] = []
) {
  const db = getDb();
  const res = await db.doc(docPath).delete();
  cache.del(key.doc(docPath));
  invalidateQueryPrefixes.forEach((p) => cache.del(`admin:qry:${p}`));
  return res;
}
