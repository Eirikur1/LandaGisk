"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FcGoogle } from "react-icons/fc";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import RotatingEarth from "@/components/ui/wireframe-dotted-globe";

export default function AuthPage() {
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) ?? "en";
  const callbackError = searchParams.get("error");

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
  const [googleBusy, setGoogleBusy] = useState(false);

  async function handleGoogle() {
    setSignInError("");
    setSignUpError("");
    setGoogleBusy(true);
    const err = await signInWithGoogle(locale);
    setGoogleBusy(false);
    if (err) {
      if (tab === "signin") setSignInError(err);
      else setSignUpError(err);
    }
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSignInBusy(true);
    setSignInError("");
    const err = await signIn(signInIdentifier, signInPassword);
    setSignInBusy(false);
    if (err) setSignInError(err);
    else router.push(`/${locale}`);
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
      className="fixed inset-0 flex"
      style={{ background: "#0d0d0d", fontFamily: "var(--font-sans)" }}
    >
      {/* ── Left: Globe ─────────────────────────────────────────── */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
        <RotatingEarth width={600} height={600} noControls />
        {/* Dagrun wordmark top-left */}
        <motion.a
          href={`/${locale}`}
          className="absolute top-8 left-10 text-[11px] font-bold tracking-[0.22em] uppercase hover:opacity-60 transition-opacity"
          style={{ color: "rgba(255,255,255,0.35)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          ApaBiz
        </motion.a>
      </div>

      {/* Divider */}
      <div className="hidden lg:block w-px self-stretch" style={{ background: "rgba(255,255,255,0.07)" }} />

      {/* ── Right: Form ─────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-8">
        <motion.div
          className="w-full max-w-sm flex flex-col gap-8"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Heading */}
          {!signUpDone && (
            <div className="text-center">
              <h1
                className="text-3xl font-black mb-2"
                style={{ color: "rgba(255,255,255,0.92)", fontFamily: "var(--font-display)" }}
              >
                {tab === "signin" ? "Welcome back" : "Create account"}
              </h1>
              <p style={{ color: "rgba(255,255,255,0.38)", fontSize: "13px" }}>
                {tab === "signin" ? (
                  <>
                    No account?{" "}
                    <button
                      type="button"
                      onClick={() => setTab("signup")}
                      style={{ color: "rgba(255,255,255,0.7)", textDecoration: "underline" }}
                    >
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have one?{" "}
                    <button
                      type="button"
                      onClick={() => setTab("signin")}
                      style={{ color: "rgba(255,255,255,0.7)", textDecoration: "underline" }}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </div>
          )}

          {/* Forms */}
          {tab === "signin" ? (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={googleBusy || signInBusy}
                onClick={() => void handleGoogle()}
                className="w-full rounded-2xl py-3.5 font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2.5"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                <FcGoogle size={22} />
                {googleBusy ? "Redirecting…" : "Continue with Google"}
              </button>
              <p
                className="text-center text-[10px] uppercase tracking-[0.2em]"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                or
              </p>
              <form onSubmit={handleSignIn} className="flex flex-col gap-3">
                <Field
                  id="si-identifier"
                  label="Email or username"
                  type="text"
                  placeholder="you@example.com or nickname"
                  value={signInIdentifier}
                  onChange={setSignInIdentifier}
                  autoComplete="username"
                />
                <Field
                  id="si-pw"
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={signInPassword}
                  onChange={setSignInPassword}
                  autoComplete="current-password"
                />
                {(signInError || callbackError) && (
                  <p className="text-xs text-red-400">{signInError || callbackError}</p>
                )}
                <SubmitButton busy={signInBusy} label="Sign in" busyLabel="Signing in…" />
              </form>
            </div>
          ) : signUpDone ? (
            <div className="text-center flex flex-col gap-6">
              <div>
                <h2
                  className="text-2xl font-black mb-2"
                  style={{ color: "rgba(255,255,255,0.92)", fontFamily: "var(--font-display)" }}
                >
                  Check your email
                </h2>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "13px" }}>
                  We sent a confirmation link to{" "}
                  <strong style={{ color: "rgba(255,255,255,0.7)" }}>{signUpEmail}</strong>.
                  Open it to activate your account.
                </p>
              </div>
              <SubmitButton busy={false} label="Back to sign in" busyLabel="" onClick={() => { setSignUpDone(false); setTab("signin"); }} />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <button
                type="button"
                disabled={googleBusy || signUpBusy}
                onClick={() => void handleGoogle()}
                className="w-full rounded-2xl py-3.5 font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2.5"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                <FcGoogle size={22} />
                {googleBusy ? "Redirecting…" : "Sign up with Google"}
              </button>
              <p
                className="text-center text-[10px] uppercase tracking-[0.2em]"
                style={{ color: "rgba(255,255,255,0.28)" }}
              >
                or
              </p>
              <form onSubmit={handleSignUp} className="flex flex-col gap-3">
                <Field
                  id="su-username"
                  label="Username"
                  type="text"
                  placeholder="Public display name (3–24 characters)"
                  value={signUpUsername}
                  onChange={setSignUpUsername}
                  autoComplete="username"
                  hint="Letters, numbers, _ and -. Shown on the leaderboard."
                />
                <Field
                  id="su-email"
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={signUpEmail}
                  onChange={setSignUpEmail}
                  autoComplete="email"
                />
                <Field
                  id="su-pw"
                  label="Password"
                  type="password"
                  placeholder="Min. 6 characters"
                  value={signUpPassword}
                  onChange={setSignUpPassword}
                  minLength={6}
                  autoComplete="new-password"
                />
                {signUpError && <p className="text-xs text-red-400">{signUpError}</p>}
                <SubmitButton busy={signUpBusy} label="Create account" busyLabel="Creating…" />
              </form>
            </div>
          )}

          {/* Back link */}
          <p className="text-center" style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>
            <button
              type="button"
              onClick={() => router.push(`/${locale}`)}
              className="hover:opacity-60 transition-opacity"
            >
              ← Back to ApaBiz
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  type,
  placeholder,
  value,
  onChange,
  minLength,
  autoComplete,
  hint,
}: {
  id: string;
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  minLength?: number;
  autoComplete?: string;
  hint?: string;
}) {
  return (
    <div
      className="flex flex-col gap-1.5 rounded-2xl px-4 py-3"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
    >
      <label htmlFor={id} style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        className="bg-transparent outline-none w-full"
        style={{ color: "rgba(255,255,255,0.85)", fontSize: "14px" }}
      />
      {hint ? (
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.28)", marginTop: "-2px" }}>{hint}</p>
      ) : null}
    </div>
  );
}

function SubmitButton({
  busy, label, busyLabel, onClick,
}: {
  busy: boolean;
  label: string;
  busyLabel: string;
  onClick?: () => void;
}) {
  return (
    <button
      type={onClick ? "button" : "submit"}
      disabled={busy}
      onClick={onClick}
      className="w-full rounded-2xl py-3.5 font-bold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 mt-1"
      style={{ background: "rgba(255,255,255,0.95)", color: "#0d0d0d" }}
    >
      {busy ? busyLabel : label}
    </button>
  );
}
