import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { recentArchiveDates } from "@/lib/game-date";

function formatArchiveRow(iso: string, locale: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "is" ? "is-IS" : "en-GB", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export default async function ArchivePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "archive" });
  const dates = recentArchiveDates(60);
  const base = `/${locale}`;

  return (
    <div className="relative z-10 mx-auto max-w-3xl px-6 pt-24 pb-16">
      <h1
        className="text-3xl font-black tracking-tight text-(--color-blue) mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {t("title")}
      </h1>
      <p className="text-sm text-(--color-muted) mb-8 max-w-xl leading-relaxed" style={{ fontFamily: "var(--font-sans)" }}>
        {t("description")}
      </p>

      <div className="rounded-2xl border border-(--color-border) bg-(--color-surface) overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ fontFamily: "var(--font-sans)" }}>
            <thead>
              <tr className="border-b border-(--color-border) bg-black/[0.02]">
                <th className="px-4 py-3 font-semibold text-(--color-foreground)">{t("date")}</th>
                <th className="px-4 py-3 font-semibold text-(--color-foreground)">{t("colWaterfall")}</th>
                <th className="px-4 py-3 font-semibold text-(--color-foreground)">{t("colFlags")}</th>
                <th className="px-4 py-3 font-semibold text-(--color-foreground)">{t("colWorld")}</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((day) => (
                <tr key={day} className="border-b border-(--color-border) last:border-0 hover:bg-black/[0.02]">
                  <td className="px-4 py-2.5 text-(--color-muted) whitespace-nowrap">{formatArchiveRow(day, locale)}</td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`${base}/waterfall?date=${day}`}
                      className="font-semibold text-(--color-blue) hover:opacity-70 transition-opacity"
                    >
                      {t("play")}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`${base}/flags?date=${day}`}
                      className="font-semibold text-(--color-blue) hover:opacity-70 transition-opacity"
                    >
                      {t("play")}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link
                      href={`${base}/world?date=${day}`}
                      className="font-semibold text-(--color-blue) hover:opacity-70 transition-opacity"
                    >
                      {t("play")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
