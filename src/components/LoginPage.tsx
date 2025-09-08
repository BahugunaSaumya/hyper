
// src/app/login/page.tsx
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export default function LoginBoundary() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] grid place-items-center text-sm text-gray-500">
          Loading…
        </div>
      }
    >
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  // your existing login UI code moves here verbatim:
  const { loginEmail, loginGoogle, loading, user } = useAuth();
  const router = useRouter();
  const _qs = useSearchParams(); // if you use it anywhere

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);

  if (!loading && user) router.replace("/checkout");

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-5">
        <h1 className="text-3xl font-extrabold">WELCOME BACK</h1>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email" className="w-full px-4 py-3 border rounded-md" />
        <input value={pw} onChange={e=>setPw(e.target.value)} type="password" placeholder="Password" className="w-full px-4 py-3 border rounded-md" />
        <button
          onClick={async()=>{ try{ await loginEmail(email,pw); router.replace("/checkout"); }catch(e:any){ setErr(e.message);} }}
          className="w-full py-3 rounded-full border-2 border-black font-semibold hover:bg-black hover:text-white transition"
        >LOG IN</button>
        <div className="flex items-center justify-between my-2">
          <hr className="w-1/3"/><span className="text-xs">OR</span><hr className="w-1/3"/>
        </div>
        <button
          onClick={async()=>{ await loginGoogle(); router.replace("/checkout"); }}
          className="w-full py-3 rounded-full border font-semibold hover:bg-black hover:text-white transition"
        >Continue with Google</button>
      </div>
    </div>
  );
}
