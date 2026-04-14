"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const { signupEmail, loading } = useAuth() as any;
  const router = useRouter();

  const [form, setForm] = useState({
    first_name: "", last_name: "", email: "", mobile: "", password: ""
  });
  const [status, setStatus] = useState({ type: "", message: "" });

  const validate = () => {
    if (!form.first_name || !form.last_name) return "Full name is required.";
    if (!form.email.includes("@")) return "Please enter a valid email.";
    if (form.mobile.length < 10) return "Enter a valid 10-digit mobile number.";
    if (form.password.length < 6) return "Password must be at least 6 characters.";
    return null;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) return setStatus({ type: "error", message: error });

    setStatus({ type: "info", message: "Creating your account..." });

    try {
      await signupEmail(form.email, form.password, {
        first_name: form.first_name,
        last_name: form.last_name,
        mobile: form.mobile
      });
      setStatus({ type: "success", message: "Registration successful! Redirecting..." });
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: any) {
      let friendlyMessage = "Registration failed. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        friendlyMessage = "This email is already registered. Try logging in instead.";
      } else if (err.code === "auth/weak-password") {
        friendlyMessage = "Password is too weak. Please use at least 6 characters.";
      } else if (err.message) {
        friendlyMessage = err.message;
      }
      setStatus({ type: "error", message: friendlyMessage });
    }
  };

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-white text-black font-sans">
      <aside className="hidden lg:block relative">
        <img src="/assets/login/signup-gym.png" className="w-full h-full object-contain" alt="Gym" />
      </aside>

      <section className="flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <header className="mb-10 text-center lg:text-left">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-2">Join the Club</h1>
            <p className="text-gray-500">
             Already have an account? <Link href="/login" className="text-pink-600 font-bold hover:underline">Login</Link>
            </p>
          </header>
          <p className="text-gray-500 mb-8">Fill in your details to get started.</p>

          {status.message && (
            <div className={`mb-6 p-4 rounded-lg text-sm font-medium border ${
              status.type === "error" ? "bg-pink-50 border-pink-200 text-pink-600" : 
              status.type === "success" ? "bg-green-50 border-green-200 text-green-600" : 
              "bg-black-50 border-black-200 text-black-600"
            }`}>
              {status.message}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-md font-bold text-gray-400">First Name</label>
                <input required type="text" className="w-full border-b-2 py-2 outline-none focus:border-black transition"
                  onChange={e => setForm({...form, first_name: e.target.value})} />
              </div>
              <div className="space-y-1">
                <label className="text-md font-bold text-gray-400">Last Name</label>
                <input required type="text" className="w-full border-b-2 py-2 outline-none focus:border-black transition"
                  onChange={e => setForm({...form, last_name: e.target.value})} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-md font-bold text-gray-400">Email Address</label>
              <input required type="email" className="w-full border-b-2 py-2 outline-none focus:border-black transition"
                onChange={e => setForm({...form, email: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-md font-bold text-gray-400">Mobile Number</label>
              <input required type="tel" className="w-full border-b-2 py-2 outline-none focus:border-black transition"
                onChange={e => setForm({...form, mobile: e.target.value})} />
            </div>

            <div className="space-y-1">
              <label className="text-md font-bold text-gray-400">Password</label>
              <input required type="password" className="w-full border-b-2 py-2 outline-none focus:border-black transition"
                onChange={e => setForm({...form, password: e.target.value})} />
            </div>

            <button disabled={loading} className="w-full bg-black text-white py-4 rounded-full font-bold tracking-widest hover:bg-pink-600 transition disabled:bg-gray-300 mt-4 font-title">
              {loading ? "Processing..." : "Create Account"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}