"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db, googleProvider } from "@/lib/firebase/";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  User,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

type Profile = {
  name?: string;
  phone?: string;
  email?: string;
  address?: {
    country?: string;
    state?: string;
    city?: string;
    postal?: string;
    addr1?: string;
    addr2?: string;
  };
};

type AuthCtx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signupEmail: (name: string, email: string, password: string) => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  saveProfile: (p: Profile) => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);
export const useAuth = () => useContext(Ctx)!;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const ref = doc(db, "users", u.uid);
        const snap = await getDoc(ref);
        setProfile((snap.exists() ? (snap.data() as Profile) : {
          name: u.displayName || "",
          email: u.email || "",
        }));
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const api = useMemo<AuthCtx>(() => ({
    user,
    profile,
    loading,
    async signupEmail(name, email, password) {
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      if (name) await updateProfile(user, { displayName: name });
      await setDoc(doc(db, "users", user.uid), { name, email }, { merge: true });
    },
    async loginEmail(email, password) {
      await signInWithEmailAndPassword(auth, email, password);
    },
    async loginGoogle() {
      const { user } = await signInWithPopup(auth, googleProvider);
      // ensure doc exists
      await setDoc(doc(db, "users", user.uid), {
        name: user.displayName || "",
        email: user.email || "",
      }, { merge: true });
    },
    async logout() { await signOut(auth); },
    async saveProfile(p) {
      if (!auth.currentUser) return;
      await setDoc(doc(db, "users", auth.currentUser.uid), p, { merge: true });
      setProfile(prev => ({ ...(prev || {}), ...p }));
    }
  }), [user, profile, loading]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}
