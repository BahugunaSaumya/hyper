// src/app/terms/page.tsx
import FaqSection from "@/components/FaqSection";
import type { Metadata } from "next";
import Link from "next/link";
import ContactPage from "../contact/page";

export const metadata: Metadata = {
  title: "Terms and Conditions — HYPER MMA",
  description: "HYPER MMA website terms and conditions.",
};

export default function TermsPage() {
  return (
    <main className="bg-white text-black">
      {/* offset for your fixed header if you use it */}
      <section className="offset-header max-w-[980px] mx-auto px-5 md:px-6 lg:px-8 py-8 md:py-10">
        {/* Back + title */}
        <div className="flex items-center gap-3 mb-6 md:mb-8">
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm text-black hover:bg-black hover:text-white transition"
            aria-label="Go back"
          >
            <span className="inline-block -ml-0.5">←</span>
            <span>Back</span>
          </Link>
        </div>

        <h1 className="text-center text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-wide uppercase">
          Terms and Conditions
        </h1>

        {/* Body */}
        <div className="mt-8 md:mt-10 text-[13px] sm:text-[14px] leading-relaxed">
          <ol className="space-y-6 list-decimal pl-5">
            <li>
              <p className="font-semibold mb-1">Use of Website</p>
              <ul className="list-disc pl-5 space-y-1 text-black/80">
                <li>
                  You agree to use this website only for lawful purposes and in a manner that does
                  not infringe the rights of, restrict, or inhibit the use and enjoyment of this
                  website by any third party.
                </li>
              </ul>
            </li>

            <li>
              <p className="font-semibold mb-1">Eligibility</p>
              <ul className="list-disc pl-5 space-y-1 text-black/80">
                <li>At least 18 years old, or under the supervision of a parent or legal guardian.</li>
                <li>Providing accurate, current, and complete account and payment information.</li>
              </ul>
            </li>

            <li>
              <p className="font-semibold mb-1">Products and Pricing</p>
              <ul className="list-disc pl-5 space-y-1 text-black/80">
                <li>All prices are listed in local currency and include applicable taxes unless stated otherwise.</li>
                <li>We reserve the right to change prices and product availability without prior notice.</li>
                <li>Product colors may vary slightly due to screen differences.</li>
              </ul>
            </li>

            <li>
              <p className="font-semibold mb-1">Orders</p>
              <ul className="list-disc pl-5 space-y-1 text-black/80">
                <li>
                  By placing an order, you agree that all details you provide are accurate and that you
                  are authorized to use the payment method provided.
                </li>
                <li>
                  We reserve the right to refuse or cancel any order for any reason, including suspected
                  fraud or unauthorized activity.
                </li>
              </ul>
            </li>

            <li>
              <p className="font-semibold mb-1">Shipping and Delivery</p>
              <ul className="list-disc pl-5 space-y-1 text-black/80">
                <li>Shipping timelines are estimates and may vary by location and external factors.</li>
                <li>We are not liable for delays caused by shipping carriers, customs, or natural events.</li>
              </ul>
            </li>

            <li>
              <p className="font-semibold mb-1">Returns and Exchanges</p>
              <ul className="list-disc pl-5 space-y-1 text-black/80">
                <li>
                  We accept returns within 14 days of delivery, provided items are unused, unwashed,
                  and in original packaging.
                </li>
                <li>Sale items and accessories are non-refundable unless faulty.</li>
                <li>
                  To initiate a return, please visit our <Link href="/contact" className="underline">Contact</Link> page.
                </li>
              </ul>
            </li>

            <li>
              <p className="font-semibold mb-1">Intellectual Property</p>
              <ul className="list-disc pl-5 space-y-1 text-black/80">
                <li>
                  All content, including images, designs, logos, and text, is the property of HYPER and
                  protected by intellectual property laws. You may not use, reproduce, or distribute any
                  content without written permission.
                </li>
              </ul>
            </li>

            <li>
              <p className="font-semibold mb-1">User Accounts</p>
              <ul className="list-disc pl-5 space-y-1 text-black/80">
                <li>
                  You are responsible for maintaining the confidentiality of your account and password.
                </li>
                <li>
                  We reserve the right to terminate accounts found to be in violation of these terms.
                </li>
              </ul>
            </li>

            <li>
              <p className="font-semibold mb-1">Limitation of Liability</p>
              <ul className="list-disc pl-5 space-y-1 text-black/80">
                <li>
                  We are not liable for any indirect, incidental, or consequential damages arising
                  from the use or inability to use the website or products purchased.
                </li>
              </ul>
            </li>

            <li>
              <p className="font-semibold mb-1">Contact</p>
              <ul className="list-disc pl-5 space-y-1 text-black/80">
                <li>
                  Questions about these terms? Reach us at{" "}
                  <Link href="/contact" className="underline">Contact</Link>.
                </li>
              </ul>
            </li>
          </ol>

          <p className="mt-10 text-xs text-black/50">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </div>
      </section>

<section>
<ContactPage/>
          <div className="mt-8 flex items-center justify-between text-xs text-white/70">
            <span>© {new Date().getFullYear()} HYPER</span>
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:underline"
            >
              <span className="border rounded-sm px-1.5 py-0.5 text-[10px]">IG</span> Hyper
            </a>
        </div>
    </section>
    </main>
  );
}
