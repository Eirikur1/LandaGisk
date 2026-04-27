import LottieSandbox from "@/components/ui/LottieSandbox";

export default function LottieSandboxPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center gap-6">
      <LottieSandbox />

      <div className="flex flex-col items-center gap-2">
        <h1
          className="text-5xl font-black text-(--color-blue)"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Lottie Sandbox
        </h1>
        <p
          className="text-sm text-(--color-muted)"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          Drop your Lottie animation in here.
        </p>
      </div>
    </div>
  );
}
