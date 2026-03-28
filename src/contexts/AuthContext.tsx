"use client";

import {
  createContext,
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
  loading: boolean;
  /** `identifier` is an email address or your public username */
  signIn: (identifier: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, username: string) => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchUsername(uid: string) {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", uid)
      .single();
    setUsername(data?.username ?? null);
  }

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) void fetchUsername(u.id);
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
      if (u) void fetchUsername(u.id);
      else setUsername(null);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, username, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
