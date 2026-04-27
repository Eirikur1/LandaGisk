"use client";

import { usePathname } from "next/navigation";
import MonkeyPet from "@/components/ui/Monkeypet/MonkeyPetClient";

export default function Footer() {
  const pathname = usePathname();

  if (pathname.includes("/auth")) return null;

  return (
    <footer className="relative z-30 border-t border-(--color-border) py-10 text-center overflow-visible bg-(--color-background)">
      <MonkeyPet />
      <p
        className="text-[10px] tracking-[0.35em] uppercase text-(--color-muted)"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        Made by Eiki
      </p>
    </footer>
  );
}
