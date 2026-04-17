import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ locale: string }> }
) {
  const { locale } = await params;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/${locale}`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      `${origin}/${locale}/auth?error=${encodeURIComponent(error.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/${locale}`);
  }

  // Already confirmed username — go straight home
  if (user.user_metadata?.username_confirmed === true) {
    return NextResponse.redirect(`${origin}/${locale}`);
  }

  // Check if profile already has a custom username
  const emailPrefix = (user.email?.split("@")[0] ?? "").slice(0, 24);
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const alreadyCustom =
    profile?.username &&
    profile.username.toLowerCase() !== emailPrefix.toLowerCase();

  if (alreadyCustom) {
    await supabase.auth.updateUser({ data: { username_confirmed: true } });
    return NextResponse.redirect(`${origin}/${locale}`);
  }

  // New user — let them pick a display name
  return NextResponse.redirect(`${origin}/${locale}/auth/username`);
}
