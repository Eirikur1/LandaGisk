"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { normalizeUsername, validateUsername } from "@/lib/usernameValidation";

export default function UsernamePage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";

  const [phase, setPhase] = useState<"loading" | "username" | "saving" | "error">("loading");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace(`/${locale}`); return; }

      // Already confirmed — skip this screen
      if (user.user_metadata?.username_confirmed === true) {
        router.replace(`/${locale}`);
        return;
      }

      const emailPrefix = (user.email?.split("@")[0] ?? "").slice(0, 24);
      setUserId(user.id);
      setUsername(emailPrefix);
      setPhase("username");
    };
    void run();
  }, [router, locale]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalized = normalizeUsername(username);
    const err = validateUsername(normalized);
    if (err) { setUsernameError(err); return; }

    setPhase("saving");
    setUsernameError("");

    const { error } = await supabase
      .from("profiles")
      .update({ username: normalized })
      .eq("id", userId);

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("unique") || msg.includes("duplicate") || msg.includes("profiles_username")) {
        setUsernameError("That username is already taken.");
      } else {
        setUsernameError(error.message);
      }
      setPhase("username");
      return;
    }

    await supabase.auth.updateUser({ data: { username_confirmed: true } });
    router.replace(`/${locale}`);
  }

  if (phase === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 text-center text-sm text-(--color-muted)"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        Loading…
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-6 text-center text-sm text-red-400"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        Something went wrong. Please try signing in again.
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center px-6"
      style={{ background: "#0d0d0d", fontFamily: "var(--font-sans)" }}
    >
      <div className="w-full max-w-sm flex flex-col gap-6">
        <div className="text-center">
          <h1
            className="text-2xl font-black mb-2"
            style={{ color: "rgba(255,255,255,0.92)" }}
          >
            Choose a display name
          </h1>
          <p style={{ color: "rgba(255,255,255,0.38)", fontSize: "13px" }}>
            This is how you&apos;ll appear on the leaderboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div
            className="flex flex-col gap-1.5 rounded-2xl px-4 py-3"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
          >
            <label
              htmlFor="username"
              style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" }}
            >
              Display name
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setUsernameError(""); }}
              required
              autoFocus
              autoComplete="username"
              className="bg-transparent outline-none w-full"
              style={{ color: "rgba(255,255,255,0.85)", fontSize: "14px" }}
            />
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", marginTop: "-2px" }}>
              Letters, numbers, _ and -. 3–24 characters.
            </p>
          </div>

          {usernameError && (
            <p className="text-xs text-red-400">{usernameError}</p>
          )}

          <button
            type="submit"
            disabled={phase === "saving"}
            className="w-full rounded-2xl py-3.5 font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 mt-1"
            style={{ background: "rgba(255,255,255,0.95)", color: "#0d0d0d" }}
          >
            {phase === "saving" ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
