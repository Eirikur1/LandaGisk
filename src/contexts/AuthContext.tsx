"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase, supabaseConnectionHint } from "@/lib/supabase";
import { normalizeUsername, validateUsername } from "@/lib/usernameValidation";

type AuthCtx = {
  user: User | null;
  username: string | null;
  avatarUrl: string | null;
  loading: boolean;
  /** `identifier` is an email address or your public username */
  signIn: (identifier: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, username: string) => Promise<string | null>;
  /** Opens Google OAuth; browser navigates away on success. `locale` = route prefix, e.g. "en". */
  signInWithGoogle: (locale: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** Reload username / avatar_url from `profiles` (e.g. after photo upload). */
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", uid)
      .single();
    setUsername(data?.username ?? null);
    setAvatarUrl((data?.avatar_url as string | null) ?? null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const uid = user?.id;
    if (!uid) return;
    await fetchProfile(uid);
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) void fetchProfile(u.id);
        else {
          setUsername(null);
          setAvatarUrl(null);
        }
      })
      .catch(() => {
        /* invalid placeholder URL / offline — stay logged out */
      })
      .finally(() => {
        setLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) void fetchProfile(u.id);
      else {
        setUsername(null);
        setAvatarUrl(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  async function signIn(identifier: string, password: string): Promise<string | null> {
    const id = identifier.trim();
    if (!id) return "Enter your email or username.";

    try {
      let email = id;
      if (!id.includes("@")) {
        const { data, error } = await supabase.rpc("get_email_for_username", { uname: id });
        if (error) return error.message;
        if (!data || typeof data !== "string") return "Unknown email or username.";
        email = data;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error?.message ?? null;
    } catch (e) {
      return networkErrorMessage(e);
    }
  }

  async function signUp(
    email: string,
    password: string,
    username: string
  ): Promise<string | null> {
    const normalized = normalizeUsername(username);
    const invalid = validateUsername(normalized);
    if (invalid) return invalid;

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: normalized } },
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (
          msg.includes("unique") ||
          msg.includes("duplicate") ||
          msg.includes("profiles_username")
        ) {
          return "That username is already taken.";
        }
        return error.message;
      }
      return null;
    } catch (e) {
      return networkErrorMessage(e);
    }
  }

  function networkErrorMessage(e: unknown): string {
    const hint = supabaseConnectionHint();
    if (e instanceof TypeError && String(e.message).toLowerCase().includes("fetch")) {
      return hint;
    }
    if (e instanceof Error && /failed to fetch|networkerror|load failed/i.test(e.message)) {
      return hint;
    }
    return e instanceof Error ? e.message : hint;
  }

  async function signInWithGoogle(locale: string): Promise<string | null> {
    if (typeof window === "undefined") return "Google sign-in runs in the browser only.";
    try {
      const redirectTo = `${window.location.origin}/${locale}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      return error?.message ?? null;
    } catch (e) {
      return networkErrorMessage(e);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        username,
        avatarUrl,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
