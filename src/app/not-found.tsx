import Link from "next/link";
import { Inter } from "next/font/google";
import SleepingMonkeyLottie from "@/components/ui/SleepingMonkeyLottie";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootNotFound() {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col bg-(--color-background)">
        <div className="flex flex-col items-center justify-center flex-1 min-h-screen px-6 text-center gap-6">
          <SleepingMonkeyLottie />

          <div className="flex flex-col items-center gap-2">
            <h1
              className="text-5xl font-black text-(--color-blue)"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              404
            </h1>
            <p
              className="text-sm text-(--color-muted)"
              style={{ fontFamily: "var(--font-sans)" }}
            >
              This page is asleep — or maybe it never existed.
            </p>
          </div>

          <Link
            href="/"
            className="inline-flex items-center justify-center h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition-colors hover:bg-primary/80"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Go home
          </Link>
        </div>
      </body>
    </html>
  );
}
