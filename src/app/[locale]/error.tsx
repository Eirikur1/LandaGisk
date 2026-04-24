"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[locale error]", error?.message ?? error, error?.digest);
  }, [error]);

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "80px auto",
        padding: "0 24px",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "clamp(1.75rem, 5vw, 2.25rem)",
          fontWeight: 900,
          color: "var(--color-blue)",
          marginBottom: "0.5rem",
          fontFamily: "var(--font-display)",
        }}
      >
        Something went wrong
      </h1>
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--color-muted)",
          marginBottom: "1.5rem",
          fontFamily: "var(--font-sans)",
        }}
      >
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "0.5rem 1.25rem",
          borderRadius: "0.5rem",
          background: "var(--color-blue)",
          color: "#fff",
          border: "none",
          cursor: "pointer",
          fontSize: "0.875rem",
          fontWeight: 600,
          fontFamily: "var(--font-sans)",
        }}
      >
        Try again
      </button>
    </div>
  );
}
