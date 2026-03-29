"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  uploadAvatarFile,
  removeAvatarObject,
  setProfileAvatarUrl,
} from "@/lib/avatarStorage";
import { OptimizedAvatar } from "@/components/ui/OptimizedAvatar";

export default function AccountPage() {
  const locale = useLocale();
  const t = useTranslations("account");
  const router = useRouter();
  const { user, username, avatarUrl, loading, refreshProfile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);
  previewRef.current = preview;

  useEffect(() => {
    return () => {
      const p = previewRef.current;
      if (p?.startsWith("blob:")) URL.revokeObjectURL(p);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/${locale}/auth`);
    }
  }, [user, loading, locale, router]);

  const initials = (username ?? user?.email ?? "?").slice(0, 2).toUpperCase();

  const onPickFile = useCallback(() => {
    setError(null);
    inputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !user) return;

      setError(null);
      const objectUrl = URL.createObjectURL(file);
      setPreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return objectUrl;
      });

      setBusy(true);
      try {
        if (avatarUrl) await removeAvatarObject(avatarUrl);
        const up = await uploadAvatarFile(user.id, file);
        if ("error" in up) {
          setError(up.error);
          URL.revokeObjectURL(objectUrl);
          setPreview(null);
          return;
        }
        const { error: dbErr } = await setProfileAvatarUrl(user.id, up.publicUrl);
        if (dbErr) {
          setError(dbErr);
          URL.revokeObjectURL(objectUrl);
          setPreview(null);
          return;
        }
        URL.revokeObjectURL(objectUrl);
        setPreview(null);
        await refreshProfile();
      } finally {
        setBusy(false);
      }
    },
    [user, avatarUrl, refreshProfile]
  );

  const onRemove = useCallback(async () => {
    if (!user) return;
    setError(null);
    setBusy(true);
    try {
      if (avatarUrl) await removeAvatarObject(avatarUrl);
      const { error: dbErr } = await setProfileAvatarUrl(user.id, null);
      if (dbErr) {
        setError(dbErr);
        return;
      }
      setPreview((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
      await refreshProfile();
    } finally {
      setBusy(false);
    }
  }, [user, avatarUrl, refreshProfile]);

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-6 py-16">
        <p className="text-sm text-(--color-muted)" style={{ fontFamily: "var(--font-sans)" }}>
          {t("loading")}
        </p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const displaySrc = preview ?? avatarUrl ?? null;

  return (
    <div className="max-w-md mx-auto px-6 py-10">
      <Link
        href={`/${locale}`}
        className="text-[11px] tracking-[0.18em] uppercase text-(--color-muted) hover:text-(--color-blue) transition-colors mb-8 inline-block"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        ← {t("backHome")}
      </Link>

      <h1
        className="text-[clamp(1.75rem,5vw,2.25rem)] font-black text-(--color-blue) mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {t("title")}
      </h1>
      <p className="text-sm text-(--color-muted) mb-8" style={{ fontFamily: "var(--font-sans)" }}>
        {t("subtitle")}
      </p>

      <div className="flex flex-col items-center gap-6 rounded-2xl border border-(--color-border) bg-(--color-surface) px-6 py-8">
        <div
          className="rounded-full overflow-hidden bg-(--color-blue) flex items-center justify-center font-black text-white shrink-0"
          style={{ width: 112, height: 112, fontSize: 36 }}
        >
          {displaySrc ? (
            <OptimizedAvatar src={displaySrc} alt="" width={112} height={112} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={onFileChange}
        />

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button type="button" size="sm" disabled={busy} onClick={onPickFile}>
            {busy ? t("uploading") : t("choosePhoto")}
          </Button>
          {(avatarUrl || preview) && (
            <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => void onRemove()}>
              {t("removePhoto")}
            </Button>
          )}
        </div>

        <p className="text-[11px] text-(--color-muted) text-center leading-relaxed" style={{ fontFamily: "var(--font-sans)" }}>
          {t("hint")}
        </p>

        {error && (
          <p className="text-xs text-red-600 text-center" style={{ fontFamily: "var(--font-sans)" }}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
