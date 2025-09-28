// src/lib/firebase/admin.ts
import * as admin from "firebase-admin";
import * as cache from "./cache";

export const runtime = "nodejs";

let app: admin.app.App;

if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // IMPORTANT: Replace escaped newlines in env var
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error("[firebaseAdmin] Missing envs. Check .env.local.");
  }

  app = admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    // databaseURL: process.env.FIREBASE_DATABASE_URL, // only if using RTDB
  });
} else {
  app = admin.app();
}

export function getDb() { return admin.firestore(app); }
export function getAuth() { return admin.auth(app); }

// --------------- Server-side cache helpers (optional but handy) ---------------
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
