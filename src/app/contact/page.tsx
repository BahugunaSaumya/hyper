// src/app/contact/page.tsx
"use client";

import FooterSection from "@/components/FooterSection";
import { useState } from "react";

const FORMSPREE_ENDPOINT = "https://formspree.io/f/meoroaap"; // <-- replace with yours

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "submitting" | "ok" | "err">("idle");
  const [msg, setMsg] = useState<string>("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setMsg("");

    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      const res = await fetch(FORMSPREE_ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      });

      if (res.ok) {
        setStatus("ok");
        setMsg("Thanks! We’ve received your message.");
        form.reset();
      } else {
        const j = await res.json().catch(() => ({}));
        setStatus("err");
        setMsg(j?.errors?.[0]?.message || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("err");
      setMsg("Network error. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Heading */}
      <div className="max-w-5xl mx-auto px-6 pt-12 text-center">
        {/* <p className="text-xs tracking-[0.28em] uppercase font-semibold">
          Having Any Trouble With Any Of Our Products
        </p> */}
        <img
          src="/assets/contact-us-heading.png" // or /assets/contact-us.png from your design
          alt="Contact Us"
          className="mx-auto mt-4 w-[240px] sm:w-[300px] h-auto"
        />
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-6 mt-8 mb-16">
        {/* Success / error */}
        {status !== "idle" && (
          <div
            className={`mb-4 rounded-xl px-4 py-3 text-sm ${
              status === "ok" ? "bg-green-50 text-green-700 border border-green-200"
                               : status === "err" ? "bg-rose-50 text-rose-700 border border-rose-200"
                                                  : "bg-zinc-50 text-zinc-700 border border-zinc-200"
            }`}
          >
            {status === "submitting" ? "Sending…" : msg}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Required by Formspree: ensure your email input is name="email" */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              name="firstName"
              placeholder="First Name"
              required
              className="h-11 rounded-full border border-black/20 px-4 focus:outline-none focus:ring-2 focus:ring-black/10"
            />
            <input
              name="lastName"
              placeholder="Last Name"
              required
              className="h-11 rounded-full border border-black/20 px-4 focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <input
              type="email"
              name="email"
              placeholder="Email"
              required
              className="h-11 rounded-full border border-black/20 px-4 focus:outline-none focus:ring-2 focus:ring-black/10"
            />
            <input
              name="phone"
              placeholder="Phone Number"
              className="h-11 rounded-full border border-black/20 px-4 focus:outline-none focus:ring-2 focus:ring-black/10"
            />
          </div>

          <textarea
            name="message"
            placeholder="Type your message here..."
            required
            rows={7}
            className="w-full rounded-2xl border border-black/20 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black/10"
          />

          {/* --- Optional Formspree helpers --- */}
          {/* set email subject */}
          <input type="hidden" name="_subject" value="New message from Hyper contact form" />
          {/* honeypot to reduce spam */}
          <input type="text" name="_gotcha" className="hidden" tabIndex={-1} autoComplete="off" />
          {/* redirect if you prefer page nav instead of inline message */}
          {/* <input type="hidden" name="_redirect" value="https://gethypergear.in/thanks" /> */}

          <div className="flex justify-center pt-2">
            <button
              type="submit"
              disabled={status === "submitting"}
              className="px-10 h-11 rounded-full bg-black text-white font-bold hover:bg-black/90 disabled:opacity-50"
            >
              {status === "submitting" ? "Submitting…" : "Submit"}
            </button>
          </div>
        </form>
      </div>

<FooterSection/>
    </main>
  );
}
