import YearGuesser from "@/components/games/YearGuesser";

export default function YearPage() {
  return (
    <div className="relative z-40 min-h-[calc(100vh-5rem)] overflow-hidden">
      <YearGuesser />
    </div>
  );
}
