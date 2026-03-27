"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AuthModal from "@/components/ui/AuthModal";

const FLAG = {
  is: { src: "/flags/is.svg", label: "IS" },
  en: { src: "/flags/gb.svg", label: "EN" },
};

const GAMES = [
  { href: "waterfall", titleKey: "games.waterfall.title" },
  { href: "flags", titleKey: "games.flags.title" },
  { href: "world", titleKey: "games.world.title" },
];

export default function Header() {
  const locale = useLocale() as "en" | "is";
  const t = useTranslations();
  const router = useRouter();
  const pathname = usePathname();
  const { user, username, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);

  const otherLocale = locale === "en" ? "is" : "en";
  const otherLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`);
  const target = FLAG[otherLocale];

  return (
    <>
      <div className="fixed top-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <header
          className="pointer-events-auto grid items-center px-6 h-11"
          style={{
            gridTemplateColumns: "1fr auto 1fr",
            background: "rgba(255,255,255,0.85)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "100px",
            boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
            minWidth: "min(640px, calc(100vw - 2rem))",
            maxWidth: "calc(100vw - 2rem)",
            gap: "24px",
          }}
        >
          {/* Wordmark */}
          <Link
            href={`/${locale}`}
            className="text-[11px] font-bold tracking-[0.18em] uppercase text-(--color-blue) hover:opacity-60 transition-opacity whitespace-nowrap"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Dagrun
          </Link>

          {/* Center nav */}
          <nav className="flex items-center gap-7">
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
                    borderBottom: active
                      ? "1px solid var(--color-blue)"
                      : "1px solid transparent",
                    paddingBottom: "1px",
                  }}
                >
                  {t(titleKey as Parameters<typeof t>[0])}
                </Link>
              );
            })}
          </nav>

          {/* Right: language + auth */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => router.push(otherLocalePath)}
              className="flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-(--color-muted) hover:opacity-60 transition-opacity whitespace-nowrap"
              style={{ fontFamily: "var(--font-sans)" }}
              aria-label={target.label}
            >
              <Image
                src={target.src}
                alt=""
                width={13}
                height={13}
                className="rounded-sm"
              />
              {target.label}
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] tracking-[0.14em] uppercase font-bold text-(--color-blue) whitespace-nowrap"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  {username ?? user.email?.split("@")[0]}
                </span>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="text-[11px] tracking-[0.18em] uppercase text-(--color-muted) hover:opacity-60 transition-opacity whitespace-nowrap"
                  style={{ fontFamily: "var(--font-sans)" }}
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAuth(true)}
                className="text-[11px] tracking-[0.18em] uppercase text-(--color-blue) hover:opacity-60 transition-opacity font-bold whitespace-nowrap"
                style={{ fontFamily: "var(--font-sans)" }}
              >
                Sign in
              </button>
            )}
          </div>
        </header>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </>
  );
}
