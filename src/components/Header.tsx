// src/components/Header.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { ADMIN_EMAILS } from "@/config/admin";
import { USER_DASHBOARD_PATH, LOGIN_PATH } from "@/config/paths";

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/"; // Detect homepage

  // Cart badge
  let badge = 0;
  try {
    const c = useCart() as any;
    badge = Number(c?.count ?? c?.totalItems ?? 0);
  } catch {
    badge = 0;
  }

  // Auth & admin detection
  let isAdmin = false;
  const { user, loading } = useAuth() as any;
  const accountHref = !loading && user ? USER_DASHBOARD_PATH : LOGIN_PATH;

  try {
    if (!loading && user) {
      const rawEmail = user?.email || user?.providerData?.[0]?.email || "";
      const email = String(rawEmail).trim().toLowerCase();
      isAdmin = !!email && ADMIN_EMAILS.includes(email);
    }
  } catch {
    isAdmin = false;
  }

  // Conditional styling
  const navClasses = isHome
    ? "bg-black text-white border-white/10"
    : "bg-white text-black border-black/10";

  const linkHover = isHome ? "hover:text-pink-400" : "hover:text-pink-600";

  const logoSrc = isHome
    ? "/assets/hyper-logo-white.png"
    : "/assets/hyper-logo-black.png";

  return (
    <div id="header">
      <nav
        className={`fixed top-0 left-0 w-full z-50 backdrop-blur-md px-6 py-4 shadow-sm border-b transition-colors duration-500 ${navClasses}`}
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <Link href="/" aria-label="Home" className="block">
            <img
              src={logoSrc}
              alt="HYPER Logo"
              className="h-8 md:h-10 glitch transition duration-500"
            />
          </Link>

          {/* Primary nav */}
          <div
            className={`hidden md:flex space-x-8 text-sm font-semibold transition duration-500`}
          >
            <a href="/#products" className={linkHover}>Products</a>
            <a href="/#blogs" className={linkHover}>Blogs</a>
            <a href="/#contact" className={linkHover}>Contact</a>

            {isAdmin && (
              <Link href="/admin" className={linkHover}>Admin</Link>
            )}
          </div>

          {/* Right actions */}
          <div
            className={`flex items-center space-x-6 text-lg transition duration-500`}
          >
            {/* Search */}
            <button className={linkHover} aria-label="Search">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-4.35-4.35M17 10a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>

            {/* Cart */}
            <Link href="/cart" className={`relative ${linkHover}`} aria-label="Cart">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
              >
                <path
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13l-1.5 7h13L17 13"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="6" cy="21" r="1" />
                <circle cx="18" cy="21" r="1" />
              </svg>
              {badge > 0 && (
                <span
                  className="cart-badge absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1.5 rounded-full bg-pink-600 text-white text-[10px] leading-[18px] text-center font-bold ring-2 ring-white/70"
                  aria-label={`${badge} items in cart`}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>

            {/* Account */}
            <Link href={accountHref} className={linkHover} aria-label="Account">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5.121 17.804A9 9 0 0112 15a9 9 0 016.879 2.804M15 10a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </Link>

            {/* Admin shortcut (mobile only) */}
            {isAdmin && (
              <Link
                href="/admin"
                aria-label="Admin dashboard"
                className={`md:hidden ${linkHover}`}
                title="Admin"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M3 7l4 3 5-6 5 6 4-3v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}
