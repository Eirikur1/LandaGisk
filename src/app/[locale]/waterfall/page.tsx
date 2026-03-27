import { useTranslations } from "next-intl";
import WaterfallGuesser from "@/components/games/WaterfallGuesser";

export default function WaterfallPage() {
  const t = useTranslations("games.waterfall");
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8 border-b border-(--color-border) pb-6">
        <h1 className="text-5xl font-black text-(--color-blue) tracking-tight leading-none mb-2"
            style={{ fontFamily: "var(--font-display)" }}>
          {t("title")}
        </h1>
        <p className="text-sm text-(--color-muted)">{t("description")}</p>
      </div>
      <WaterfallGuesser />
    </div>
  );
}
