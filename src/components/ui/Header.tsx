"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";

const GAMES = [
  { href: "waterfall", titleKey: "games.waterfall.title" },
  { href: "flags",     titleKey: "games.flags.title" },
  { href: "world",     titleKey: "games.world.title" },
];

function GlobeLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g clipPath="url(#gc)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10.27 14.1a6.5 6.5 0 0 0 3.67-3.45q-1.24.21-2.7.34-.31 1.83-.97 3.1M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16m.48-1.52a7 7 0 0 1-.96 0H7.5a4 4 0 0 1-.84-1.32q-.38-.89-.63-2.08a40 40 0 0 0 3.92 0q-.25 1.2-.63 2.08a4 4 0 0 1-.84 1.31zm2.94-4.76q1.66-.15 2.95-.43a7 7 0 0 0 0-2.58q-1.3-.27-2.95-.43a18 18 0 0 1 0 3.44m-1.27-3.54a17 17 0 0 1 0 3.64 39 39 0 0 1-4.3 0 17 17 0 0 1 0-3.64 39 39 0 0 1 4.3 0m1.1-1.17q1.45.13 2.69.34a6.5 6.5 0 0 0-3.67-3.44q.65 1.26.98 3.1M8.48 1.5l.01.02q.41.37.84 1.31.38.89.63 2.08a40 40 0 0 0-3.92 0q.25-1.2.63-2.08a4 4 0 0 1 .85-1.32 7 7 0 0 1 .96 0m-2.75.4a6.5 6.5 0 0 0-3.67 3.44 29 29 0 0 1 2.7-.34q.31-1.83.97-3.1M4.58 6.28q-1.66.16-2.95.43a7 7 0 0 0 0 2.58q1.3.27 2.95.43a18 18 0 0 1 0-3.44m.17 4.71q-1.45-.12-2.69-.34a6.5 6.5 0 0 0 3.67 3.44q-.65-1.27-.98-3.1"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="gc"><path fill="#fff" d="M0 0h16v16H0z"/></clipPath>
      </defs>
    </svg>
  );
}

export default function Header() {
  const locale = useLocale() as "en" | "is";
  const t = useTranslations();
  const pathname = usePathname();
  const { user, username, signOut } = useAuth();

  const [accountOpen, setAccountOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const otherLocale = locale === "en" ? "is" : "en";
  const otherLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`);

  // Close dropdown on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <motion.div
      className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none"
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <header
        className="pointer-events-auto grid items-center px-5 h-11"
        style={{
          gridTemplateColumns: "auto 1fr auto",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid rgba(0,0,0,0.08)",
          borderRadius: "100px",
          boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
          minWidth: "min(600px, calc(100vw - 2rem))",
          maxWidth: "calc(100vw - 2rem)",
          gap: "20px",
        }}
      >
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="text-(--color-blue) hover:opacity-60 transition-opacity flex items-center"
          aria-label="Dagrun home"
        >
          <GlobeLogo />
        </Link>

        {/* Center nav */}
        <nav className="flex items-center justify-center gap-6">
          {GAMES.map(({ href, titleKey }) => {
            const full = `/${locale}/${href}`;
            const active = pathname === full || pathname.startsWith(full + "/");
            return (
              <Link
                key={href}
                href={full}
                className="text-[11px] tracking-[0.18em] uppercase transition-opacity hover:opacity-60 whitespace-nowrap"
                style={{
                  fontFamily: "var(--font-sans)",
                  color: active ? "var(--color-blue)" : "var(--color-muted)",
                  borderBottom: active ? "1px solid var(--color-blue)" : "1px solid transparent",
                  paddingBottom: "1px",
                }}
              >
                {t(titleKey as Parameters<typeof t>[0])}
              </Link>
            );
          })}
        </nav>

        {/* Right: Account dropdown */}
        <div className="relative flex items-center justify-end" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setAccountOpen((o) => !o)}
            className="flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase transition-opacity hover:opacity-60 whitespace-nowrap font-medium"
            style={{
              fontFamily: "var(--font-sans)",
              color: accountOpen ? "var(--color-blue)" : "var(--color-muted)",
            }}
          >
            {user ? (username ?? user.email?.split("@")[0]) : "Account"}
            <svg width="8" height="5" viewBox="0 0 8 5" fill="none" style={{ opacity: 0.5, marginTop: 1 }}>
              <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <AnimatePresence>
            {accountOpen && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="absolute top-full right-0 mt-2 min-w-[160px] rounded-2xl overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.96)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(0,0,0,0.09)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                }}
              >
                {/* Language toggle */}
                <div
                  className="px-4 py-3 flex items-center justify-start"
                  style={{ borderBottom: "1px solid rgba(0,0,0,0.07)" }}
                >
                  <Link
                    href={otherLocalePath}
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center gap-1.5 text-[11px] tracking-[0.12em] uppercase font-semibold hover:opacity-60 transition-opacity"
                    style={{ color: "var(--color-foreground)", fontFamily: "var(--font-sans)" }}
                  >
                    <Image
                      src={locale === "en" ? "/flags/is.svg" : "/flags/gb.svg"}
                      alt=""
                      width={13}
                      height={13}
                      className="rounded-sm"
                    />
                    {otherLocale.toUpperCase()}
                  </Link>
                </div>

                {/* Auth */}
                {user ? (
                  <>
                    <div className="px-4 py-2.5">
                      <p
                        className="text-[10px] tracking-[0.14em] uppercase"
                        style={{ color: "var(--color-muted)", fontFamily: "var(--font-sans)" }}
                      >
                        Signed in as
                      </p>
                      <p
                        className="text-[12px] font-semibold mt-0.5 truncate"
                        style={{ color: "var(--color-foreground)", fontFamily: "var(--font-sans)" }}
                      >
                        {username ?? user.email}
                      </p>
                    </div>
                    <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)" }}>
                      <button
                        type="button"
                        onClick={() => { void signOut(); setAccountOpen(false); }}
                        className="w-full text-left px-4 py-3 text-[11px] tracking-[0.18em] uppercase hover:opacity-60 transition-opacity"
                        style={{ color: "var(--color-muted)", fontFamily: "var(--font-sans)" }}
                      >
                        Sign out
                      </button>
                    </div>
                  </>
                ) : (
                  <Link
                    href={`/${locale}/auth`}
                    onClick={() => setAccountOpen(false)}
                    className="block px-4 py-3 text-[11px] tracking-[0.18em] uppercase font-bold hover:opacity-60 transition-opacity"
                    style={{ color: "var(--color-blue)", fontFamily: "var(--font-sans)" }}
                  >
                    Sign in
                  </Link>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>
    </motion.div>
  );
}
