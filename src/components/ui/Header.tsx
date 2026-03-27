"use client";

import Link from "next/link";
import Image from "next/image";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";

const FLAG = {
  is: { src: "/flags/is.svg", label: "IS" },
  en: { src: "/flags/gb.svg", label: "EN" },
};

const GAMES = [
  { href: "waterfall", label: "Foss"   },
  { href: "flags",     label: "Fáni"   },
  { href: "world",     label: "Heimur" },
];

export default function Header() {
  const locale = useLocale() as "en" | "is";
  const router = useRouter();
  const pathname = usePathname();

  const otherLocale = locale === "en" ? "is" : "en";
  const otherLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`);
  const target = FLAG[otherLocale];

  return (
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
          DAGSPIL
        </Link>

        {/* Center nav */}
        <nav className="flex items-center gap-7">
          {GAMES.map(({ href, label }) => {
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
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Language */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => router.push(otherLocalePath)}
            className="flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase text-(--color-muted) hover:opacity-60 transition-opacity whitespace-nowrap"
            style={{ fontFamily: "var(--font-sans)" }}
            aria-label={target.label}
          >
            <Image src={target.src} alt="" width={13} height={13} className="rounded-sm" />
            {target.label}
          </button>
        </div>
      </header>
    </div>
  );
}
