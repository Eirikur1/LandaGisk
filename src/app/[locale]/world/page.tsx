import { useTranslations } from "next-intl";
import WorldGuesser from "@/components/games/WorldGuesser";

export default function WorldPage() {
  const t = useTranslations("games.world");
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[.6fr_1.1fr] gap-8 items-start">
        <div className="lg:pt-3 lg:sticky lg:top-24">
          <h1
            className="text-5xl font-black text-(--color-blue) tracking-tight leading-none mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {t("title")}
          </h1>
          <p className="text-sm text-(--color-muted)">{t("description")}</p>
        </div>

        <div>
          <WorldGuesser />
        </div>
      </div>
    </div>
  );
}
