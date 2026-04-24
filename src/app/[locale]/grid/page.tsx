import GridGuesser from "@/components/games/GridGuesser";

export default function GridPage() {
  return (
    <div className="relative z-40 min-h-[calc(100vh-5rem)] overflow-hidden">
      <GridGuesser />
    </div>
  );
}
