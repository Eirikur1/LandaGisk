import Link from "next/link";

export default function NotFound() {
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
        404 — Page not found
      </h1>
      <p
        style={{
          fontSize: "0.875rem",
          color: "var(--color-muted)",
          marginBottom: "1.5rem",
          fontFamily: "var(--font-sans)",
        }}
      >
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          fontSize: "0.875rem",
          color: "var(--color-blue)",
          textDecoration: "underline",
          fontFamily: "var(--font-sans)",
        }}
      >
        Go home
      </Link>
    </div>
  );
}
