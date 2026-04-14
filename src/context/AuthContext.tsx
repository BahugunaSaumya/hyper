"use client";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, googleProvider } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  User,
  signOut,
} from "firebase/auth";
import { signInWithRedirect, getRedirectResult } from "firebase/auth";

type Profile = { first_name?: string; last_name?: string; email?: string; mobile?: string; };
type SignupData = { first_name: string; last_name: string; mobile: string; password: string; };

type AuthCtx = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signupEmail: (email: string, password: string, data: SignupData) => Promise<void>;
  loginEmail: (email: string, password: string) => Promise<void>;
  loginGoogle: () => Promise<void>;
  logout: () => Promise<void>;
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
        // Fetch profile from Firestore or MySQL here if needed
        setProfile({ email: u.email || "", first_name: u.displayName?.split(" ")[0] });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          const u = result.user;
          const names = u.displayName?.split(" ") || ["User", ""];
          
          // Sync to MySQL after returning from Google
          await fetch("/api/auth/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              email: u.email, 
              first_name: names[0], 
              last_name: names.slice(1).join(" "),
            })
          });
        }
      } catch (error) {
        console.error("Error handling redirect result:", error);
      }
    };

    handleRedirect();
  }, []);

  const api = useMemo<AuthCtx>(() => ({
    user,
    profile,
    loading,

    async signupEmail(email, password, data) {
      // 1️⃣ Create Firebase user FIRST
      const { user: fbUser } =
        await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(fbUser, {
        displayName: `${data.first_name} ${data.last_name}`,
      });

      // 2️⃣ Now the token EXISTS
      const token = await fbUser.getIdToken();

      // 3️⃣ Sync to MySQL securely
      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email,
          first_name: data.first_name,
          last_name: data.last_name,
          mobile: data.mobile,
          password: password,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "MySQL sync failed");
    },

    async loginEmail(email, password) {
      await signInWithEmailAndPassword(auth, email, password);
    },

    async loginGoogle() {
      try {
        // This will redirect the current page to Google
        await signInWithRedirect(auth, googleProvider);
      } catch (error) {
        console.error("Google Redirect Error:", error);
        throw error;
      }
    },

    async logout() { await signOut(auth); }
  }), [user, profile, loading]);

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}