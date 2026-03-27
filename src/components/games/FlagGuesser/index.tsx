"use client";

import { TbFlag3 } from "react-icons/tb";

export default function FlagGuesser() {
  return (
    <div className="py-16 flex flex-col items-center gap-3 border border-(--color-border) rounded-lg bg-(--color-surface)">
      <TbFlag3 size={24} color="var(--color-blue)" />
      <p className="text-sm text-(--color-muted) tracking-wide">Coming soon</p>
    </div>
  );
}
