import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { routing } from "@/i18n/routing";
import Header from "@/components/ui/Header";
import CookieConsent from "@/components/ui/CookieConsent";
import MonkeyPet from "@/components/ui/Monkeypet/MonkeyPet";
import { AuthProvider } from "@/contexts/AuthContext";
import "../globals.css";
import "flag-icons/css/flag-icons.min.css";

function supabaseOrigin(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
}

const interSans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dagrun — Daily Icelandic Games",
  description: "Daily fun games to challenge your memory, logic, and world knowledge",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as "en" | "is")) {
    notFound();
  }

  const messages = await getMessages();
  const preconnectSupabase = supabaseOrigin();

  // Read the per-request nonce injected by proxy.ts so Next.js can apply it
  // to its bootstrap scripts, satisfying the nonce-based CSP.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang={locale} className={`${interSans.variable} h-full`}>
      <head>
        {nonce && <meta property="csp-nonce" content={nonce} />}
        {preconnectSupabase ? (
          <link rel="preconnect" href={preconnectSupabase} crossOrigin="anonymous" />
        ) : null}
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-(--color-background)"
      >
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <Header />
            <main className="flex-1 pt-16">{children}</main>
          <footer className="relative border-t border-(--color-border) py-10 text-center overflow-visible">
            <MonkeyPet />
            <p
              className="text-[10px] tracking-[0.35em] uppercase text-(--color-muted)"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Made in Iceland
            </p>
          </footer>
          <CookieConsent />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
