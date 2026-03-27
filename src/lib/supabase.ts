import { createClient } from "@supabase/supabase-js";

function isValidHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Dev-only placeholders so `npm run dev` works before `.env.local` is filled in.
 * Replace with real values from the Supabase dashboard for auth / DB features.
 */
const DEV_PLACEHOLDER_URL = "https://dev-placeholder.supabase.co";
const DEV_PLACEHOLDER_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

function resolveSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

  if (isValidHttpUrl(url) && anonKey.length > 0) {
    return { url, anonKey };
  }

  if (process.env.NODE_ENV === "development") {
    console.warn(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing/invalid — using dev placeholders. Add both to .env.local (see Supabase project Settings → API)."
    );
    return { url: DEV_PLACEHOLDER_URL, anonKey: DEV_PLACEHOLDER_ANON_KEY };
  }

  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL (https://…supabase.co) and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment."
  );
}

const { url: supabaseUrl, anonKey: supabaseAnonKey } = resolveSupabaseEnv();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
