import { useTranslations } from "next-intl";
import FlagGuesser from "@/components/games/FlagGuesser";

export default function FlagsPage() {
  const t = useTranslations("games.flags");
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="mb-8 border-b border-(--color-border) pb-6">
        <h1 className="text-5xl font-black text-(--color-blue) tracking-tight leading-none mb-2"
            style={{ fontFamily: "var(--font-display)" }}>
          {t("title")}
        </h1>
        <p className="text-sm text-(--color-muted)">{t("description")}</p>
      </div>
      <FlagGuesser />
    </div>
  );
}
