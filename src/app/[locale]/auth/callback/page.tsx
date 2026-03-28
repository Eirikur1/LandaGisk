"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

/**
 * Supabase redirects here after Google (or other OAuth) with ?code=…
 * Exchanges the code for a session, then sends the user home.
 */
export default function AuthOAuthCallbackPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) ?? "en";
  const [message, setMessage] = useState("Signing you in…");

  useEffect(() => {
    const run = async () => {
      const url = window.location.href;
      const hasCode = new URL(url).searchParams.has("code");
      if (hasCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          setMessage(error.message);
          return;
        }
      }
      router.replace(`/${locale}`);
    };
    void run();
  }, [router, locale]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 text-center text-sm text-(--color-muted)"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      {message}
    </div>
  );
}
