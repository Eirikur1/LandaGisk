"use client";

export default function GameLoading() {
  return (
    <div className="relative z-10 flex min-h-[calc(100vh-5rem)] items-center justify-center px-6">
      <div className="rounded-3xl border border-(--color-border) bg-(--color-surface) px-6 py-5 text-center shadow-sm">
        <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-(--color-blue) border-t-transparent" />
        <p
          className="text-xs font-semibold uppercase tracking-[0.22em] text-(--color-muted)"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Loading game
        </p>
      </div>
    </div>
  );
}
