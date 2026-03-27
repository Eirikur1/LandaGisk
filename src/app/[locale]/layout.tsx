import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import Header from "@/components/ui/Header";
import "../globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "700", "800", "900"],
  style: ["normal", "italic"],
});

const interSans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Dagrun — Daily Icelandic Games",
  description: "Daily games with an Icelandic heart",
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

  return (
    <html lang={locale} className={`${playfair.variable} ${interSans.variable} h-full`}>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-(--color-background)"
      >
        <NextIntlClientProvider messages={messages}>
          <Header />
          <main className="flex-1 pt-20">{children}</main>
          <footer className="py-10 text-center">
            <p
              className="text-[10px] tracking-[0.35em] uppercase text-(--color-muted)"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              Made in Iceland
            </p>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
