// src/app/signup/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const HERO_SLIDES = [
  "/assets/login/signup-gym.png",
  "/assets/login/signup-gym.png",
  "/assets/login/signup-gym.png",
];

export default function SignupPage() {
  const { signupEmail, loginGoogle } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);

  // Auto-rotate hero images
  useEffect(() => {
    const id = setInterval(() => setSlide((s) => (s + 1) % HERO_SLIDES.length), 4000);
    return () => clearInterval(id);
  }, []);

  async function handleSignup() {
    setErr(null);
    try {
      await signupEmail(name.trim(), email.trim(), pw);
      router.replace("/checkout");
    } catch (e: any) {
      setErr(e?.message || "Signup failed. Please try again.");
    }
  }

  async function handleGoogle() {
    setErr(null);
    try {
      await loginGoogle();
      router.replace("/checkout");
    } catch (e: any) {
      setErr(e?.message || "Google sign-in failed. Please try again.");
    }
  }

  return (
    <main className="min-h-[100dvh] bg-white text-black">
      <div className="mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* LEFT: image carousel */}
        <aside className="relative hidden lg:block">
          <img
            key={slide}
            src={HERO_SLIDES[slide]}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
          />
          <div className="absolute inset-0 bg-black/10" />

          {/* dots */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => setSlide(i)}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  i === slide ? "bg-white" : "bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </aside>

        {/* RIGHT: form */}
        <section className="px-6 sm:px-10 lg:px-14 py-12 lg:py-20">
          <div className="mx-auto w-full max-w-lg">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-[0.06em] text-center">
              CREATE AN ACCOUNT
            </h1>

            <p className="mt-3 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <a href="/login" className="text-pink-500 hover:underline">
                Log in
              </a>
            </p>

            {err && (
              <div className="mt-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {err}
              </div>
            )}

            {/* Full name */}
            <label className="mt-8 block text-sm font-medium">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="mt-2 w-full rounded-md border px-4 py-3 outline-none focus:ring-2 focus:ring-pink-400"
            />

            {/* Email */}
            <label className="mt-5 block text-sm font-medium">Email Address</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@example.com"
              className="mt-2 w-full rounded-md border px-4 py-3 outline-none focus:ring-2 focus:ring-pink-400"
              autoComplete="email"
            />

            {/* Password */}
            <label className="mt-5 block text-sm font-medium">Password</label>
            <div className="mt-2 relative">
              <input
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                className="w-full rounded-md border px-4 py-3 pr-12 outline-none focus:ring-2 focus:ring-pink-400"
                autoComplete="new-password"
              />
              <button
                type="button"
                aria-label={showPw ? "Hide password" : "Show password"}
                onClick={() => setShowPw((s) => !s)}
                className="absolute inset-y-0 right-0 px-3 grid place-items-center text-gray-500 hover:text-gray-700"
              >
                {/* eye icon */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  {showPw ? (
                    <>
                      <path d="M3 3l18 18" />
                      <path d="M10.584 10.587a3 3 0 004.242 4.243" />
                      <path d="M9.88 5.09A9.996 9.996 0 0121 12s-3.75 6-9 6a8.99 8.99 0 01-4.12-1.03" />
                      <path d="M7.11 7.11A8.987 8.987 0 003 12s3.75 6 9 6c1.163 0 2.273-.205 3.29-.58" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
                      <circle cx="12" cy="12" r="3.2" />
                    </>
                  )}
                </svg>
              </button>
            </div>

            {/* Terms */}
            <p className="mt-3 text-xs text-gray-500">
              By creating an account, you agree to our{" "}
              <a href="/terms" className="underline hover:text-pink-500">
                Terms of use
              </a>{" "}
              and{" "}
              <a href="/privacy" className="underline hover:text-pink-500">
                Privacy Policy
              </a>
            </p>

            {/* Submit */}
            <button
              onClick={handleSignup}
              className="mt-6 w-full py-3 rounded-full border-2 border-black font-semibold hover:bg-black hover:text-white transition"
            >
              SIGN UP
            </button>

            {/* Divider */}
            <div className="mt-8 flex items-center gap-3 text-gray-400">
              <span className="h-px flex-1 bg-gray-200" />
              <span className="text-xs">OR</span>
              <span className="h-px flex-1 bg-gray-200" />
            </div>

            {/* Google sign up */}
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleGoogle}
                className="h-12 w-12 rounded-2xl shadow-md grid place-items-center border border-gray-200 hover:shadow-lg transition"
                aria-label="Sign up with Google"
              >
                <img src="/assets/google.png" alt="Google" className="h-6 w-6" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
