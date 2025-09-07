"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function SignupPage() {
  const { signupEmail, loginGoogle } = useAuth();
  const router = useRouter();
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [pw,setPw] = useState("");
  const [err,setErr] = useState<string|null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-5">
        <h1 className="text-3xl font-extrabold">CREATE AN ACCOUNT</h1>
        {err && <div className="text-sm text-red-600">{err}</div>}
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" className="w-full px-4 py-3 border rounded-md"/>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="Email" className="w-full px-4 py-3 border rounded-md"/>
        <input value={pw} onChange={e=>setPw(e.target.value)} type="password" placeholder="Password" className="w-full px-4 py-3 border rounded-md"/>
        <button
          onClick={async()=>{ try{ await signupEmail(name,email,pw); router.replace("/checkout"); }catch(e:any){ setErr(e.message);} }}
          className="w-full py-3 rounded-full border-2 border-black font-semibold hover:bg-black hover:text-white transition"
        >SIGN UP</button>
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
