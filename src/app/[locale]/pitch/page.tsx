import PitchGuesser from "@/components/games/PitchGuesser";

export default function PitchPage() {
  return (
    <div className="relative z-40 min-h-[calc(100vh-5rem)] overflow-hidden">
      <PitchGuesser />
    </div>
  );
}
