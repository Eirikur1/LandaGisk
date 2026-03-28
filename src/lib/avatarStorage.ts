import { supabase } from "@/lib/supabase";

const BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function supabaseProjectUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

/** Path inside bucket from a public object URL, or null */
export function avatarObjectPathFromPublicUrl(publicUrl: string): string | null {
  const base = supabaseProjectUrl().replace(/\/$/, "");
  const marker = `${base}/storage/v1/object/public/${BUCKET}/`;
  if (!publicUrl.startsWith(marker)) return null;
  return publicUrl.slice(marker.length);
}

export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED.has(file.type)) return "Use a JPEG, PNG, WebP, or GIF image.";
  if (file.size > MAX_BYTES) return "Image must be 2 MB or smaller.";
  return null;
}

export async function removeAvatarObject(publicUrl: string | null): Promise<void> {
  if (!publicUrl) return;
  const path = avatarObjectPathFromPublicUrl(publicUrl);
  if (!path) return;
  await supabase.storage.from(BUCKET).remove([path]);
}

/**
 * Uploads to `{userId}/{timestamp}.{ext}` and returns the public URL.
 */
export async function uploadAvatarFile(userId: string, file: File): Promise<{ publicUrl: string } | { error: string }> {
  const bad = validateAvatarFile(file);
  if (bad) return { error: bad };

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : file.type === "image/gif"
          ? "gif"
          : "jpg";

  const path = `${userId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (upErr) return { error: upErr.message };

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}

export async function setProfileAvatarUrl(userId: string, publicUrl: string | null): Promise<{ error: string | null }> {
  const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", userId);
  return { error: error?.message ?? null };
}
