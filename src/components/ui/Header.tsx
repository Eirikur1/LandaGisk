"use client";

import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, Trophy, ChevronDown } from "lucide-react";

const GAMES = [
  { href: "waterfall", titleKey: "games.waterfall.title", available: true },
  { href: "flags", titleKey: "games.flags.title", available: true },
  { href: "world", titleKey: "games.world.title", available: true },
  { href: "birds", titleKey: "games.birds.title", available: false },
  { href: "plants", titleKey: "games.plants.title", available: false },
  { href: "mountains", titleKey: "games.mountains.title", available: false },
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
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const { user, username, avatarUrl, signOut } = useAuth();

  const otherLocale = locale === "en" ? "is" : "en";
  const otherLocalePath = pathname.replace(`/${locale}`, `/${otherLocale}`);

  const gamesBase = `/${locale}`;
  const gamesRoutes = GAMES.filter((g) => g.available).map((g) => `${gamesBase}/${g.href}`);
  const gamesHubActive = gamesRoutes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const leaderboardPath = `${gamesBase}/leaderboard`;
  const leaderboardActive = pathname === leaderboardPath || pathname.startsWith(`${leaderboardPath}/`);
  const archivePath = `${gamesBase}/archive`;
  const archiveActive = pathname === archivePath || pathname.startsWith(`${archivePath}/`);

  // Hide on auth pages
  if (pathname.includes("/auth")) return null;

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

        {/* Center nav: Games ▾ · Leaderboard · Archive */}
        <nav className="flex items-center justify-center gap-5 sm:gap-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="text-[11px] tracking-[0.18em] uppercase transition-opacity hover:opacity-60 whitespace-nowrap flex items-center gap-1 outline-none"
                style={{
                  fontFamily: "var(--font-sans)",
                  color: gamesHubActive ? "var(--color-blue)" : "var(--color-muted)",
                  borderBottom: gamesHubActive ? "1px solid var(--color-blue)" : "1px solid transparent",
                  paddingBottom: "1px",
                }}
                aria-haspopup="menu"
              >
                {tNav("games")}
                <ChevronDown size={12} strokeWidth={2.25} className="opacity-60 shrink-0" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className="min-w-48"
              style={{
                background: "rgba(255,255,255,0.96)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              {GAMES.map(({ href, titleKey, available }) => {
                const full = `/${locale}/${href}`;
                const active = available && (pathname === full || pathname.startsWith(`${full}/`));
                return (
                  <DropdownMenuItem key={href} asChild={!available}>
                    {available ? (
                      <Link
                        href={full}
                        className="cursor-pointer"
                        style={{ fontFamily: "var(--font-sans)", fontWeight: active ? 700 : 500 }}
                      >
                        {t(titleKey as Parameters<typeof t>[0])}
                      </Link>
                    ) : (
                      <span
                        className="flex w-full items-center justify-between text-(--color-muted) cursor-default"
                        style={{ fontFamily: "var(--font-sans)" }}
                      >
                        {t(titleKey as Parameters<typeof t>[0])}
                        <span className="text-[10px] uppercase tracking-[0.12em] opacity-70">
                          {t("home.comingSoon" as Parameters<typeof t>[0])}
                        </span>
                      </span>
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href={leaderboardPath}
            className="text-[11px] tracking-[0.18em] uppercase transition-opacity hover:opacity-60 whitespace-nowrap"
            style={{
              fontFamily: "var(--font-sans)",
              color: leaderboardActive ? "var(--color-blue)" : "var(--color-muted)",
              borderBottom: leaderboardActive ? "1px solid var(--color-blue)" : "1px solid transparent",
              paddingBottom: "1px",
            }}
          >
            {tNav("leaderboard")}
          </Link>

          <Link
            href={archivePath}
            className="text-[11px] tracking-[0.18em] uppercase transition-opacity hover:opacity-60 whitespace-nowrap"
            style={{
              fontFamily: "var(--font-sans)",
              color: archiveActive ? "var(--color-blue)" : "var(--color-muted)",
              borderBottom: archiveActive ? "1px solid var(--color-blue)" : "1px solid transparent",
              paddingBottom: "1px",
            }}
          >
            {tNav("archive")}
          </Link>
        </nav>

        {/* Right: Account dropdown */}
        <div className="flex items-center justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 text-[11px] tracking-[0.18em] uppercase transition-opacity hover:opacity-60 whitespace-nowrap font-medium outline-none"
                style={{ fontFamily: "var(--font-sans)", color: "var(--color-muted)" }}
              >
                {user && avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="size-6 rounded-full object-cover shrink-0 ring-1 ring-black/10" />
                ) : user ? (
                  <span
                    className="size-6 rounded-full flex items-center justify-center shrink-0 font-black text-[9px] text-white bg-(--color-blue) ring-1 ring-black/10"
                    style={{ fontFamily: "var(--font-sans)" }}
                  >
                    {(username ?? user.email ?? "?").slice(0, 2).toUpperCase()}
                  </span>
                ) : (
                  <User size={14} />
                )}
                {user ? (username ?? user.email?.split("@")[0]) : "Account"}
                <svg width="8" height="5" viewBox="0 0 8 5" fill="none" style={{ opacity: 0.5, marginTop: 1 }}>
                  <path d="M1 1l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="end"
              className="w-56"
              style={{
                background: "rgba(255,255,255,0.96)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
              }}
            >
              {/* Language */}
              <DropdownMenuItem asChild>
                <Link href={otherLocalePath} className="flex items-center gap-2 cursor-pointer">
                  <Image
                    src={locale === "en" ? "/flags/is.svg" : "/flags/gb.svg"}
                    alt=""
                    width={14}
                    height={14}
                    className="rounded-sm"
                  />
                  <span>{otherLocale.toUpperCase()}</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {user ? (
                <>
                  <DropdownMenuLabel className="font-normal">
                    <p className="text-xs text-muted-foreground">Signed in as</p>
                    <p className="font-semibold text-foreground truncate">{username ?? user.email}</p>
                  </DropdownMenuLabel>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/account`} className="flex items-center gap-2 cursor-pointer">
                      <Settings size={14} />
                      {tNav("profile")}
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/leaderboard`} className="flex items-center gap-2 cursor-pointer">
                      <Trophy size={14} />
                      Leaderboard
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => void signOut()}
                    className="flex items-center gap-2 text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  >
                    <LogOut size={14} />
                    Sign out
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}/auth`} className="flex items-center gap-2 cursor-pointer font-semibold" style={{ color: "var(--color-blue)" }}>
                    <User size={14} />
                    Sign in
                  </Link>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </motion.div>
  );
}
