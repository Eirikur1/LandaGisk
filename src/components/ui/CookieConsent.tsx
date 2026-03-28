"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CONSENT_STORAGE_KEY, type StoredConsent } from "@/lib/consent";

type BannerState = "pending" | "show" | "hide";

export default function CookieConsent() {
  const t = useTranslations("consent");
  const [banner, setBanner] = useState<BannerState>("pending");
  const [essentialOk, setEssentialOk] = useState(false);
  const [analyticsOk, setAnalyticsOk] = useState(false);

  useEffect(() => {
    try {
      setBanner(localStorage.getItem(CONSENT_STORAGE_KEY) ? "hide" : "show");
    } catch {
      setBanner("show");
    }
  }, []);

  function accept() {
    if (!essentialOk) return;
    const record: StoredConsent = {
      v: 1,
      essential: true,
      analytics: analyticsOk,
      at: new Date().toISOString(),
    };
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
    } catch {
      /* quota / private mode */
    }
    setBanner("hide");
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dagrun-consent", { detail: record }));
    }
  }

  if (banner !== "show") return null;

  return (
    <div
      role="dialog"
      aria-labelledby="consent-title"
      aria-describedby="consent-desc"
      className="fixed inset-x-0 bottom-0 z-200 px-4 pb-4 pt-2 pointer-events-none"
    >
      <div
        className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-(--color-border) bg-(--color-surface) px-5 py-4 shadow-lg"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <h2
          id="consent-title"
          className="text-sm font-bold text-(--color-foreground) mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {t("title")}
        </h2>
        <p id="consent-desc" className="text-xs text-(--color-muted) leading-relaxed mb-4">
          {t("body")}
        </p>

        <label className="flex items-start gap-3 cursor-pointer mb-3">
          <input
            type="checkbox"
            checked={essentialOk}
            onChange={(e) => setEssentialOk(e.target.checked)}
            className="mt-0.5 size-3.5 shrink-0 rounded border-(--color-border) accent-(--color-blue)"
          />
          <span className="text-xs text-(--color-foreground) leading-snug">{t("essentialCheckbox")}</span>
        </label>

        <label className="flex items-start gap-3 cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={analyticsOk}
            onChange={(e) => setAnalyticsOk(e.target.checked)}
            className="mt-0.5 size-3.5 shrink-0 rounded border-(--color-border) accent-(--color-blue)"
          />
          <span className="text-xs text-(--color-muted) leading-snug">{t("analyticsCheckbox")}</span>
        </label>

        <div className="flex justify-end">
          <Button type="button" size="sm" disabled={!essentialOk} onClick={accept}>
            {t("accept")}
          </Button>
        </div>
      </div>
    </div>
  );
}
