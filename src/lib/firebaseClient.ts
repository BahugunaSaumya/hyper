// 'use client'; // uncomment if you import this directly in Client Components

import { initializeApp, getApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

// 1) Prefer a single JSON env if you like (paste the whole web config JSON)
// NEXT_PUBLIC_FIREBASE_CONFIG='{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"...","measurementId":"G-..."}'
function loadFirebaseConfig() {
  const json = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (json) {
    try {
      return JSON.parse(json);
    } catch {
      throw new Error("NEXT_PUBLIC_FIREBASE_CONFIG is not valid JSON.");
    }
  }

  // 2) Or individual public envs (normal way)
  const {
    NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // optional
  } = process.env;

  const missing = [
    ["NEXT_PUBLIC_FIREBASE_API_KEY", NEXT_PUBLIC_FIREBASE_API_KEY],
    ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", NEXT_PUBLIC_FIREBASE_PROJECT_ID],
    ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET],
    ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID],
    ["NEXT_PUBLIC_FIREBASE_APP_ID", NEXT_PUBLIC_FIREBASE_APP_ID],
  ].filter(([, v]) => !v).map(([k]) => k);

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

export const app  = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const authApi = {
  loginGoogle: () => signInWithPopup(auth, googleProvider),
  loginEmail:  (email: string, password: string) => signInWithEmailAndPassword(auth, email, password),
  logout:      () => signOut(auth),
  onChange:    (cb: (u: any) => void) => onAuthStateChanged(auth, cb),
};
