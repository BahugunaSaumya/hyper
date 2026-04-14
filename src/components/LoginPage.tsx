// src/components/LoginPage.tsx
"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const { loginEmail, loginGoogle, loading } = useAuth() as any;
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("next") || "/dashboard";

  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus({ type: "", message: "" });

    // Validation
    if (!form.email || !form.password) {
      return setStatus({ type: "error", message: "Please fill in all mandatory fields." });
    }

    try {
      setStatus({ type: "info", message: "Authenticating..." });
      await loginEmail(form.email, form.password);
      setStatus({ type: "success", message: "Login successful! Redirecting..." });
      
      // Small delay for user to read success message
      setTimeout(() => router.replace(redirectTo), 1000);
    } catch (err: any) {
      // Firebase standard error mapping
      let msg = "Invalid email or password.";
      if (err.code === "auth/user-not-found") msg = "No account found with this email.";
      if (err.code === "auth/wrong-password") msg = "Incorrect password.";
      
      setStatus({ type: "error", message: msg });
    }
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-white text-black font-sans">
      {/* Visual Side */}
      <aside className="hidden lg:block relative overflow-hidden">
        <img src="/assets/login/signup-gym.png" className="w-full h-full object-contain" alt="Login" />
      </aside>

      {/* Form Side */}
      <section className="flex items-center justify-center p-8 sm:p-16">
        <div className="w-full max-w-sm">
          <header className="mb-10 text-center lg:text-left">
            <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Welcome Back</h1>
            <p className="text-gray-500">
              New here? <Link href="/signup" className="text-pink-600 font-bold hover:underline">Create an account</Link>
            </p>
          </header>

          {/* Feedback Message Area */}
          {status.message && (
            <div className={`mb-6 p-4 rounded-lg text-sm font-semibold border animate-in fade-in slide-in-from-top-2 ${
              status.type === "error" ? "bg-red-50 border-red-200 text-red-600" : 
              status.type === "success" ? "bg-green-50 border-green-200 text-green-600" : 
              "bg-blue-50 border-blue-200 text-blue-600"
            }`}>
              {status.message}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-1">
              <label className="text-md font-black text-gray-400 tracking-widest">Email Address</label>
              <input 
                required
                type="email" 
                className="w-full border-b-2 border-gray-100 py-3 outline-none focus:border-black transition-all bg-transparent"
                placeholder="name@example.com"
                onChange={e => setForm({...form, email: e.target.value})} 
              />
            </div>

            <div className="space-y-1 relative">
              <label className="text-md font-black text-gray-400 tracking-widest">Password</label>
              <input 
                required
                type={showPassword ? "text" : "password"} 
                className="w-full border-b-2 border-gray-100 py-3 outline-none focus:border-black transition-all bg-transparent"
                placeholder="••••••••"
                onChange={e => setForm({...form, password: e.target.value})} 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 bottom-3 text-md font-bold text-gray-400 hover:text-black tracking-tighter"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="flex justify-end">
              <Link href="/reset-password" className="text-md text-gray-400 hover:text-pink-600 transition">Forgot Password?</Link>
            </div>

            <button 
              disabled={loading} 
              className="w-full bg-black text-white py-4 rounded-full font-black uppercase tracking-[0.2em] hover:bg-pink-600 transition-all transform active:scale-95 disabled:bg-gray-200"
            >
              {loading ? "Verifying..." : "Secure Login"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-10">
             <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
             <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest"><span className="bg-white px-4 text-gray-300">Fast Access</span></div>
          </div>

          <button 
            type="button"
            onClick={() => loginGoogle()} 
            className="w-full border-2 border-gray-100 py-3.5 rounded-full flex items-center justify-center gap-3 hover:bg-gray-50 transition-all font-bold text-sm"
          >
            <img src="/assets/google.png" className="h-5 w-5" alt="Google" />
            Sign in with Google
          </button>
        </div>
      </section>
    </main>
  );
}