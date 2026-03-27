import { useTranslations } from "next-intl";
import WorldGuesser from "@/components/games/WorldGuesser";
import Leaderboard from "@/components/Leaderboard";

export default function WorldPage() {
  const t = useTranslations("games.world");
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.95fr)_1.15fr] gap-8 items-start">
        <div className="lg:pt-3 flex flex-col gap-6 min-w-0">
          <div>
            <h1
              className="text-5xl font-black text-(--color-blue) tracking-tight leading-none mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {t("title")}
            </h1>
            <p className="text-sm text-(--color-muted)">{t("description")}</p>
          </div>
          <Leaderboard />
        </div>

        <div className="min-w-0">
          <WorldGuesser />
        </div>
      </div>
    </div>
  );
}
