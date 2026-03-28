"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");

  const [signInIdentifier, setSignInIdentifier] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signInError, setSignInError] = useState("");
  const [signInBusy, setSignInBusy] = useState(false);

  const [signUpUsername, setSignUpUsername] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpError, setSignUpError] = useState("");
  const [signUpBusy, setSignUpBusy] = useState(false);
  const [signUpDone, setSignUpDone] = useState(false);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSignInBusy(true);
    setSignInError("");
    const err = await signIn(signInIdentifier, signInPassword);
    setSignInBusy(false);
    if (err) setSignInError(err);
    else onClose();
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setSignUpBusy(true);
    setSignUpError("");
    const err = await signUp(signUpEmail, signUpPassword, signUpUsername);
    setSignUpBusy(false);
    if (err) setSignUpError(err);
    else setSignUpDone(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md mx-4 rounded-2xl border border-(--color-border) bg-(--color-surface) shadow-[0_20px_60px_rgba(0,0,0,0.20)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-(--color-border) px-5 pt-5">
          <p
            className="text-[10px] uppercase tracking-[0.18em] text-(--color-muted) mb-3"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            Dagrun account
          </p>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setTab("signin")}
              className="rounded-t-lg px-3 py-2 text-xs font-medium border-b-2 transition-colors"
              style={{
                borderColor:
                  tab === "signin" ? "var(--color-blue)" : "transparent",
                color:
                  tab === "signin" ? "var(--color-blue)" : "var(--color-muted)",
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setTab("signup")}
              className="rounded-t-lg px-3 py-2 text-xs font-medium border-b-2 transition-colors"
              style={{
                borderColor:
                  tab === "signup" ? "var(--color-blue)" : "transparent",
                color:
                  tab === "signup" ? "var(--color-blue)" : "var(--color-muted)",
              }}
            >
              Create account
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {tab === "signin" ? (
            <div className="flex flex-col gap-5">
              <div>
                <h2
                  className="text-2xl font-black text-(--color-foreground)"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Welcome back
                </h2>
                <p className="text-sm text-(--color-muted)">
                  Sign in to save scores and climb the leaderboard.
                </p>
              </div>
              <form onSubmit={handleSignIn} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="signin-identifier">Email or username</Label>
                  <Input
                    id="signin-identifier"
                    type="text"
                    placeholder="you@example.com or nickname"
                    value={signInIdentifier}
                    onChange={(e) => setSignInIdentifier(e.target.value)}
                    autoComplete="username"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>
                {signInError ? (
                  <p className="text-xs text-red-600">{signInError}</p>
                ) : null}
                <div className="pt-1">
                  <Button type="submit" className="w-full" disabled={signInBusy}>
                    {signInBusy ? "Signing in..." : "Sign in"}
                  </Button>
                </div>
              </form>
            </div>
          ) : signUpDone ? (
            <div className="flex flex-col gap-5">
              <div>
                <h2
                  className="text-2xl font-black text-(--color-foreground)"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Check your email
                </h2>
                <p className="text-sm text-(--color-muted)">
                  We sent a confirmation link to <strong>{signUpEmail}</strong>.
                  Open it to activate your account.
                </p>
              </div>
              <Button className="w-full" onClick={onClose}>
                Done
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div>
                <h2
                  className="text-2xl font-black text-(--color-foreground)"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Create account
                </h2>
                <p className="text-sm text-(--color-muted)">
                  Join and appear on the leaderboard.
                </p>
              </div>
              <form onSubmit={handleSignUp} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="signup-username">Username</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="Public name (3–24 characters)"
                    value={signUpUsername}
                    onChange={(e) => setSignUpUsername(e.target.value)}
                    autoComplete="username"
                    required
                  />
                  <p className="text-[11px] text-(--color-muted)">
                    Letters, numbers, _ and -. Shown on the leaderboard. Offensive names are blocked.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                </div>
                {signUpError ? (
                  <p className="text-xs text-red-600">{signUpError}</p>
                ) : null}
                <div className="pt-1">
                  <Button type="submit" className="w-full" disabled={signUpBusy}>
                    {signUpBusy ? "Creating account..." : "Create account"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
