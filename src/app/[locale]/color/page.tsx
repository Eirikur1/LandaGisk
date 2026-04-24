import ColorGuesser from "@/components/games/ColorGuesser";

export default function ColorPage() {
  return (
    <div className="relative z-40 min-h-[calc(100vh-5rem)] overflow-hidden">
      <ColorGuesser />
    </div>
  );
}
