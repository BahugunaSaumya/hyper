// src/lib/firebase/client.ts
// 'use client'; // uncomment if importing directly in Client Components

import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  serverTimestamp,
  doc,
  getDoc,
  collection,
  getDocs,
  query as q,
  type Query,
  type QueryConstraint,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { getStorage, ref as sRef, getDownloadURL } from "firebase/storage";
import * as cache from "../cache"; // 👈 NEW

// ---------------- Config loader (unchanged behavior) ----------------
function loadFirebaseConfig() {
  const json = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (json) {
    try {
      return JSON.parse(json);
    } catch {
      throw new Error("NEXT_PUBLIC_FIREBASE_CONFIG is not valid JSON.");
    }
  }

  const {
    NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
  } = process.env;

  const missing = [
    ["NEXT_PUBLIC_FIREBASE_API_KEY", NEXT_PUBLIC_FIREBASE_API_KEY],
    ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", NEXT_PUBLIC_FIREBASE_PROJECT_ID],
    ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET],
    ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID],
    ["NEXT_PUBLIC_FIREBASE_APP_ID", NEXT_PUBLIC_FIREBASE_APP_ID],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k);

  if (missing.length) {
    throw new Error(
      `Missing required client envs: ${missing.join(", ")}. ` +
        `Get them from Firebase Console → Project settings → General → Your apps (Web).`
    );
  }

  return {
    apiKey:            NEXT_PUBLIC_FIREBASE_API_KEY!,
    authDomain:        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
    projectId:         NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
    storageBucket:     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
    messagingSenderId: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
    appId:             NEXT_PUBLIC_FIREBASE_APP_ID!,
    measurementId:     NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
  };
}

const firebaseConfig = loadFirebaseConfig();

// ---------------- Singletons (unchanged API) ----------------
export const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export { serverTimestamp };

// ---------------- Cache helpers (NEW) ----------------
const DEFAULT_TTL = 60_000;      // 60s fresh
const DEFAULT_SWR = 5 * 60_000;  // 5m serve-stale window

const key = {
  doc: (path: string) => `doc:${path}`,
  qry: (name: string, params?: Record<string, any>) => {
    const qs = params
      ? Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== null)
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .sort()
          .join("&")
      : "";
    return `qry:${name}${qs ? "?" + qs : ""}`;
  },
  gdu: (path: string) => `gdu:${path}`,
};

export async function cachedGetDoc<T = any>(
  path: string,
  { ttlMs = DEFAULT_TTL, swrMs = DEFAULT_SWR }: { ttlMs?: number; swrMs?: number } = {}
): Promise<T | null> {
  const k = key.doc(path);
  return cache.remember<T | null>(k, ttlMs, swrMs, async () => {
    const snap = await getDoc(doc(db, path));
    return snap.exists() ? (snap.data() as T) : null;
  });
}

export async function cachedGetQuery<T = any>(
  queryName: string,
  params: Record<string, any>,
  build: () => Query<T>,
  { ttlMs = DEFAULT_TTL, swrMs = DEFAULT_SWR }: { ttlMs?: number; swrMs?: number } = {}
): Promise<(T & { id: string })[]> {
  const k = key.qry(queryName, params);
  return cache.remember<(T & { id: string })[]>(k, ttlMs, swrMs, async () => {
    const snap = await getDocs(build());
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
  });
}

// Write wrappers with invalidation
export async function setDocCached(
  docPath: string,
  data: any,
  options?: Parameters<typeof setDoc>[2],
  invalidateQueryPrefixes: string[] = []
) {
  const res = await setDoc(doc(db, docPath), data, options as any);
  cache.del(key.doc(docPath));
  invalidateQueryPrefixes.forEach((p) => cache.del(`qry:${p}`));
  return res;
}

export async function addDocCached(
  colPath: string,
  data: any,
  invalidateQueryPrefixes: string[] = []
) {
  const res = await addDoc(collection(db, colPath), data);
  invalidateQueryPrefixes.forEach((p) => cache.del(`qry:${p}`));
  return res;
}

export async function updateDocCached(
  docPath: string,
  data: any,
  invalidateQueryPrefixes: string[] = []
) {
  const res = await updateDoc(doc(db, docPath), data);
  cache.del(key.doc(docPath));
  invalidateQueryPrefixes.forEach((p) => cache.del(`qry:${p}`));
  return res;
}

export async function deleteDocCached(
  docPath: string,
  invalidateQueryPrefixes: string[] = []
) {
  const res = await deleteDoc(doc(db, docPath));
  cache.del(key.doc(docPath));
  invalidateQueryPrefixes.forEach((p) => cache.del(`qry:${p}`));
  return res;
}

// Storage URL memoization (huge win on galleries/PDP)
export async function getCachedDownloadURL(
  storagePath: string,
  ttlMs = 24 * 60 * 60 * 1000,
  swrMs = 7 * 24 * 60 * 60 * 1000
) {
  const k = key.gdu(storagePath);
  return cache.remember<string>(k, ttlMs, swrMs, async () => getDownloadURL(sRef(storage, storagePath)));
}

// Optional typed query builder passthrough
export function buildQuery<T = any>(colPath: string, ...constraints: QueryConstraint[]) {
  return q(collection(db, colPath), ...constraints) as Query<T>;
}

// ---------------- Small auth helper bundle (yours, unchanged) ----------------
export const authApi = {
  loginGoogle: () => signInWithPopup(auth, googleProvider),
  loginEmail:  (email: string, password: string) => signInWithEmailAndPassword(auth, email, password),
  logout:      () => signOut(auth),
  onChange:    (cb: (u: any) => void) => onAuthStateChanged(auth, cb),
};
