import type { Metadata } from "next";
import { Inter, Jersey_15, Jersey_10, Space_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { routing } from "@/i18n/routing";
import Header from "@/components/ui/Header";
import Footer from "@/components/ui/Footer";
import CookieConsent from "@/components/ui/CookieConsent";
import { AuthProvider } from "@/contexts/AuthContext";
import "../globals.css";
import "flag-icons/css/flag-icons.min.css";
import "@fontsource/redaction-50";

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

const jersey15 = Jersey_15({
  subsets: ["latin"],
  variable: "--font-jersey15",
  weight: "400",
});

const jersey10 = Jersey_10({
  subsets: ["latin"],
  variable: "--font-jersey10",
  weight: "400",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "ApaBiz — Daily Icelandic Games",
  description: "Daily fun games to challenge your memory, logic, and world knowledge",
  icons: {
    icon: "/MonoIcon.svg",
    shortcut: "/MonoIcon.svg",
    apple: "/MonoIcon.svg",
  },
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
    <html lang={locale} className={`${interSans.variable} ${jersey15.variable} ${jersey10.variable} ${spaceMono.variable} h-full`}>
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
          <Footer />
          <CookieConsent />
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
